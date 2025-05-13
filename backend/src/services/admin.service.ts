import {
  Role,
  ClaimStatus,
  Prisma,
  NotificationType,
  RecipientType,
  AlbumType,
  PlaylistPrivacy,
  User as PrismaUser,
  Playlist as PrismaPlaylist,
  ArtistProfile,
  History,
  PlaylistType,
  LabelRegistrationRequest,
  RequestStatus,
} from "@prisma/client";
import { Request } from "express";
import prisma from "../config/db";
import {
  userSelect,
  artistProfileSelect,
  artistRequestSelect,
  artistRequestDetailsSelect,
  genreSelect,
  artistClaimRequestSelect,
  artistClaimRequestDetailsSelect,
  trackSelect,
  labelSelect, // Added for approveLabelRegistration
} from "../utils/prisma-selects";
import {
  paginate,
  toBooleanValue,
  runValidations,
  validateField,
} from "../utils/handle-utils"; // Added runValidations, validateField
import * as fs from "fs";
import * as path from "path";
import { SystemComponentStatus } from "../types/system.types";
import { client as redisClient } from "../middleware/cache.middleware";
import { transporter as nodemailerTransporter } from "./email.service";
import bcrypt from "bcrypt";
import { subMonths, endOfMonth } from "date-fns";
import * as emailService from "./email.service";
import { getIO } from "../config/socket";
import { getUserSockets } from "../config/socket";
import { uploadFile, analyzeAudioWithReccoBeats } from "./upload.service";
import * as mm from "music-metadata";
import { Essentia, EssentiaWASM } from "essentia.js";
import { MPEGDecoder, MPEGDecodedAudio } from "mpg123-decoder";
import * as aiService from "./ai.service";
import { HttpError } from "../utils/errors";
import { AIGeneratedPlaylistInput, HistoryTrackDetail } from "./ai.service";
import * as trackService from "./track.service"; // Import trackService

// Define a list of valid models here
const VALID_GEMINI_MODELS = [
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-pro-preview-03-25",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

type User = PrismaUser;

export const getUsers = async (req: Request, requestingUser: User) => {
  const { search, status, sortBy, sortOrder } = req.query;

  const where: Prisma.UserWhereInput = {
    id: { not: requestingUser.id },
  };

  if (search && typeof search === "string") {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status && typeof status === "string" && status !== "ALL") {
    where.isActive = status === "true";
  }

  let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: "desc" };
  const validSortFields = [
    "name",
    "email",
    "username",
    "role",
    "isActive",
    "createdAt",
    "lastLoginAt",
  ];
  if (
    sortBy &&
    typeof sortBy === "string" &&
    validSortFields.includes(sortBy)
  ) {
    const direction = sortOrder === "asc" ? "asc" : "desc";
    orderBy = { [sortBy]: direction };
  }

  const options = {
    where,
    select: userSelect,
    orderBy,
  };

  const result = await paginate<User>(prisma.user, req, options);

  return {
    users: result.data,
    pagination: result.pagination,
  };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const getArtistRequests = async (req: Request) => {
  const { search, startDate, endDate } = req.query;

  const where: Prisma.ArtistProfileWhereInput = {
    verificationRequestedAt: { not: null },
    user: {
      isActive: true,
    },
    isVerified: false,
    AND: [],
  };

  if (typeof search === "string" && search.trim()) {
    const trimmedSearch = search.trim();
    if (Array.isArray(where.AND)) {
      where.AND.push({
        OR: [
          { artistName: { contains: trimmedSearch, mode: "insensitive" } },
          { user: { name: { contains: trimmedSearch, mode: "insensitive" } } },
          {
            user: { email: { contains: trimmedSearch, mode: "insensitive" } },
          },
        ],
      });
    }
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (typeof startDate === "string" && startDate) {
    try {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      dateFilter.gte = startOfDay;
    } catch (e) {
      console.error("Invalid start date format:", startDate);
    }
  }
  if (typeof endDate === "string" && endDate) {
    try {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = endOfDay;
    } catch (e) {
      console.error("Invalid end date format:", endDate);
    }
  }

  if (dateFilter.gte || dateFilter.lte) {
    if (Array.isArray(where.AND)) {
      where.AND.push({ verificationRequestedAt: dateFilter });
    }
  }

  const options = {
    where,
    select: artistRequestSelect,
    orderBy: { verificationRequestedAt: "desc" },
  };

  const result = await paginate<ArtistProfile>(
    prisma.artistProfile,
    req,
    options
  );

  return {
    requests: result.data,
    pagination: result.pagination,
  };
};

export const getArtistRequestDetail = async (id: string) => {
  let requestData: any = await prisma.artistProfile.findUnique({
    where: { id },
    select: artistRequestDetailsSelect,
  });

  // Attempt 2: If not found by ArtistProfile ID, try finding by ArtistProfile UserID
  if (!requestData) {
    requestData = await prisma.artistProfile.findFirst({
      where: {
        userId: id,
        verificationRequestedAt: { not: null },
      },
      select: artistRequestDetailsSelect,
    });
  }

  // Attempt 3: If still not found, try finding in ArtistRequest table (new request flow)
  if (!requestData) {
    const artistRoleRequest = await prisma.artistRequest.findUnique({
      where: { id },
      select: {
        id: true,
        artistName: true,
        bio: true,
        status: true,
        requestedLabelName: true,
        rejectionReason: true, // Make sure this is in your Prisma schema for ArtistRequest
        socialMediaLinks: true, // Assuming this is a Json field in ArtistRequest
        avatarUrl: true, // Added avatarUrl
        requestedGenres: true, // Added requestedGenres
        // createdAt: true,              // Or submittedAt, if you have it
        user: {
          // Nested user data
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (artistRoleRequest) {
      // If found in ArtistRequest, we need to structure it slightly differently
      // to match what the frontend detail page might expect if it was originally
      // designed for ArtistProfile structure. Or, the frontend needs to adapt.
      // For now, let's assume the frontend can handle the ArtistRequest structure directly.
      // Add a flag to distinguish if needed, or ensure frontend handles both structures.
      return { ...artistRoleRequest, _sourceTable: "ArtistRequest" };
    }
  }

  if (!requestData) {
    throw new Error("Request not found");
  }

  // If data came from ArtistProfile, add a source flag
  return { ...requestData, _sourceTable: "ArtistProfile" };
};

interface UpdateUserData {
  name?: string;
  username?: string;
  email?: string;
  newPassword?: string;
  isActive?: boolean;
  reason?: string;
}

export const updateUserInfo = async (
  id: string,
  data: UpdateUserData,
  requestingUser: User
) => {
  const { name, username, email, newPassword, isActive, reason } = data;

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    throw new Error("User not found");
  }

  // Prevent non-admins from modifying admins
  if (requestingUser.role !== Role.ADMIN && existingUser.role === Role.ADMIN) {
    throw new Error(`Permission denied: Cannot modify Admin users.`);
  }
  // Prevent admins from modifying other admins (optional, but can be a safety measure)
  if (
    requestingUser.role === Role.ADMIN &&
    requestingUser.id !== id &&
    existingUser.role === Role.ADMIN
  ) {
    throw new Error(
      `Permission denied: Admins cannot modify other Admin users.`
    );
  }

  // Prepare data for Prisma update
  const updateData: Prisma.UserUpdateInput = {};

  if (name !== undefined) {
    updateData.name = name;
  }

  if (email !== undefined && email !== existingUser.email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (existingEmail) throw new Error("Email already exists");
    updateData.email = email;
  }

  if (username !== undefined && username !== existingUser.username) {
    const existingUsername = await prisma.user.findFirst({
      where: { username, NOT: { id } },
    });
    if (existingUsername) throw new Error("Username already exists");
    updateData.username = username;
  }

  if (isActive !== undefined) {
    const isActiveBool = toBooleanValue(isActive);
    if (isActiveBool === undefined) {
      throw new Error("Invalid value for isActive status");
    }
    if (requestingUser.id === id && !isActiveBool) {
      throw new Error("Permission denied: Cannot deactivate your own account.");
    }
    updateData.isActive = isActiveBool;
  }

  // Update password if newPassword is provided
  if (newPassword) {
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No valid data provided for update.");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  // --- Send Notification/Email based on isActive change ---
  if (
    updateData.isActive !== undefined &&
    updateData.isActive !== existingUser.isActive
  ) {
    const userName = updatedUser.name || updatedUser.username || "User";
    if (updatedUser.isActive === false) {
      prisma.notification
        .create({
          data: {
            type: "ACCOUNT_DEACTIVATED",
            message: `Your account has been deactivated.${
              reason ? ` Reason: ${reason}` : ""
            }`,
            recipientType: "USER",
            userId: id,
            isRead: false,
          },
        })
        .catch((err) =>
          console.error(
            "[Async Notify Error] Failed to create deactivation notification:",
            err
          )
        );

      if (updatedUser.email) {
        try {
          const emailOptions = emailService.createAccountDeactivatedEmail(
            updatedUser.email,
            userName,
            "user",
            reason
          );
          emailService
            .sendEmail(emailOptions)
            .catch((err) =>
              console.error(
                "[Async Email Error] Failed to send deactivation email:",
                err
              )
            );
        } catch (syncError) {
          console.error(
            "[Email Setup Error] Failed to create deactivation email options:",
            syncError
          );
        }
      }
    } else if (updatedUser.isActive === true) {
      prisma.notification
        .create({
          data: {
            type: "ACCOUNT_ACTIVATED",
            message: "Your account has been reactivated.",
            recipientType: "USER",
            userId: id,
            isRead: false,
          },
        })
        .catch((err) =>
          console.error(
            "[Async Notify Error] Failed to create activation notification:",
            err
          )
        );

      if (updatedUser.email) {
        try {
          const emailOptions = emailService.createAccountActivatedEmail(
            updatedUser.email,
            userName,
            "user"
          );
          emailService
            .sendEmail(emailOptions)
            .catch((err) =>
              console.error(
                "[Async Email Error] Failed to send activation email:",
                err
              )
            );
        } catch (syncError) {
          console.error(
            "[Email Setup Error] Failed to create activation email options:",
            syncError
          );
        }
      }
    }
  }

  return updatedUser;
};

interface UpdateArtistData {
  artistName?: string;
  bio?: string;
  isActive?: boolean;
  reason?: string; // For deactivation reason
}

export const updateArtistInfo = async (id: string, data: UpdateArtistData) => {
  const { artistName, bio, isActive, reason } = data;

  // Find the existing artist
  const existingArtist = await prisma.artistProfile.findUnique({
    where: { id },
    select: {
      id: true,
      artistName: true,
      isActive: true,
      userId: true,
      user: { select: { id: true, email: true, name: true, username: true } },
    },
  });

  if (!existingArtist) {
    throw new Error("Artist not found");
  }

  // Validate fields
  const validationErrors = [];

  if (artistName !== undefined) {
    if (artistName.length < 3) {
      validationErrors.push("Artist name must be at least 3 characters");
    }
    if (artistName.length > 100) {
      validationErrors.push("Artist name cannot exceed 100 characters");
    }
  }

  if (bio !== undefined && bio.length > 1000) {
    validationErrors.push("Biography cannot exceed 1000 characters");
  }

  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
  }

  // Check for duplicate artist name
  let validatedArtistName = undefined;
  if (artistName && artistName !== existingArtist.artistName) {
    const nameExists = await prisma.artistProfile.findFirst({
      where: {
        artistName,
        id: { not: id },
      },
    });

    if (nameExists) {
      throw new Error("Artist name already exists");
    }
    validatedArtistName = artistName;
  }

  // Prepare update data
  const updateData: Prisma.ArtistProfileUpdateInput = {};

  if (validatedArtistName !== undefined) {
    updateData.artistName = validatedArtistName;
  }

  if (bio !== undefined) {
    updateData.bio = bio;
  }

  if (isActive !== undefined) {
    const isActiveBool = toBooleanValue(isActive);
    if (isActiveBool === undefined) {
      throw new Error("Invalid value for isActive status");
    }
    updateData.isActive = isActiveBool;
  }

  // If there's nothing to update, throw error
  if (Object.keys(updateData).length === 0) {
    throw new Error("No valid data provided for update");
  }

  // Update the artist profile
  const updatedArtist = await prisma.artistProfile.update({
    where: { id },
    data: updateData,
    select: artistProfileSelect,
  });

  // Handle notifications and emails if isActive status changed
  if (
    isActive !== undefined &&
    existingArtist.isActive !== updatedArtist.isActive
  ) {
    const ownerUser = existingArtist.user;
    const ownerUserName = ownerUser?.name || ownerUser?.username || "Artist";

    if (updatedArtist.isActive === false) {
      // Handle deactivation notification and email
      if (ownerUser?.id) {
        prisma.notification
          .create({
            data: {
              type: "ACCOUNT_DEACTIVATED",
              message: `Your artist account has been deactivated.${
                reason ? ` Reason: ${reason}` : ""
              }`,
              recipientType: "USER",
              userId: ownerUser.id,
              isRead: false,
            },
          })
          .catch((err) =>
            console.error(
              "[Async Notify Error] Failed to create artist deactivation notification:",
              err
            )
          );
      }

      if (ownerUser?.email) {
        try {
          const emailOptions = emailService.createAccountDeactivatedEmail(
            ownerUser.email,
            ownerUserName,
            "artist",
            reason
          );
          emailService
            .sendEmail(emailOptions)
            .catch((err) =>
              console.error(
                "[Async Email Error] Failed to send artist deactivation email:",
                err
              )
            );
        } catch (syncError) {
          console.error(
            "[Email Setup Error] Failed to create artist deactivation email options:",
            syncError
          );
        }
      }
    } else if (updatedArtist.isActive === true) {
      // Handle activation notification and email
      if (ownerUser?.id) {
        prisma.notification
          .create({
            data: {
              type: "ACCOUNT_ACTIVATED",
              message: "Your artist account has been reactivated.",
              recipientType: "USER",
              userId: ownerUser.id,
              isRead: false,
            },
          })
          .catch((err) =>
            console.error(
              "[Async Notify Error] Failed to create artist activation notification:",
              err
            )
          );
      }

      if (ownerUser?.email) {
        try {
          const emailOptions = emailService.createAccountActivatedEmail(
            ownerUser.email,
            ownerUserName,
            "artist"
          );
          emailService
            .sendEmail(emailOptions)
            .catch((err) =>
              console.error(
                "[Async Email Error] Failed to send artist activation email:",
                err
              )
            );
        } catch (syncError) {
          console.error(
            "[Email Setup Error] Failed to create artist activation email options:",
            syncError
          );
        }
      }
    }
  }

  return updatedArtist;
};

export const deleteUserById = async (
  id: string,
  requestingUser: User,
  reason?: string
) => {
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { role: true, email: true, name: true, username: true },
  });

  if (!userToDelete) {
    throw new Error("User not found");
  }

  if (!requestingUser || !requestingUser.role) {
    throw new Error("Permission denied: Invalid requesting user data.");
  }

  if (userToDelete.role === Role.ADMIN) {
    if (requestingUser.id === id) {
      throw new Error("Permission denied: Admins cannot delete themselves.");
    }
    throw new Error("Permission denied: Admins cannot delete other admins.");
  }

  // if (userToDelete.email) {
  //   try {
  //     const userName = userToDelete.name || userToDelete.username || "User";
  //     const emailOptions = emailService.createAccountDeletedEmail(
  //       userToDelete.email,
  //       userName,
  //       reason
  //     );
  //     emailService
  //       .sendEmail(emailOptions)
  //       .catch((err) =>
  //         console.error(
  //           "[Async Email Error] Failed to send account deletion email:",
  //           err
  //         )
  //       );
  //   } catch (syncError) {
  //     console.error(
  //       "[Email Setup Error] Failed to create deletion email options:",
  //       syncError
  //     );
  //   }
  // }

  await prisma.user.delete({ where: { id } });

  return {
    message: `User ${id} deleted successfully. Reason: ${
      reason || "No reason provided"
    }`,
  };
};

export const deleteArtistById = async (id: string, reason?: string) => {
  const artistToDelete = await prisma.artistProfile.findUnique({
    where: { id },
    select: {
      id: true,
      artistName: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
        },
      },
    },
  });

  if (!artistToDelete) {
    throw new Error("Artist not found");
  }

  const associatedUser = artistToDelete.user;
  if (associatedUser && associatedUser.email) {
    try {
      const nameToSend =
        artistToDelete.artistName ||
        associatedUser.name ||
        associatedUser.username ||
        "Artist";
      const emailOptions = emailService.createAccountDeletedEmail(
        associatedUser.email,
        nameToSend,
        reason
      );
      emailService
        .sendEmail(emailOptions)
        .catch((err) =>
          console.error(
            "[Async Email Error] Failed to send artist account deletion email:",
            err
          )
        );
    } catch (syncError) {
      console.error(
        "[Email Setup Error] Failed to create artist deletion email options:",
        syncError
      );
    }
  }

  await prisma.artistProfile.delete({ where: { id: artistToDelete.id } });

  return {
    message: `Artist ${id} deleted permanently. Reason: ${
      reason || "No reason provided"
    }`,
  };
};

export const getArtists = async (req: Request) => {
  const { search, status, sortBy, sortOrder } = req.query;

  const where: Prisma.ArtistProfileWhereInput = {
    role: Role.ARTIST,
  };

  if (search && typeof search === "string") {
    where.OR = [
      { artistName: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status && typeof status === "string" && status !== "ALL") {
    where.isActive = status === "true";
  }

  let orderBy:
    | Prisma.ArtistProfileOrderByWithRelationInput
    | Prisma.ArtistProfileOrderByWithRelationInput[] = {
    createdAt: "desc",
  };

  const validSortFields = [
    "artistName",
    "isActive",
    "monthlyListeners",
    "createdAt",
  ];

  if (
    sortBy &&
    typeof sortBy === "string" &&
    validSortFields.includes(sortBy)
  ) {
    const direction = sortOrder === "asc" ? "asc" : "desc";
    orderBy = { [sortBy]: direction };
  }

  const options = {
    where,
    select: artistProfileSelect,
    orderBy,
  };

  const result = await paginate<ArtistProfile>(
    prisma.artistProfile,
    req,
    options
  );

  return {
    artists: result.data,
    pagination: result.pagination,
  };
};

export const getArtistById = async (id: string) => {
  const artist = await prisma.artistProfile.findUnique({
    where: { id },
    select: {
      ...artistProfileSelect,
      albums: {
        orderBy: { releaseDate: "desc" },
        select: artistProfileSelect.albums.select,
      },
      tracks: {
        where: {
          type: "SINGLE",
          albumId: null,
        },
        orderBy: { releaseDate: "desc" },
        select: artistProfileSelect.tracks.select,
      },
    },
  });

  if (!artist) {
    throw new Error("Artist not found");
  }

  return artist;
};

export const getGenres = async (req: Request) => {
  const { search = "" } = req.query;

  const where = search
    ? {
        name: {
          contains: String(search),
          mode: "insensitive",
        },
      }
    : {};

  const options = {
    where,
    select: genreSelect,
    orderBy: { createdAt: "desc" },
  };

  const result = await paginate(prisma.genre, req, options);

  return {
    genres: result.data,
    pagination: result.pagination,
  };
};

export const createNewGenre = async (name: string) => {
  const existingGenre = await prisma.genre.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existingGenre) {
    throw new Error("Genre name already exists");
  }
  return prisma.genre.create({
    data: { name },
  });
};

export const updateGenreInfo = async (id: string, name: string) => {
  const existingGenre = await prisma.genre.findUnique({
    where: { id },
  });

  if (!existingGenre) {
    throw new Error("Genre not found");
  }

  if (name.toLowerCase() !== existingGenre.name.toLowerCase()) {
    const existingGenreWithName = await prisma.genre.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        NOT: { id },
      },
    });
    if (existingGenreWithName) {
      throw new Error("Genre name already exists");
    }
  }

  return prisma.genre.update({
    where: { id },
    data: { name },
  });
};

export const deleteGenreById = async (id: string) => {
  return prisma.genre.delete({ where: { id } });
};

export const approveArtistRequest = async (
  adminUserId: string,
  artistRequestId: string
) => {
  const artistRequest = await prisma.artistRequest.findUnique({
    where: { id: artistRequestId },
    select: {
      id: true,
      userId: true,
      artistName: true,
      bio: true,
      avatarUrl: true,
      socialMediaLinks: true, // Assuming this is Prisma.JsonValue
      requestedGenres: true, // Assuming this is string[]
      requestedLabelName: true,
      status: true,
      user: { select: { id: true, email: true, name: true, username: true } },
    },
  });

  if (!artistRequest) {
    throw new Error("Artist request not found.");
  }

  if (artistRequest.status !== RequestStatus.PENDING) {
    throw new Error(
      `Artist request cannot be approved as it is already in '${artistRequest.status}' status.`
    );
  }

  if (!artistRequest.userId) {
    throw new Error(
      "User ID missing from artist request, cannot create artist profile."
    );
  }

  const updatedData = await prisma.$transaction(async (tx) => {
    // +++ START: Check for artistName conflict +++
    const conflictingProfileByName = await tx.artistProfile.findUnique({
      where: {
        artistName: artistRequest.artistName,
      },
      select: { userId: true }, // Only need userId to check if it's a different user
    });

    if (
      conflictingProfileByName &&
      conflictingProfileByName.userId !== artistRequest.userId
    ) {
      // Artist name is taken by a DIFFERENT user
      throw new HttpError(
        409, // HTTP 409 Conflict
        `The artist name "${artistRequest.artistName}" is already in use by another artist. This request cannot be approved with the current name.`
      );
    }
    // +++ END: Check for artistName conflict +++

    // 1. Create or Update ArtistProfile
    // We use upsert to handle cases where an ArtistProfile might already exist for the user but isn't verified
    // or to create a new one if it doesn't exist at all.
    const userArtistProfile = await tx.artistProfile.upsert({
      where: { userId: artistRequest.userId }, // Use userId to find existing profile for this user
      update: {
        // If ArtistProfile for this user exists, update it
        artistName: artistRequest.artistName,
        bio: artistRequest.bio,
        avatar: artistRequest.avatarUrl, // Use avatarUrl from the request
        socialMediaLinks: artistRequest.socialMediaLinks || Prisma.JsonNull,
        // portfolioLinks: artistRequest.portfolioLinks || Prisma.JsonNull, // Add if portfolioLinks should be on ArtistProfile
        isVerified: true,
        verifiedAt: new Date(),
        role: Role.ARTIST,
        isActive: true, // Ensure the profile is active
        verificationRequestedAt: null, // Clear old request flag if it was used
        // requestedLabelName: null, // Clear if it was on ArtistProfile, now handled via ArtistRequest
      },
      create: {
        // If no ArtistProfile for this user, create a new one
        userId: artistRequest.userId,
        artistName: artistRequest.artistName,
        bio: artistRequest.bio,
        avatar: artistRequest.avatarUrl,
        socialMediaLinks: artistRequest.socialMediaLinks || Prisma.JsonNull,
        // portfolioLinks: artistRequest.portfolioLinks || Prisma.JsonNull,
        role: Role.ARTIST,
        isVerified: true,
        verifiedAt: new Date(),
        isActive: true,
        monthlyListeners: 0,
      },
      select: {
        id: true,
        userId: true,
        artistName: true,
        labelId: true,
        user: { select: userSelect },
        label: true,
      },
    });

    // 2. Handle Label Creation and Assignment (if requestedLabelName exists)
    let finalLabelId: string | null = userArtistProfile.labelId; // Preserve existing label if any
    let createdLabelViaRequest = false;

    if (artistRequest.requestedLabelName) {
      const labelRecord = await tx.label.upsert({
        where: { name: artistRequest.requestedLabelName },
        update: {}, // If label exists, do nothing to it, just use its ID
        create: {
          name: artistRequest.requestedLabelName,
          description: "Created via artist request",
        }, // Add a default description
        select: { id: true },
      });
      finalLabelId = labelRecord.id;
      createdLabelViaRequest = true; // Mark that this request processed a label

      // Update the artist profile with this new/existing label ID
      await tx.artistProfile.update({
        where: { id: userArtistProfile.id },
        data: { labelId: finalLabelId },
      });
    }

    // 3. Create LabelRegistrationRequest if a label was processed by this artist request approval
    if (
      createdLabelViaRequest &&
      finalLabelId &&
      artistRequest.requestedLabelName
    ) {
      await tx.labelRegistrationRequest.create({
        data: {
          requestedLabelName: artistRequest.requestedLabelName,
          requestingArtistId: userArtistProfile.id, // This is ArtistProfile.id
          status: RequestStatus.APPROVED,
          submittedAt: new Date(), // Consider using the ArtistRequest submission time if available and desired
          reviewedAt: new Date(),
          reviewedByAdminId: adminUserId,
          createdLabelId: finalLabelId,
        },
      });
    }

    // 4. Update the original ArtistRequest status
    const finalArtistRequest = await tx.artistRequest.update({
      where: { id: artistRequestId },
      data: {
        status: RequestStatus.APPROVED,
        // rejectionReason: null, // Optionally clear rejectionReason if it could have been set before
        // reviewedAt: new Date(), // Optionally set reviewedAt for the ArtistRequest itself
        // reviewedByAdminId: adminUserId, // Optionally set this too
      },
      select: { id: true, status: true, userId: true, artistName: true }, // Select necessary fields
    });

    // Refetch the artist profile to include the potentially updated label
    const finalPopulatedProfile = await tx.artistProfile.findUnique({
      where: { id: userArtistProfile.id },
      include: { user: { select: userSelect }, label: true },
    });

    if (!finalPopulatedProfile) {
      throw new Error(
        "Failed to retrieve final populated artist profile after transaction."
      );
    }

    return {
      artistRequest: finalArtistRequest,
      artistProfile: finalPopulatedProfile,
    };
  });

  // --- Start Notification Logic ---
  const userForNotification = artistRequest.user;
  if (userForNotification) {
    prisma.notification
      .create({
        data: {
          type: "ARTIST_REQUEST_APPROVE",
          message: `Congratulations! Your request to become artist '${artistRequest.artistName}' has been approved. Your artist profile is now active.`,
          recipientType: "USER",
          userId: userForNotification.id, // Correct: Use userForNotification.id for the recipient User
          artistId: updatedData.artistProfile.id, // Correct: Use the ID of the created/updated ArtistProfile
          isRead: false,
        },
      })
      .catch((err) =>
        console.error(
          "[Service Notify Error] Failed to create approval notification:",
          err
        )
      );

    if (userForNotification.email) {
      try {
        const emailOptions = emailService.createArtistRequestApprovedEmail(
          userForNotification.email,
          userForNotification.name || userForNotification.username || "User"
        );
        emailService
          .sendEmail(emailOptions)
          .catch((err) =>
            console.error(
              "[Service Email Error] Failed to send approval email:",
              err
            )
          );
      } catch (syncError) {
        console.error(
          "[Email Setup Error] Failed to create approval email options:",
          syncError
        );
      }
    } else {
      console.warn(
        `Could not send approval email: No email found for user ${userForNotification.id}`
      );
    }
  } else {
    console.error(
      "[Approve Request Service] User data missing on ArtistRequest for notification/email."
    );
  }
  // --- End Notification Logic ---

  return {
    message: "Artist request approved successfully.",
    data: updatedData, // Contains artistRequest and artistProfile
  };
};

export const rejectArtistRequest = async (
  artistRequestId: string,
  rejectionReason?: string
) => {
  const artistRequest = await prisma.artistRequest.findUnique({
    where: {
      id: artistRequestId,
    },
    select: {
      id: true,
      status: true,
      userId: true,
      artistName: true, // For notification message
      user: { select: { id: true, email: true, name: true, username: true } }, // For email and notification context
    },
  });

  if (!artistRequest) {
    throw new Error("Artist request not found.");
  }

  if (artistRequest.status !== RequestStatus.PENDING) {
    throw new Error(
      `Artist request cannot be rejected as it is already in '${artistRequest.status}' status.`
    );
  }

  const updatedRequest = await prisma.artistRequest.update({
    where: { id: artistRequestId },
    data: {
      status: RequestStatus.REJECTED,
      rejectionReason: rejectionReason || "No reason provided",
      // reviewedAt: new Date(), // Optionally set reviewedAt, ensure reviewedByAdminId is also handled if needed
    },
    select: {
      id: true,
      userId: true,
      status: true,
      user: { select: { id: true, email: true, name: true, username: true } },
      artistName: true,
      rejectionReason: true,
    },
  });

  // --- Start Notification Logic (moved from controller) ---
  if (updatedRequest.user) {
    let notificationMessage = `Your request to become artist '${updatedRequest.artistName}' has been rejected.`;
    if (
      updatedRequest.rejectionReason &&
      updatedRequest.rejectionReason !== "No reason provided"
    ) {
      notificationMessage += ` Reason: ${updatedRequest.rejectionReason}`;
    }

    // Create notification for the user whose request was rejected
    prisma.notification
      .create({
        data: {
          // This 'data' key is correct for prisma.notification.create
          type: "ARTIST_REQUEST_REJECT",
          message: notificationMessage,
          recipientType: "USER",
          userId: updatedRequest.user.id,
          isRead: false,
        },
        select: {
          // This select should be at the top level of the create arguments, not nested under data
          id: true,
          type: true,
          message: true,
          recipientType: true,
          isRead: true,
          createdAt: true,
          userId: true, // Keep if needed by socket logic, though recipientType + userId is the primary target
          // artistId: true, // Not directly relevant for a user-facing rejection of their own request here
          // senderId: true, // adminUserId would need to be passed if we want to log who rejected
        },
      })
      .catch((err) =>
        console.error(
          "[Service Notify Error] Failed to create rejection notification:",
          err
        )
      );

    // Send email
    if (updatedRequest.user.email) {
      try {
        const emailOptions = emailService.createArtistRequestRejectedEmail(
          updatedRequest.user.email,
          updatedRequest.user.name || updatedRequest.user.username || "User",
          updatedRequest.rejectionReason || undefined // Ensure undefined if null for the email function
        );
        emailService
          .sendEmail(emailOptions)
          .catch((err) =>
            console.error(
              "[Service Email Error] Failed to send rejection email:",
              err
            )
          );
        console.log(
          `Artist rejection email sent to ${updatedRequest.user.email}`
        );
      } catch (emailError) {
        console.error("Failed to setup artist rejection email:", emailError);
      }
    } else {
      console.warn(
        `Could not send rejection email: No email found for user ${updatedRequest.user.id}`
      );
    }
  }
  // --- End Notification Logic ---

  return {
    message: "Artist request rejected successfully.",
    request: updatedRequest,
    // The concept of 'hasPendingRequest' on the user might need an update elsewhere
    // if it was based on the ArtistProfile.verificationRequestedAt field.
    // For now, this function focuses on the ArtistRequest itself.
  };
};

export const deleteArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
    },
  });

  if (!artistProfile) {
    throw new Error(
      "Artist request not found or not in a deletable state (e.g., approved)."
    );
  }

  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  return { deletedRequestId: requestId };
};

export const getDashboardStats = async () => {
  const coreStatsPromise = Promise.all([
    prisma.user.count({ where: { role: { not: Role.ADMIN } } }),
    prisma.artistProfile.count({
      where: { role: Role.ARTIST, isVerified: true },
    }),
    prisma.artistRequest.count({ where: { status: RequestStatus.PENDING } }),
    prisma.artistProfile.findMany({
      where: { role: Role.ARTIST, isVerified: true },
      orderBy: [{ monthlyListeners: "desc" }],
      take: 4,
      select: {
        id: true,
        artistName: true,
        avatar: true,
        monthlyListeners: true,
      },
    }),
    prisma.genre.count(),
    prisma.label.count(),
    prisma.album.count({ where: { isActive: true } }),
    prisma.track.count({ where: { isActive: true } }),
    prisma.playlist.count({
      where: { type: PlaylistType.SYSTEM, userId: null },
    }),
  ]);

  const monthlyUserDataPromise = (async () => {
    const monthlyData: Array<{ month: string; users: number }> = [];
    const allMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const endOfMonthDate = endOfMonth(monthDate);
      const monthLabel = allMonths[monthDate.getMonth()];

      const userCount = await prisma.user.count({
        where: {
          createdAt: { lte: endOfMonthDate },
        },
      });

      monthlyData.push({ month: monthLabel, users: userCount });
    }
    return monthlyData;
  })();

  const [coreStats, monthlyUserData] = await Promise.all([
    coreStatsPromise,
    monthlyUserDataPromise,
  ]);

  const [
    totalUsers,
    totalArtists,
    totalArtistRequests,
    topArtists,
    totalGenres,
    totalLabels,
    totalAlbums,
    totalTracks,
    totalSystemPlaylists,
  ] = coreStats;

  return {
    totalUsers,
    totalArtists,
    totalArtistRequests,
    totalGenres,
    totalLabels,
    totalAlbums,
    totalTracks,
    totalSystemPlaylists,
    topArtists: topArtists.map((artist) => ({
      id: artist.id,
      artistName: artist.artistName,
      avatar: artist.avatar,
      monthlyListeners: artist.monthlyListeners,
    })),
    monthlyUserData,
    updatedAt: new Date().toISOString(),
  };
};

export const getSystemStatus = async (): Promise<SystemComponentStatus[]> => {
  const statuses: SystemComponentStatus[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    statuses.push({ name: "Database (PostgreSQL)", status: "Available" });
  } catch (error) {
    console.error("[System Status] Database check failed:", error);
    statuses.push({
      name: "Database (PostgreSQL)",
      status: "Outage",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const useRedis = process.env.USE_REDIS_CACHE === "true";
  if (useRedis) {
    if (redisClient && typeof redisClient.ping === "function") {
      try {
        if (!redisClient.isOpen) {
          statuses.push({
            name: "Cache (Redis)",
            status: "Outage",
            message: "Client not connected",
          });
        } else {
          await redisClient.ping();
          statuses.push({ name: "Cache (Redis)", status: "Available" });
        }
      } catch (error) {
        console.error("[System Status] Redis ping failed:", error);
        statuses.push({
          name: "Cache (Redis)",
          status: "Issue",
          message: error instanceof Error ? error.message : "Ping failed",
        });
      }
    } else {
      console.warn("[System Status] Redis client seems uninitialized or mock.");
      statuses.push({
        name: "Cache (Redis)",
        status: "Issue",
        message: "Redis client not properly initialized or is a mock.",
      });
    }
  } else {
    statuses.push({
      name: "Cache (Redis)",
      status: "Disabled",
      message: "USE_REDIS_CACHE is false",
    });
  }

  try {
    const cloudinary = (await import("cloudinary")).v2;
    const pingResult = await cloudinary.api.ping();
    if (pingResult?.status === "ok") {
      statuses.push({
        name: "Cloudinary (Media Storage)",
        status: "Available",
      });
    } else {
      statuses.push({
        name: "Cloudinary (Media Storage)",
        status: "Issue",
        message: `Ping failed or unexpected status: ${pingResult?.status}`,
      });
    }
  } catch (error) {
    console.error("[System Status] Cloudinary check failed:", error);
    statuses.push({
      name: "Cloudinary (Media Storage)",
      status: "Outage",
      message:
        error instanceof Error ? error.message : "Connection or Auth failed",
    });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

      const model = genAI.getGenerativeModel({ model: modelName });
      await model.countTokens("test");

      statuses.push({
        name: "Gemini SDK",
        status: "Available",
        message: `API Key valid. Configured model: ${modelName}`,
      });
    } catch (error: any) {
      console.error("[System Status] Gemini AI check failed:", error);
      statuses.push({
        name: "Gemini SDK",
        status: "Issue",
        message: error.message || "Failed to initialize or connect to Gemini",
      });
    }
  } else {
    statuses.push({
      name: "Gemini SDK",
      status: "Disabled",
      message: "GEMINI_API_KEY not set",
    });
  }

  // ACRCloud Status Check
  const acrHost = process.env.ACRCLOUD_HOST;
  const acrKey = process.env.ACRCLOUD_ACCESS_KEY;
  const acrSecret = process.env.ACRCLOUD_ACCESS_SECRET;

  if (acrHost && acrKey && acrSecret) {
    statuses.push({
      name: "ACRCloud (Copyright Check)",
      status: "Available",
      message: "SDK configured with credentials.",
    });
  } else {
    statuses.push({
      name: "ACRCloud (Copyright Check)",
      status: "Disabled",
      message: "ACRCloud credentials not set in .env",
    });
  }

  if (nodemailerTransporter) {
    try {
      const verified = await nodemailerTransporter.verify();
      if (verified) {
        statuses.push({ name: "Email (Nodemailer)", status: "Available" });
      } else {
        statuses.push({
          name: "Email (Nodemailer)",
          status: "Issue",
          message: "Verification returned false",
        });
      }
    } catch (error: any) {
      console.error("[System Status] Nodemailer verification failed:", error);
      statuses.push({
        name: "Email (Nodemailer)",
        status: "Outage",
        message: error.message || "Verification failed",
      });
    }
  } else {
    statuses.push({
      name: "Email (Nodemailer)",
      status: "Disabled",
      message: "SMTP configuration incomplete or transporter not initialized",
    });
  }

  return statuses;
};

export const getAIModelStatus = async (): Promise<{
  model: string;
  validModels: string[];
}> => {
  const currentModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  return {
    model: currentModel,
    validModels: VALID_GEMINI_MODELS,
  };
};

export const updateAIModel = async (model?: string) => {
  try {
    const validModels = [
      "gemini-2.5-flash-preview-04-17",
      "gemini-2.5-pro-preview-05-06",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
    ];

    const currentModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const isEnabled = !!process.env.GEMINI_API_KEY;

    if (model === undefined) {
      return {
        success: true,
        message: "Current AI model settings retrieved",
        data: {
          model: currentModel,
          enabled: isEnabled,
          validModels,
        },
      };
    }

    if (!validModels.includes(model)) {
      throw new Error(
        `Invalid model name. Valid models are: ${validModels.join(", ")}`
      );
    }

    const envPath =
      process.env.NODE_ENV === "production"
        ? path.resolve(process.cwd(), "../.env")
        : path.resolve(process.cwd(), ".env");

    if (!fs.existsSync(envPath)) {
      throw new Error(`.env file not found at ${envPath}`);
    }

    let envContent = fs.readFileSync(envPath, "utf8");
    const regex = /GEMINI_MODEL=.*/;
    const newLine = `GEMINI_MODEL=${model}`;

    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `
${newLine}`;
    }

    fs.writeFileSync(envPath, envContent);

    process.env.GEMINI_MODEL = model;

    console.log(`[Admin] AI model changed to: ${model}`);

    return {
      success: true,
      message: `AI model settings updated to ${model}`,
      data: {
        model,
        enabled: isEnabled,
        validModels,
      },
    };
  } catch (error) {
    console.error("[Admin] Error updating AI model:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update AI model",
      error: true,
    };
  }
};

// --- Artist Claim Request Management ---

export const getArtistClaimRequests = async (req: Request) => {
  const { search, startDate, endDate } = req.query;

  const where: Prisma.ArtistClaimRequestWhereInput = {
    status: ClaimStatus.PENDING,
    AND: [],
  };

  // Add search functionality (search by claiming user name/email or claimed artist name)
  if (typeof search === "string" && search.trim()) {
    const trimmedSearch = search.trim();
    if (Array.isArray(where.AND)) {
      where.AND.push({
        OR: [
          {
            claimingUser: {
              name: { contains: trimmedSearch, mode: "insensitive" },
            },
          },
          {
            claimingUser: {
              email: { contains: trimmedSearch, mode: "insensitive" },
            },
          },
          {
            claimingUser: {
              username: { contains: trimmedSearch, mode: "insensitive" },
            },
          },
          {
            artistProfile: {
              artistName: { contains: trimmedSearch, mode: "insensitive" },
            },
          },
        ],
      });
    }
  }

  // Add date filtering based on submittedAt
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (typeof startDate === "string" && startDate) {
    try {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      dateFilter.gte = startOfDay;
    } catch (e) {
      console.error("Invalid start date format:", startDate);
    }
  }
  if (typeof endDate === "string" && endDate) {
    try {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = endOfDay;
    } catch (e) {
      console.error("Invalid end date format:", endDate);
    }
  }
  if (dateFilter.gte || dateFilter.lte) {
    if (Array.isArray(where.AND)) {
      where.AND.push({ submittedAt: dateFilter });
    }
  }

  const options = {
    where,
    select: artistClaimRequestSelect,
    orderBy: { submittedAt: "desc" },
  };

  const result = await paginate<any>(prisma.artistClaimRequest, req, options);

  return {
    claimRequests: result.data,
    pagination: result.pagination,
  };
};

export const getArtistClaimRequestDetail = async (claimId: string) => {
  const claimRequest = await prisma.artistClaimRequest.findUnique({
    where: { id: claimId },
    select: artistClaimRequestDetailsSelect,
  });

  if (!claimRequest) {
    throw new Error("Artist claim request not found.");
  }

  if (
    claimRequest.artistProfile.user?.id ||
    claimRequest.artistProfile.isVerified
  ) {
    if (claimRequest.status === ClaimStatus.PENDING) {
      console.warn(
        `Claim request ${claimId} is pending but target profile ${claimRequest.artistProfile.id} seems already claimed/verified.`
      );
    }
  }

  return claimRequest;
};

export const approveArtistClaim = async (
  claimId: string,
  adminUserId: string
) => {
  const claimRequest = await prisma.artistClaimRequest.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      status: true,
      claimingUserId: true,
      artistProfileId: true,
      artistProfile: {
        select: { userId: true, isVerified: true, artistName: true },
      }, // Lấy thêm artistName
    },
  });

  if (!claimRequest) {
    throw new Error("Artist claim request not found.");
  }

  if (claimRequest.status !== ClaimStatus.PENDING) {
    throw new Error(
      `Cannot approve claim request with status: ${claimRequest.status}`
    );
  }

  // Double-check if the target profile is still available before approving
  if (claimRequest.artistProfile.userId) {
    // Optionally auto-reject here instead of throwing
    await prisma.artistClaimRequest.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.REJECTED,
        rejectionReason: "Profile became unavailable before approval.",
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
      },
    });
    throw new Error(
      "Target artist profile is no longer available for claiming."
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update the Claim Request status
    const updatedClaim = await tx.artistClaimRequest.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
        rejectionReason: null,
      },
      select: { id: true, claimingUserId: true, artistProfileId: true }, // Select IDs needed
    });

    // 2. Update the Artist Profile
    const updatedProfile = await tx.artistProfile.update({
      where: { id: updatedClaim.artistProfileId },
      data: {
        userId: updatedClaim.claimingUserId, // Link user to profile
        isVerified: true, // Mark as verified
        verifiedAt: new Date(),
        role: Role.ARTIST, // Ensure role is ARTIST
        verificationRequestedAt: null,
        requestedLabelName: null,
      },
      select: { id: true, artistName: true }, // Select some profile info for return/logging
    });

    // 3. Reject all other pending claims for the SAME artist profile from OTHER users
    await tx.artistClaimRequest.updateMany({
      where: {
        artistProfileId: updatedClaim.artistProfileId,
        id: { not: claimId },
        status: ClaimStatus.PENDING,
      },
      data: {
        status: ClaimStatus.REJECTED,
        rejectionReason: "Another claim for this artist was approved.",
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
      },
    });

    // 4. Reject any other claim requests by the approved user for other artist profiles
    await tx.artistClaimRequest.updateMany({
      where: {
        claimingUserId: updatedClaim.claimingUserId,
        artistProfileId: { not: updatedClaim.artistProfileId },
        status: { in: [ClaimStatus.PENDING, ClaimStatus.REJECTED] },
      },
      data: {
        status: ClaimStatus.REJECTED,
        rejectionReason: "You have been approved for another artist claim.",
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
      },
    });

    // --- START: Gửi thông báo và socket cho User được duyệt ---
    try {
      const notificationData = {
        data: {
          type: NotificationType.CLAIM_REQUEST_APPROVED,
          message: `Your claim request for artist '${claimRequest.artistProfile.artistName}' has been approved.`,
          recipientType: RecipientType.USER,
          userId: updatedClaim.claimingUserId, // ID của User được duyệt
          artistId: updatedClaim.artistProfileId, // ID của Artist Profile
          senderId: adminUserId, // ID của Admin duyệt,
          isRead: false,
        },
        select: {
          id: true,
          type: true,
          message: true,
          recipientType: true,
          isRead: true,
          createdAt: true,
          artistId: true,
          senderId: true,
        }, // Select fields needed for socket
      };

      const notification = await tx.notification.create(notificationData);

      // Emit socket event
      const io = getIO();
      const targetSocketId = getUserSockets().get(updatedClaim.claimingUserId);
      if (targetSocketId) {
        console.log(
          `[Socket Emit] Sending CLAIM_REQUEST_APPROVED notification to user ${updatedClaim.claimingUserId} via socket ${targetSocketId}`
        );
        io.to(targetSocketId).emit("notification", {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          recipientType: notification.recipientType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
          artistId: notification.artistId,
          senderId: notification.senderId,
        });
      } else {
        console.log(
          `[Socket Emit] User ${updatedClaim.claimingUserId} not connected, skipping CLAIM_REQUEST_APPROVED socket event.`
        );
      }
    } catch (notificationError) {
      console.error(
        "[Notify/Socket Error] Failed processing claim approval notification/socket:",
        notificationError
      );
      // Do not throw error here to let the main transaction succeed
    }
    // --- END: Gửi thông báo và socket cho User được duyệt ---

    return {
      message: `Claim approved. Profile '${updatedProfile.artistName}' is now linked to user ${updatedClaim.claimingUserId}.`,
      claimId: updatedClaim.id,
      artistProfileId: updatedProfile.id,
      userId: updatedClaim.claimingUserId,
    };
  });
};

export const rejectArtistClaim = async (
  claimId: string,
  adminUserId: string,
  reason: string
) => {
  const claimRequest = await prisma.artistClaimRequest.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      status: true,
      claimingUserId: true,
      artistProfile: { select: { id: true, artistName: true } }, // Lấy artistName
    },
  });

  if (!claimRequest) {
    throw new Error("Artist claim request not found.");
  }

  if (claimRequest.status !== ClaimStatus.PENDING) {
    throw new Error(
      `Cannot reject claim request with status: ${claimRequest.status}`
    );
  }

  if (!reason || reason.trim() === "") {
    throw new Error("Rejection reason is required.");
  }

  const rejectedClaim = await prisma.artistClaimRequest.update({
    where: { id: claimId },
    data: {
      status: ClaimStatus.REJECTED,
      rejectionReason: reason.trim(),
      reviewedAt: new Date(),
      reviewedByAdminId: adminUserId,
    },
    select: { id: true, claimingUserId: true, artistProfileId: true },
  });

  // --- START: Gửi thông báo và socket cho User bị từ chối ---
  if (rejectedClaim && claimRequest) {
    // Ensure we have needed data
    try {
      const notification = await prisma.notification.create({
        data: {
          type: NotificationType.CLAIM_REQUEST_REJECTED,
          message: `Your claim request for artist '${
            claimRequest.artistProfile.artistName
          }' was rejected. Reason: ${reason.trim()}`,
          recipientType: RecipientType.USER,
          userId: rejectedClaim.claimingUserId, // ID của User bị từ chối
          artistId: rejectedClaim.artistProfileId, // ID của Artist Profile
          senderId: adminUserId,
          isRead: false,
        },
        select: {
          id: true,
          type: true,
          message: true,
          recipientType: true,
          isRead: true,
          createdAt: true,
          artistId: true,
          senderId: true,
        },
      });

      // Emit socket event after notification is created
      const io = getIO();
      const targetSocketId = getUserSockets().get(rejectedClaim.claimingUserId);
      if (targetSocketId) {
        console.log(
          `[Socket Emit] Sending CLAIM_REQUEST_REJECTED notification to user ${rejectedClaim.claimingUserId} via socket ${targetSocketId}`
        );
        io.to(targetSocketId).emit("notification", {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          recipientType: notification.recipientType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
          artistId: notification.artistId,
          senderId: notification.senderId,
          rejectionReason: reason.trim(),
        });
      } else {
        console.log(
          `[Socket Emit] User ${rejectedClaim.claimingUserId} not connected, skipping CLAIM_REQUEST_REJECTED socket event.`
        );
      }
    } catch (notificationError) {
      console.error(
        "[Notify/Socket Error] Failed processing claim rejection notification/socket:",
        notificationError
      );
    }
  }
  // --- END: Gửi thông báo và socket cho User bị từ chối ---

  return {
    message: "Artist claim request rejected successfully.",
    claimId: rejectedClaim.id,
    userId: rejectedClaim.claimingUserId,
  };
};

// Helper function to convert MP3 buffer to Float32Array PCM data for audio analysis
async function convertMp3BufferToPcmF32(
  audioBuffer: Buffer
): Promise<Float32Array | null> {
  try {
    const decoder = new MPEGDecoder();
    await decoder.ready; // Wait for the decoder WASM to be ready

    // Decode the entire buffer
    // Need to convert Node Buffer to Uint8Array for the decode method
    const uint8ArrayBuffer = new Uint8Array(
      audioBuffer.buffer,
      audioBuffer.byteOffset,
      audioBuffer.length
    );
    const decoded: MPEGDecodedAudio = decoder.decode(uint8ArrayBuffer);

    decoder.free(); // Release resources

    if (decoded.errors.length > 0) {
      console.error("MP3 Decoding errors:", decoded.errors);
      return null;
    }

    // Check if we got valid channel data
    if (!decoded.channelData || decoded.channelData.length === 0) {
      console.error("MP3 Decoding produced no channel data.");
      return null;
    }

    // Get the original sample rate from the decoded audio
    const originalSampleRate = decoded.sampleRate;
    console.log(`Original audio sample rate: ${originalSampleRate} Hz`);

    // Convert to mono by averaging channels if stereo
    let monoChannel: Float32Array;
    if (decoded.channelData.length > 1) {
      const leftChannel = decoded.channelData[0];
      const rightChannel = decoded.channelData[1];
      monoChannel = new Float32Array(leftChannel.length);
      for (let i = 0; i < leftChannel.length; i++) {
        monoChannel[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }
    } else {
      // Already mono
      monoChannel = decoded.channelData[0];
    }

    // If the sample rate is already 44100, return as is
    if (originalSampleRate === 44100) {
      console.log("Audio already at 44100 Hz, no resampling needed");
      return monoChannel;
    }

    // Simple linear resampling to 44100 Hz for RhythmExtractor2013
    // This is a basic implementation - more sophisticated resampling would be better for production
    console.log(
      `Resampling audio from ${originalSampleRate} Hz to 44100 Hz for RhythmExtractor2013`
    );
    const targetSampleRate = 44100;
    const resampleRatio = targetSampleRate / originalSampleRate;
    const resampledLength = Math.floor(monoChannel.length * resampleRatio);
    const resampledBuffer = new Float32Array(resampledLength);

    for (let i = 0; i < resampledLength; i++) {
      // Calculate the position in the original buffer
      const originalPos = i / resampleRatio;
      const originalPosFloor = Math.floor(originalPos);
      const originalPosCeil = Math.min(
        originalPosFloor + 1,
        monoChannel.length - 1
      );
      const fraction = originalPos - originalPosFloor;

      // Linear interpolation between the two closest samples
      resampledBuffer[i] =
        monoChannel[originalPosFloor] * (1 - fraction) +
        monoChannel[originalPosCeil] * fraction;
    }

    console.log(
      `Resampled audio to ${resampledBuffer.length} samples at 44100 Hz`
    );
    return resampledBuffer;
    // Explicit return to satisfy linter - should never reach here due to earlier returns
  } catch (error) {
    console.error("Error during MP3 decoding or processing:", error);
    return null; // Return null if any error occurs
  }
}

// Helper function to generate a cover image for a track based on metadata using DiceBear
async function generateCoverArtwork(
  trackTitle: string,
  artistName: string,
  mood?: string | null
): Promise<string | null> {
  try {
    const seed = encodeURIComponent(`${artistName}-${trackTitle}`);

    const imageUrl = `https://api.dicebear.com/8.x/shapes/svg?seed=${seed}&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360`; // radius=0 for square

    console.log(
      `Generated cover artwork for "${trackTitle}" using DiceBear: ${imageUrl}`
    );
    return imageUrl;
  } catch (error) {
    console.error("Error generating cover artwork with DiceBear:", error);
    // Fallback to a simple placeholder if generation fails
    return `https://placehold.co/500x500/EEE/31343C?text=${encodeURIComponent(
      trackTitle.substring(0, 15)
    )}`;
  }
}

// --- New function for admin use to create verified artist profiles ---
/**
 * Get or create a verified artist profile - Admin version
 * Unlike the regular getOrCreateArtistProfile function, this function creates a verified artist profile
 * if it doesn't exist, allowing regular users to view the artist profile immediately.
 * This should only be used in admin contexts like bulk upload.
 */
export async function getOrCreateVerifiedArtistProfile(
  artistNameOrId: string
): Promise<ArtistProfile> {
  const isLikelyId = /^[a-z0-9]{25}$/.test(artistNameOrId);

  if (isLikelyId) {
    const existingProfile = await prisma.artistProfile.findUnique({
      where: { id: artistNameOrId },
    });
    if (existingProfile) {
      // If profile exists but isn't verified, verify it
      if (!existingProfile.isVerified) {
        return await prisma.artistProfile.update({
          where: { id: existingProfile.id },
          data: { isVerified: true },
        });
      }
      return existingProfile;
    }
  }

  // Treat as name
  const nameToSearch = artistNameOrId;
  let artistProfile = await prisma.artistProfile.findFirst({
    where: {
      artistName: {
        equals: nameToSearch,
        mode: "insensitive",
      },
    },
  });

  if (artistProfile) {
    // If profile exists but isn't verified, verify it
    if (!artistProfile.isVerified) {
      artistProfile = await prisma.artistProfile.update({
        where: { id: artistProfile.id },
        data: { isVerified: true },
      });
    }
    return artistProfile;
  }

  // If not found, create a verified profile
  console.log(`Creating verified artist profile for: ${nameToSearch}`);
  artistProfile = await prisma.artistProfile.create({
    data: {
      artistName: nameToSearch,
      role: Role.ARTIST,
      isVerified: true,
      isActive: true,
      userId: null,
      monthlyListeners: 0,
    },
  });

  return artistProfile;
}

// Add this type definition at the top of the file, before the processBulkUpload function
interface BulkUploadResult {
  fileName: string;
  title: string;
  artistName: string;
  artistId: string;
  trackId?: string;
  duration: number;
  audioUrl: string;
  coverUrl?: string;
  tempo: number | null;
  mood: string | null;
  key: string | null;
  scale: string | null;
  danceability: number | null;
  energy: number | null;
  genreIds: string[];
  genres: string[];
  success: boolean;
  error?: string;
  albumName: string | null;
  albumId?: string;
  albumType?: "SINGLE" | "EP" | "ALBUM" | undefined;
}

export const processBulkUpload = async (files: Express.Multer.File[]) => {
  const results: BulkUploadResult[] = [];
  // Track album mapping for batch processing
  const albumTracks: {
    [albumName: string]: { tracks: any[]; artistId: string; coverUrl?: string };
  } = {};

  for (const file of files) {
    let coverUrl: string | null = null;
    let title = file.originalname.replace(/\.[^/.]+$/, "");
    let derivedArtistName = "Unknown Artist";
    let duration = 0;
    let albumName: string | null = null;

    try {
      console.log(`Processing file: ${file.originalname}`);

      // 1. Upload AUDIO to Cloudinary
      const audioUploadResult = await uploadFile(file.buffer, "tracks", "auto");
      const audioUrl = audioUploadResult.secure_url;

      // 2. Extract Metadata AND COVER ART (music-metadata)
      try {
        const metadata = await mm.parseBuffer(file.buffer, file.mimetype);
        duration = Math.round(metadata.format.duration || 0);
        if (metadata.common?.artist) derivedArtistName = metadata.common.artist;
        if (metadata.common?.title) title = metadata.common.title;

        // Extract album name from metadata if available
        if (metadata.common?.album) {
          albumName = metadata.common.album;
        }

        // ---> START: Extract and Upload EMBEDDED cover art <---
        if (metadata.common?.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          try {
            console.log(
              `Found embedded cover art for "${title}". Uploading...`
            );
            const coverUploadResult = await uploadFile(
              Buffer.from(picture.data), // Chuyển Uint8Array thành Buffer
              "covers", // Thư mục lưu ảnh bìa trên Cloudinary
              "image" // Loại tài nguyên là ảnh
            );
            coverUrl = coverUploadResult.secure_url;
            console.log(
              `Uploaded embedded cover art for "${title}" to: ${coverUrl}`
            );
          } catch (coverUploadError) {
            console.error(
              `Error uploading embedded cover art for "${title}":`,
              coverUploadError
            );
            coverUrl = null; // Đặt lại là null nếu upload lỗi để fallback
          }
        } else {
          console.log(
            `No embedded cover art found for "${title}". Will generate fallback.`
          );
        }
      } catch (metadataError) {
        console.error("Error parsing basic audio metadata:", metadataError);
      }

      // 3. Analyze Audio with ReccoBeats API
      const audioAnalysis = await analyzeAudioWithReccoBeats(
        file.buffer,
        title,
        derivedArtistName
      );
      console.log(
        `Audio analysis result for "${title}":`,
        JSON.stringify(audioAnalysis, null, 2)
      );

      let { tempo, mood, key, scale, danceability, energy, genreIds } =
        audioAnalysis;
      let confidence: number | null = null;
      try {
        const pcmF32 = await convertMp3BufferToPcmF32(file.buffer);
        if (pcmF32) {
          const essentia = new Essentia(EssentiaWASM);
          const audioVector = essentia.arrayToVector(pcmF32);
          const targetSampleRate = 44000;

          // Always calculate tempo using Essentia
          try {
            const rhythmResult = essentia.RhythmExtractor2013(
              audioVector,
              targetSampleRate
            );
            let rawTempo = rhythmResult.bpm;
            confidence = rhythmResult.confidence || null;
            tempo = Math.round(rawTempo);
            console.log("Tempo calculated from Essentia:", tempo, "BPM");
          } catch (tempoError) {
            console.error(
              "Error estimating tempo with RhythmExtractor2013:",
              tempoError
            );
            try {
              const tempoResult = essentia.PercivalBpmEstimator(audioVector);
              tempo = Math.round(tempoResult.bpm);
              console.log(
                "Tempo calculated from PercivalBpmEstimator fallback:",
                tempo,
                "BPM"
              );
            } catch (fallbackError) {
              console.error(
                "Error estimating tempo with PercivalBpmEstimator fallback:",
                fallbackError
              );
              tempo = null;
            }
          }

          // Key & Scale Estimation always from Essentia
          try {
            const keyResult = essentia.KeyExtractor(audioVector);
            key = keyResult.key;
            scale = keyResult.scale;
            console.log("Key estimation from Essentia:", key, scale);
          } catch (keyError) {
            console.error(
              "Error estimating key/scale with Essentia:",
              keyError
            );
          }
        }
      } catch (analysisError) {
        console.error("Error during audio analysis pipeline:", analysisError);
      }

      // 4. Get or Create VERIFIED Artist Profile
      const artistProfile = await getOrCreateVerifiedArtistProfile(
        derivedArtistName
      );
      const artistId = artistProfile.id;

      // 5. Check for existing track (moved check after getting artistId)
      const existingTrack = await prisma.track.findUnique({
        where: { title_artistId: { title: title, artistId: artistId } },
        select: {
          id: true,
          title: true,
          artist: { select: { artistName: true } },
        },
      });

      // Xử lý trùng lặp
      if (existingTrack) {
        console.log(
          `Duplicate track found: "${existingTrack.title}" by ${existingTrack.artist?.artistName} (ID: ${existingTrack.id}). Skipping creation for file: ${file.originalname}`
        );
        results.push({
          fileName: file.originalname,
          title: title,
          artistName: derivedArtistName,
          error: `Duplicate: This track already exists (ID: ${existingTrack.id})`,
          success: false,
          trackId: existingTrack.id,
          artistId: artistId,
          duration: 0,
          audioUrl: "",
          coverUrl: undefined,
          tempo: null,
          mood: null,
          key: null,
          scale: null,
          danceability: null,
          energy: null,
          genreIds: [],
          genres: [],
          albumName: albumName,
          albumId: undefined,
          albumType: albumName ? "ALBUM" : "SINGLE",
        });
        continue;
      }

      // 6. Determine final Genre IDs (using fallback if needed)
      let finalGenreIds = [...genreIds];
      if (finalGenreIds.length === 0) {
        try {
          const popGenre = await prisma.genre.findFirst({
            where: { name: { equals: "Pop", mode: "insensitive" } },
          });
          if (popGenre) {
            finalGenreIds = [popGenre.id];
          } else {
            const anyGenre = await prisma.genre.findFirst({
              orderBy: { createdAt: "asc" },
            });
            if (anyGenre) finalGenreIds = [anyGenre.id];
          }
        } catch (fallbackGenreError) {
          console.error("Error finding fallback genre:", fallbackGenreError);
        }
      }

      // Determine album vs single
      let albumTypeName: "SINGLE" | "EP" | "ALBUM" = "SINGLE";
      let shouldAddToAlbum = false;

      // If there's an album name and it's different from the track title, add to an album
      if (albumName && albumName !== title) {
        shouldAddToAlbum = true;
        albumTypeName = "ALBUM";
      } else {
        // If no album name or album name equals track title, it's a single
        albumTypeName = "SINGLE";
        albumName = null;
      }

      // 7. Generate cover artwork ONLY for singles or for the first track in an album
      if (!coverUrl) {
        if (!shouldAddToAlbum) {
          // This is a single track, generate cover
          try {
            coverUrl = await generateCoverArtwork(
              title,
              derivedArtistName,
              mood
            );
            console.log(`Generated cover artwork for single "${title}"`);
          } catch (coverError) {
            console.error(
              "Error generating cover artwork for single:",
              coverError
            );
          }
        } else if (
          albumName &&
          (!albumTracks[albumName] ||
            albumTracks[albumName].tracks.length === 0)
        ) {
          // This is the first track of an album, generate album cover
          try {
            coverUrl = await generateCoverArtwork(
              albumName,
              derivedArtistName,
              mood
            );
            console.log(`Generated cover artwork for album "${albumName}"`);
          } catch (coverError) {
            console.error(
              `Error generating cover artwork for album "${albumName}":`,
              coverError
            );
          }
        } else {
          // This is not the first track of an album, don't generate cover
          console.log(
            `Skipping cover generation for "${title}" as it will use album cover`
          );
        }
      }

      // 8. Create Track record in Prisma
      const releaseDate = new Date();
      const trackData: Prisma.TrackCreateInput = {
        title,
        duration,
        releaseDate,
        audioUrl,
        coverUrl: coverUrl || undefined, // Convert null to undefined
        type:
          albumTypeName === "ALBUM"
            ? AlbumType.ALBUM
            : albumTypeName === "SINGLE"
            ? AlbumType.SINGLE
            : AlbumType.EP,
        isActive: true,
        tempo,
        mood,
        key,
        scale,
        danceability,
        energy,
        artist: { connect: { id: artistId } },
        // Album will be connected later
      };

      if (finalGenreIds.length > 0) {
        trackData.genres = {
          create: finalGenreIds.map((genreId) => ({
            genre: { connect: { id: genreId } },
          })),
        };
      }

      // If track is part of an album, add to album tracks mapping
      if (shouldAddToAlbum && albumName) {
        if (!albumTracks[albumName]) {
          albumTracks[albumName] = {
            tracks: [],
            artistId,
            coverUrl: undefined,
          };
        }

        // If this track has an embedded cover, prioritize it for the album
        if (coverUrl && !albumTracks[albumName].coverUrl) {
          console.log(
            `Using embedded cover from "${title}" for album "${albumName}"`
          );
          albumTracks[albumName].coverUrl = coverUrl;
        }

        // Add track data to album mapping
        albumTracks[albumName].tracks.push({
          trackData,
          title,
          duration,
          fileName: file.originalname,
          artistName: derivedArtistName,
          artistId,
          audioUrl,
          coverUrl, // Keep track's own cover URL for reference, but it won't be used if the album has a cover
          tempo,
          mood,
          key,
          scale,
          genreIds: finalGenreIds,
          genres:
            finalGenreIds.length > 0
              ? await getGenreNamesFromIds(finalGenreIds)
              : [],
        });

        // Add to results for frontend display
        results.push({
          fileName: file.originalname,
          title,
          artistName: derivedArtistName,
          artistId,
          duration,
          audioUrl,
          coverUrl: coverUrl || undefined,
          tempo,
          mood,
          key,
          scale,
          danceability,
          energy,
          genreIds: finalGenreIds,
          genres:
            finalGenreIds.length > 0
              ? await getGenreNamesFromIds(finalGenreIds)
              : [],
          success: true,
          albumName,
          albumId: undefined,
          albumType: albumTypeName,
        });
      } else {
        // Single track, not part of an album - create directly
        const newTrack = await prisma.track.create({
          data: trackData,
          select: trackSelect,
        });

        results.push({
          trackId: newTrack.id,
          title: newTrack.title,
          artistName: derivedArtistName,
          artistId,
          duration: newTrack.duration,
          audioUrl: newTrack.audioUrl,
          coverUrl: newTrack.coverUrl || undefined,
          tempo: newTrack.tempo,
          mood: newTrack.mood,
          key: newTrack.key,
          scale: newTrack.scale,
          danceability: newTrack.danceability,
          energy: newTrack.energy,
          genreIds: finalGenreIds,
          genres: newTrack.genres?.map((g) => g.genre.name),
          fileName: file.originalname,
          success: true,
          albumName: null,
          albumId: undefined,
          albumType: "SINGLE",
        });
      }
    } catch (error) {
      console.error(`Error processing file ${file.originalname}:`, error);
      results.push({
        fileName: file.originalname,
        title,
        artistName: derivedArtistName,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
        albumName: albumName,
        albumId: undefined,
        albumType: albumName ? "ALBUM" : "SINGLE",
        artistId: "",
        trackId: "",
        duration: 0,
        audioUrl: "",
        coverUrl: undefined,
        tempo: null,
        mood: null,
        key: null,
        scale: null,
        danceability: null,
        energy: null,
        genreIds: [],
        genres: [],
      });
    }
  }

  // Process albums after all tracks are uploaded
  for (const [albumName, albumData] of Object.entries(albumTracks)) {
    try {
      const { tracks, artistId, coverUrl } = albumData;
      if (tracks.length === 0) continue;

      // Calculate total duration of newly added tracks
      const totalDuration = tracks.reduce(
        (sum, track) => sum + (track.duration || 0),
        0
      );

      // Check if album already exists for this artist
      const existingAlbum = await prisma.album.findFirst({
        where: {
          title: albumName,
          artistId: artistId,
        },
        include: {
          tracks: {
            select: {
              duration: true,
            },
          },
        },
      });

      let album;
      // Initialize with defaults
      let albumTypeName: "EP" | "ALBUM" | "SINGLE" = "EP";
      let albumType: AlbumType = AlbumType.EP;

      if (existingAlbum) {
        console.log(
          `Album "${albumName}" already exists for this artist. Adding tracks to existing album.`
        );

        // Use existing album type instead of recalculating
        albumType = existingAlbum.type;
        // Derive string representation from enum
        albumTypeName =
          existingAlbum.type === AlbumType.ALBUM
            ? "ALBUM"
            : existingAlbum.type === AlbumType.SINGLE
            ? "SINGLE"
            : "EP";

        // Calculate new total duration including existing tracks
        const existingDuration = existingAlbum.tracks.reduce(
          (sum, track) => sum + (track.duration || 0),
          0
        );
        const newTotalDuration = existingDuration + totalDuration;
        const newTotalTracks = existingAlbum.totalTracks + tracks.length;

        // Only change from EP to ALBUM if total duration exceeds 10 minutes
        if (newTotalDuration >= 600 && existingAlbum.type === AlbumType.EP) {
          albumType = AlbumType.ALBUM;
          albumTypeName = "ALBUM";

          // Update album type and data
          await prisma.album.update({
            where: { id: existingAlbum.id },
            data: {
              type: AlbumType.ALBUM,
              duration: newTotalDuration,
              totalTracks: newTotalTracks,
              // Only update album cover if album has a better cover image and existing album has no cover
              ...(albumData.coverUrl && !existingAlbum.coverUrl
                ? { coverUrl: albumData.coverUrl }
                : {}),
            },
          });

          // Update type of all tracks in the album to match the new album type
          await prisma.track.updateMany({
            where: { albumId: existingAlbum.id },
            data: { type: AlbumType.ALBUM },
          });

          console.log(
            `Album "${albumName}" type changed from EP to ALBUM as duration now exceeds 10 minutes. Updated type for all ${existingAlbum.totalTracks} existing tracks.`
          );
        } else {
          // Just update duration and track count
          await prisma.album.update({
            where: { id: existingAlbum.id },
            data: {
              duration: newTotalDuration,
              totalTracks: newTotalTracks,
              // Only update album cover if album has a better cover image and existing album has no cover
              ...(albumData.coverUrl && !existingAlbum.coverUrl
                ? { coverUrl: albumData.coverUrl }
                : {}),
            },
          });
        }

        album = await prisma.album.findUnique({
          where: { id: existingAlbum.id },
        });
      } else {
        // For new albums, determine type based on duration
        // EP if total duration is less than 10 minutes (600 seconds)
        albumTypeName = totalDuration < 600 ? "EP" : "ALBUM";
        albumType = albumTypeName === "EP" ? AlbumType.EP : AlbumType.ALBUM;

        // Create new album
        album = await prisma.album.create({
          data: {
            title: albumName,
            coverUrl: albumData.coverUrl, // Use the best cover URL determined earlier
            releaseDate: new Date(),
            duration: totalDuration,
            totalTracks: tracks.length,
            type: albumType,
            isActive: true,
            artist: { connect: { id: artistId } },
          },
        });
        console.log(
          `Created new album "${albumName}" with ${tracks.length} tracks. Type: ${albumTypeName}`
        );
      }

      // Create all tracks and connect to album
      for (let i = 0; i < tracks.length; i++) {
        const trackInfo = tracks[i];

        // Get the next track number (existing tracks count + 1 + index)
        const trackNumber = existingAlbum
          ? existingAlbum.totalTracks + 1 + i
          : i + 1; // 1-based track numbering

        // Check if album is defined before using it
        if (!album) {
          console.error(
            `Album object is null when trying to create track "${trackInfo.title}"`
          );
          continue; // Skip this track
        }

        // Create track with album connection and track number
        await prisma.track.create({
          data: {
            ...trackInfo.trackData,
            // Use album's cover URL instead of track's own cover URL
            coverUrl: album.coverUrl || trackInfo.trackData.coverUrl,
            album: { connect: { id: album.id } },
            trackNumber: trackNumber,
            type: albumType, // Use the possibly updated album type
          },
        });

        // Update results with album ID and type
        const resultIndex = results.findIndex(
          (r) =>
            r.fileName === trackInfo.fileName && r.title === trackInfo.title
        );

        if (resultIndex !== -1 && album) {
          results[resultIndex].albumId = album.id;
          // Ensure albumTypeName is correctly typed for the results array
          results[resultIndex].albumType = albumTypeName as
            | "SINGLE"
            | "EP"
            | "ALBUM";
          // Update the cover URL in results to match what was actually saved
          results[resultIndex].coverUrl =
            album.coverUrl || results[resultIndex].coverUrl;
        }
      }
    } catch (albumError) {
      console.error(
        `Error creating/updating album "${albumName}":`,
        albumError
      );
    }
  }

  return results;
};

// Add this helper function near the beginning of the file, before processBulkUpload function
// Helper function to get genre names from IDs
async function getGenreNamesFromIds(genreIds: string[]): Promise<string[]> {
  try {
    const genres = await prisma.genre.findMany({
      where: {
        id: { in: genreIds },
      },
      select: {
        name: true,
      },
    });
    return genres.map((g) => g.name);
  } catch (error) {
    console.error("Error getting genre names:", error);
    return [];
  }
}

export const generateAndAssignAiPlaylistToUser = async (
  adminExecutingId: string,
  targetUserId: string,
  customParams?: {
    customPromptKeywords?: string;
    requestedTrackCount?: number;
  }
): Promise<PrismaPlaylist> => {
  const admin = await prisma.user.findUnique({
    where: { id: adminExecutingId },
  });
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!admin || admin.role !== Role.ADMIN) {
    throw new HttpError(403, "Forbidden: Only admins can perform this action.");
  }
  if (!targetUser) {
    throw new HttpError(404, "Target user not found.");
  }

  console.log(
    `[AdminService] Admin ${
      admin.id
    } initiating AI playlist generation for user ${
      targetUser.id
    }. Custom params: ${JSON.stringify(customParams)}`
  );

  const history = await prisma.history.findMany({
    where: {
      userId: targetUser.id,
      type: "PLAY",
      track: {
        isActive: true, // Only consider active tracks
        artist: { isActive: true }, // Only consider tracks from active artists
        duration: { gte: 60 }, // Minimum duration (e.g., 60 seconds)
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Consider last 100 played tracks
    include: {
      track: {
        select: {
          id: true,
          title: true,
          artist: { select: { artistName: true } },
          genres: { select: { genre: { select: { name: true, id: true } } } },
          tempo: true,
          mood: true,
          key: true,
          scale: true,
          danceability: true,
          energy: true,
        },
      },
    },
  });

  const playedTracksWithDetails: HistoryTrackDetail[] = history
    .map((h): HistoryTrackDetail | null => {
      if (!h.track) {
        return null;
      }
      return {
        id: h.track.id,
        title: h.track.title,
        artistName: h.track.artist?.artistName || "Unknown Artist",
        genres: h.track.genres.map((g) => g.genre.name),
        tempo: h.track.tempo,
        mood: h.track.mood,
        key: h.track.key,
        scale: h.track.scale,
        danceability: h.track.danceability,
        energy: h.track.energy,
      };
    })
    .filter((t): t is HistoryTrackDetail => t !== null);

  const distinctPlayedTracks = Array.from(
    new Map(playedTracksWithDetails.map((t) => [t.id, t])).values()
  ).slice(0, 30); // Use up to 30 distinct tracks for the prompt

  console.log(
    `[AdminService] Found ${distinctPlayedTracks.length} distinct playable tracks in user history for prompt generation.`
  );

  // Auto re-analyze missing features if necessary
  const tracksMissingFeatures = distinctPlayedTracks.filter(
    (track) =>
      !track.tempo ||
      !track.mood ||
      !track.key ||
      !track.scale ||
      !track.danceability ||
      !track.energy ||
      !track.genres ||
      track.genres.length === 0
  );

  if (tracksMissingFeatures.length > 0) {
    console.log(
      `[AdminService] Found ${tracksMissingFeatures.length} tracks with missing audio features. Attempting re-analysis...`
    );
    for (const trackToReanalyze of tracksMissingFeatures) {
      try {
        console.log(
          `[AdminService] Re-analyzing track: ${trackToReanalyze.title} (ID: ${trackToReanalyze.id})`
        );
        const reanalyzed = await trackService.reanalyzeTrackAudioFeatures(
          trackToReanalyze.id
        );
        // Update the track in distinctPlayedTracks with new features
        const index = distinctPlayedTracks.findIndex(
          (t) => t.id === reanalyzed.id
        );
        if (index !== -1 && reanalyzed) {
          distinctPlayedTracks[index] = {
            ...distinctPlayedTracks[index], // Keep original ID, title, artist, etc.
            genres: reanalyzed.genres?.map((g) => g.genre.name) || [],
            tempo: reanalyzed.tempo,
            mood: reanalyzed.mood,
            key: reanalyzed.key,
            scale: reanalyzed.scale,
            danceability: reanalyzed.danceability,
            energy: reanalyzed.energy,
          };
        }
      } catch (error) {
        console.error(
          `[AdminService] Failed to re-analyze track ${trackToReanalyze.id}:`,
          error
        );
        // Continue even if some re-analysis fails, AI can work with partial data
      }
    }
  }

  const MINIMUM_TRACKS_FOR_PERSONALIZED_PLAYLIST = 5;
  let generationMode: AIGeneratedPlaylistInput["generationMode"] =
    "userHistory";

  if (distinctPlayedTracks.length < MINIMUM_TRACKS_FOR_PERSONALIZED_PLAYLIST) {
    console.log(
      `[AdminService] Insufficient distinct tracks (${distinctPlayedTracks.length}) for personalized playlist. Switching to topGlobalTracks mode.`
    );
    generationMode = "topGlobalTracks";
  }

  const aiPlaylistInput: AIGeneratedPlaylistInput = {
    targetUserId: targetUser.id,
    generationMode,
    historyTracks: distinctPlayedTracks, // Send all, AI service will use if in userHistory mode
    // Use custom track count if provided, otherwise default (e.g., 20, can be set in ai.service or here)
    requestedTrackCount: customParams?.requestedTrackCount || 20,
    type: PlaylistType.SYSTEM, // Ensure correct type from DB schema
    customPromptKeywords: customParams?.customPromptKeywords,
    requestedPrivacy: PlaylistPrivacy.PUBLIC, 
  };

  // Log the input being sent to AI service
  console.log(
    "[AdminService] Input for aiService.createAIGeneratedPlaylist:",
    JSON.stringify(aiPlaylistInput, null, 2)
  );

  const newPlaylist = await aiService.createAIGeneratedPlaylist(
    aiPlaylistInput
  );

  if (!newPlaylist) {
    throw new Error("Failed to generate AI playlist");
  }

  console.log(
    `[AdminService] Successfully generated AI playlist ${newPlaylist.id} for user ${targetUser.id}`
  );
  return newPlaylist;
};

export const setAiPlaylistVisibilityForUser = async (
  adminExecutingId: string,
  playlistId: string,
  newVisibility: PlaylistPrivacy
): Promise<PrismaPlaylist> => {
  // Use PrismaPlaylist
  // 1. Verify Admin Privileges
  const adminUser = await prisma.user.findUnique({
    where: { id: adminExecutingId },
  });

  if (!adminUser) {
    throw new HttpError(404, "Admin user not found");
  }
  if (adminUser.role !== Role.ADMIN) {
    throw new HttpError(403, "Forbidden: Insufficient privileges");
  }

  // 2. Validate newVisibility value
  if (
    newVisibility !== PlaylistPrivacy.PUBLIC &&
    newVisibility !== PlaylistPrivacy.PRIVATE
  ) {
    throw new HttpError(
      400,
      "Invalid visibility value. Must be PUBLIC or PRIVATE."
    );
  }

  // 3. Find and Validate Playlist
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
  });

  if (!playlist) {
    throw new HttpError(404, "Playlist not found");
  }

  if (!playlist.isAIGenerated) {
    throw new HttpError(
      403,
      "Forbidden: Cannot change visibility for non-AI generated playlists."
    );
  }

  if (!playlist.userId) {
    throw new HttpError(
      400,
      "Cannot change visibility for system-wide AI playlists not assigned to a specific user."
    );
  }

  // 4. Update Playlist Privacy
  const updatedPlaylist = await prisma.playlist.update({
    where: { id: playlistId },
    data: { privacy: newVisibility },
  });

  console.log(
    `[AdminService] Updated AI playlist ${playlistId} visibility to ${newVisibility} for user ${playlist.userId}`
  );
  return updatedPlaylist;
};

export const getUserAiPlaylists = async (
  adminExecutingId: string,
  targetUserId: string,
  req: Request // For pagination options
): Promise<{ data: PrismaPlaylist[]; pagination: any }> => {
  // Use PrismaPlaylist[]
  // 1. Verify Admin Privileges
  const adminUser = await prisma.user.findUnique({
    where: { id: adminExecutingId },
  });

  if (!adminUser) {
    throw new HttpError(404, "Admin user not found");
  }
  if (adminUser.role !== Role.ADMIN) {
    throw new HttpError(403, "Forbidden: Insufficient privileges");
  }

  // 2. Verify Target User Exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    throw new HttpError(404, "Target user not found");
  }

  // 3. Query AI Playlists with pagination
  const where: Prisma.PlaylistWhereInput = {
    userId: targetUserId,
    type: PlaylistType.SYSTEM,  
    isAIGenerated: true,
  };

  const { search, sortBy, sortOrder } = req.query;

  if (search && typeof search === "string") {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.PlaylistOrderByWithRelationInput = { createdAt: "desc" };
  const validSortFields = [
    "name",
    "createdAt",
    "updatedAt",
    "totalTracks",
    "privacy",
  ];

  if (
    sortBy &&
    typeof sortBy === "string" &&
    validSortFields.includes(sortBy)
  ) {
    orderBy = { [sortBy]: sortOrder === "asc" ? "asc" : "desc" };
  }

  const playlistSelect = {
    id: true,
    name: true,
    description: true,
    coverUrl: true,
    privacy: true,
    type: true,
    isAIGenerated: true,
    totalTracks: true,
    totalDuration: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    lastGeneratedAt: true,
    tracks: {
      orderBy: { trackOrder: "asc" as const },
      select: {
        track: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            duration: true,
            artist: { select: { artistName: true } },
            album: { select: { title: true } },
            genres: { select: { genre: { select: { name: true } } } },
          },
        },
      },
    },
  };

  const options = {
    where,
    select: playlistSelect,
    orderBy,
  };

  // Ensure paginate function is available in this scope or imported
  // For this example, I am assuming `paginate` is correctly imported and works with Prisma.User model for other functions.
  // If `paginate` is specific to User or other models, you might need a more generic pagination helper or adjust this.
  const result = await paginate<PrismaPlaylist>(prisma.playlist, req, options);

  if (result.data.length > 0) {
    console.log(
      `[AdminService] Fetched ${result.data.length} AI playlists for user ${targetUserId}`
    );
  }
  return {
    data: result.data,
    pagination: result.pagination,
  };
};

// Add the new function here
export const getUserListeningHistoryDetails = async (
  adminExecutingId: string,
  targetUserId: string,
  req: Request // For pagination, filtering, and sorting options
): Promise<{ data: History[]; pagination: any }> => {
  // History is correctly imported now
  // 1. Verify Admin Privileges (Copy from previous functions)
  const adminUser = await prisma.user.findUnique({
    where: { id: adminExecutingId },
  });

  if (!adminUser) {
    throw new HttpError(404, "Admin user not found");
  }
  if (adminUser.role !== Role.ADMIN) {
    throw new HttpError(403, "Forbidden: Insufficient privileges");
  }

  // 2. Verify Target User Exists (Copy from previous functions)
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    throw new HttpError(404, "Target user not found");
  }

  // 3. Query Listening History with pagination, filtering, and sorting
  const {
    search,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const whereClause: Prisma.HistoryWhereInput = {
    userId: targetUserId,
    type: "PLAY", // Only fetch play history
  };

  if (search && typeof search === "string") {
    whereClause.track = {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { artist: { artistName: { contains: search, mode: "insensitive" } } },
        { album: { title: { contains: search, mode: "insensitive" } } },
      ],
    };
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (typeof startDate === "string" && startDate) {
    try {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      dateFilter.gte = startOfDay;
    } catch (e) {
      console.error("Invalid start date format:", startDate);
    }
  }
  if (typeof endDate === "string" && endDate) {
    try {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = endOfDay;
    } catch (e) {
      console.error("Invalid end date format:", endDate);
    }
  }

  if (dateFilter.gte || dateFilter.lte) {
    whereClause.createdAt = dateFilter;
  }

  // Basic sorting - expand later if needed
  let orderBy: Prisma.HistoryOrderByWithRelationInput = {
    [sortBy as string]: sortOrder as Prisma.SortOrder,
  };

  const historyQueryOptions = {
    where: whereClause,
    include: {
      track: {
        // Include track details
        select: {
          id: true,
          title: true,
          coverUrl: true,
          duration: true,
          artist: { select: { artistName: true, id: true } },
          album: { select: { title: true, id: true } },
          tempo: true,
          mood: true,
          key: true,
          scale: true,
          danceability: true,
          energy: true,
          // MODIFIED: Include genres details
          genres: {
            select: {
              genre: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy,
  };

  const historyRecords = await prisma.history.findMany(historyQueryOptions);

  console.log(
    `[AdminService DEBUG] getUserListeningHistoryDetails: Fetched ${historyRecords.length} history records for user ${targetUserId}.`
  );

  historyRecords.forEach((record, index) => {
    if (record.track) {
      console.log(
        `[AdminService DEBUG] getUserListeningHistoryDetails: Record ${
          index + 1
        } - Track ID: ${record.track.id} - Audio Features from DB:`,
        {
          title: record.track.title, // For context
          tempo: record.track.tempo,
          mood: record.track.mood,
          key: record.track.key,
          scale: record.track.scale,
          danceability: record.track.danceability,
          energy: record.track.energy,
        }
      );
    } else {
      console.log(
        `[AdminService DEBUG] getUserListeningHistoryDetails: Record ${
          index + 1
        } has no associated track.`
      );
    }
  });

  const totalRecords = await prisma.history.count({
    where: historyQueryOptions.where,
  });

  return {
    data: historyRecords,
    pagination: {
      total: totalRecords,
      pageSize: Object.keys(historyQueryOptions.include.track).length,
      currentPage: 1, // Assuming 1-based indexing
    },
  };
};

// --- Label Registration Request Management (Admin) ---

/**
 * Admin gets all label registration requests.
 */
export const getAllLabelRegistrations = async (req: Request) => {
  const { search, status, sortBy, sortOrder } = req.query;

  const whereClause: Prisma.LabelRegistrationRequestWhereInput = {};

  if (search && typeof search === "string") {
    whereClause.OR = [
      { requestedLabelName: { contains: search, mode: "insensitive" } },
      {
        requestingArtist: {
          artistName: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  if (
    status &&
    typeof status === "string" &&
    Object.values(RequestStatus).includes(status as RequestStatus)
  ) {
    whereClause.status = status as RequestStatus;
  } else {
    // Default to PENDING if no status or invalid status is provided by admin panel
    // This might need adjustment based on how admin panel filters are designed
    // For now, let's fetch all non-archived or allow flexible status filtering
    // If status is explicitly empty or "ALL", don't filter by status
    if (status && status !== "ALL") {
      whereClause.status = status as RequestStatus;
    } else if (!status) {
      // Default to PENDING if status is not provided at all
      whereClause.status = RequestStatus.PENDING;
    }
  }

  const orderByClause: Prisma.LabelRegistrationRequestOrderByWithRelationInput =
    {};
  const validSortKeys = [
    "submittedAt",
    "requestedLabelName",
    "status",
  ] as const;
  type SortKey = (typeof validSortKeys)[number];
  const key = sortBy as SortKey;
  const order = sortOrder === "desc" ? "desc" : "asc";

  if (sortBy && typeof sortBy === "string" && validSortKeys.includes(key)) {
    orderByClause[key] = order;
  } else {
    orderByClause.submittedAt = "desc"; // Default sort
  }

  const result = await paginate<LabelRegistrationRequest>(
    prisma.labelRegistrationRequest,
    req,
    {
      where: whereClause,
      include: {
        requestingArtist: {
          select: {
            id: true,
            artistName: true,
            avatar: true,
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            name: true,
          },
        },
        createdLabel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: orderByClause,
    }
  );

  return {
    data: result.data,
    pagination: result.pagination,
  };
};

/**
 * Get a specific label registration request by ID.
 */
export const getLabelRegistrationById = async (registrationId: string) => {
  const request = await prisma.labelRegistrationRequest.findUnique({
    where: { id: registrationId },
    include: {
      requestingArtist: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
          user: { select: { email: true, name: true } }, // Include artist's user email for contact
        },
      },
      reviewedByAdmin: {
        select: {
          id: true,
          name: true,
        },
      },
      createdLabel: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  if (!request) {
    throw { status: 404, message: "Label registration request not found." };
  }
  return request;
};

/**
 * Admin approves a label registration request.
 */
export const approveLabelRegistration = async (
  adminUserId: string,
  registrationId: string
) => {
  const registrationRequest = await prisma.labelRegistrationRequest.findUnique({
    where: { id: registrationId },
    include: { requestingArtist: true }, // Need artist profile to update it
  });

  if (!registrationRequest) {
    throw { status: 404, message: "Label registration request not found." };
  }

  if (registrationRequest.status !== RequestStatus.PENDING) {
    throw {
      status: 400,
      message: `Request is already ${registrationRequest.status.toLowerCase()}.`,
    };
  }

  // Transaction to ensure all operations succeed or fail together
  return prisma.$transaction(async (tx) => {
    let targetLabelId: string;
    let newLabelWasActuallyCreated = false;
    let finalLabelName = registrationRequest.requestedLabelName;

    // 1. Check if the label with the requested name already exists
    const existingLabel = await tx.label.findUnique({
      where: { name: registrationRequest.requestedLabelName },
      select: { id: true, name: true },
    });

    if (existingLabel) {
      // Label already exists, use its ID
      targetLabelId = existingLabel.id;
      finalLabelName = existingLabel.name; // Use the existing, potentially cased, name
    } else {
      // Label does not exist, create a new one
      const newLabelEntry = await tx.label.create({
        data: {
          name: registrationRequest.requestedLabelName,
          description: registrationRequest.requestedLabelDescription,
          logoUrl: registrationRequest.requestedLabelLogoUrl,
        },
        select: { id: true, name: true }, // Select only id and name
      });
      targetLabelId = newLabelEntry.id;
      finalLabelName = newLabelEntry.name;
      newLabelWasActuallyCreated = true;
    }

    // 2. Update the ArtistProfile with the new or existing labelId
    await tx.artistProfile.update({
      where: { id: registrationRequest.requestingArtistId },
      data: { labelId: targetLabelId },
    });

    // 3. Update the LabelRegistrationRequest
    const labelRegistrationUpdateData: Prisma.LabelRegistrationRequestUpdateInput =
      {
        status: RequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByAdmin: { connect: { id: adminUserId } }, // Correct Prisma syntax
      };

    if (newLabelWasActuallyCreated) {
      labelRegistrationUpdateData.createdLabel = {
        connect: { id: targetLabelId },
      }; // Correct Prisma syntax
    }

    const updatedRequest = await tx.labelRegistrationRequest.update({
      where: { id: registrationId },
      data: labelRegistrationUpdateData,
    });

    // 4. Notify the artist
    let approvalMessage: string;
    if (newLabelWasActuallyCreated) {
      approvalMessage = `Congratulations! Your request to register the label "${finalLabelName}" has been approved, and the label has been created.`;
    } else {
      approvalMessage = `Congratulations! Your request concerning the label "${finalLabelName}" has been approved. You are now associated with this existing label.`;
    }

    if (registrationRequest.requestingArtist.userId) {
      const notificationData = {
        data: {
          recipientType: RecipientType.ARTIST, // Changed from ARTIST to USER as per other notifications
          userId: registrationRequest.requestingArtist.userId, // Target the User for socket/notification
          type: NotificationType.LABEL_REGISTRATION_APPROVED,
          message: approvalMessage,
          artistId: registrationRequest.requestingArtistId, // Target artist profile
          isRead: false,
        },
        select: {
          id: true,
          type: true,
          message: true,
          recipientType: true,
          isRead: true,
          createdAt: true,
          userId: true, // For socket payload
        },
      };
      const notification = await tx.notification.create(notificationData);

      const io = getIO();
      const targetUserSocketId = getUserSockets().get(
        registrationRequest.requestingArtist.userId
      );
      if (targetUserSocketId) {
        io.to(targetUserSocketId).emit("notification", {
          // Explicitly list properties for the socket payload from the notification object
          id: notification.id,
          type: notification.type,
          message: notification.message,
          recipientType: notification.recipientType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
          // Add label-specific info
          labelName: finalLabelName,
          labelId: targetLabelId,
          // userId: notification.userId, // Already known by the user receiving it, but can include if needed
        });
        console.log(
          `[Socket Emit][AdminService] Sent LABEL_REGISTRATION_APPROVED (Label: ${finalLabelName}) to user ${registrationRequest.requestingArtist.userId} via socket ${targetUserSocketId}`
        );
      } else {
        console.log(
          `[Socket Emit][AdminService] User ${registrationRequest.requestingArtist.userId} (for Label: ${finalLabelName}) not connected for LABEL_REGISTRATION_APPROVED.`
        );
      }
    }

    // Fetch full label details to return, using the correct variable name for the created/found label
    const finalLabelDetails = await tx.label.findUnique({
      where: { id: targetLabelId },
      select: labelSelect,
    });

    return { updatedRequest, label: finalLabelDetails }; // Return label instead of newLabel
  });
};

export const rejectLabelRegistration = async (
  adminUserId: string,
  registrationId: string,
  rejectionReason: string
) => {
  const errors = runValidations([
    validateField(rejectionReason, "rejectionReason", {
      required: true,
      minLength: 5,
      maxLength: 500,
    }),
  ]);
  if (errors.length > 0) {
    console.warn(
      `[AdminService] Validation failed for rejection reason for request ${registrationId}, but proceeding with rejection.`
    );
    // Potentially throw new Error(`Validation failed: ${errors.join(', ')}`); if strict validation is required before proceeding
  }

  const registrationRequest = await prisma.labelRegistrationRequest.findUnique({
    where: { id: registrationId },
    // No need to include requestingArtist here if only updating the request itself before notification logic
  });

  if (!registrationRequest) {
    throw { status: 404, message: "Label registration request not found." };
  }

  if (registrationRequest.status !== RequestStatus.PENDING) {
    console.warn(
      `[AdminService] Attempting to reject a request that is already ${registrationRequest.status.toLowerCase()}. ID: ${registrationId}`
    );
    // Allow proceeding to ensure consistent state if somehow a request was processed without full completion.
    // Or throw: throw { status: 400, message: `Request is already ${registrationRequest.status.toLowerCase()}.` };
  }

  const updatedRequest = await prisma.labelRegistrationRequest.update({
    where: { id: registrationId },
    data: {
      status: RequestStatus.REJECTED,
      rejectionReason: rejectionReason,
      reviewedAt: new Date(),
      reviewedByAdminId: adminUserId,
    },
    select: {
      id: true,
      requestedLabelName: true,
      requestingArtistId: true, // This is the ArtistProfile.id
      requestingArtist: { select: { userId: true } }, // Need the userId for socket targeting
    },
  });
  console.log(
    `[AdminService] Updated LabelRegistrationRequest ID: ${updatedRequest.id} to REJECTED`
  );

  // Notify the artist
  // Check if the artist has an associated user account for socket targeting
  if (updatedRequest.requestingArtist?.userId) {
    const artistUserIdForSocketTargeting =
      updatedRequest.requestingArtist.userId;
    const notificationData = {
      data: {
        recipientType: RecipientType.ARTIST, // Target the ArtistProfile
        artistId: updatedRequest.requestingArtistId, // The ID of the ArtistProfile
        type: NotificationType.LABEL_REGISTRATION_REJECTED,
        message: `We regret to inform you that your request to register the label "${updatedRequest.requestedLabelName}" has been rejected. Reason: ${rejectionReason}`,
        userId: artistUserIdForSocketTargeting, // Keep for socket targeting
        isRead: false,
      },
      select: {
        id: true,
        type: true,
        message: true,
        recipientType: true,
        isRead: true,
        createdAt: true,
        artistId: true, // Ensure artistId is selected for socket payload
      },
    };

    prisma.notification
      .create(notificationData)
      .then((createdNotification) => {
        const io = getIO();
        const targetSocketId = getUserSockets().get(
          artistUserIdForSocketTargeting
        );
        if (targetSocketId) {
          io.to(targetSocketId).emit("notification", {
            ...createdNotification,
            createdAt: createdNotification.createdAt.toISOString(),
            rejectionReason: rejectionReason,
            labelName: updatedRequest.requestedLabelName,
          });
          console.log(
            `[Socket Emit] Sent LABEL_REGISTRATION_REJECTED (to ArtistProfile ${createdNotification.artistId}) to user ${artistUserIdForSocketTargeting} via socket ${targetSocketId}`
          );
        } else {
          console.log(
            `[Socket Emit] User ${artistUserIdForSocketTargeting} (for ArtistProfile ${createdNotification.artistId}) not connected for LABEL_REGISTRATION_REJECTED.`
          );
        }
      })
      .catch((err) => {
        console.error(
          `[AdminService] Failed to create or emit rejection notification for user ${artistUserIdForSocketTargeting} (Request ID: ${updatedRequest.id}):`,
          err
        );
      });
  } else {
    console.warn(
      `[AdminService] Cannot send rejection notification for request ${updatedRequest.id} - requesting artist has no associated user ID for socket targeting.`
    );
  }

  return {
    message: `Label registration request ${updatedRequest.id} rejected successfully.`,
    rejectedRequestId: updatedRequest.id,
  };
};
// --- End Label Registration Request Management (Admin) ---

// START NEW FUNCTION TO GET REQUESTS FROM ArtistRequest TABLE
export const getPendingArtistRoleRequests = async (req: Request) => {
  const { search, startDate, endDate, status } = req.query;

  const where: Prisma.ArtistRequestWhereInput = {
    status: RequestStatus.PENDING, // Default to PENDING
  };

  if (
    status &&
    typeof status === "string" &&
    status !== "ALL" &&
    Object.values(RequestStatus).includes(status as RequestStatus)
  ) {
    where.status = status as RequestStatus;
  } else if (status === "ALL") {
    // If status is 'ALL', remove the default PENDING filter
    delete where.status;
  }

  const andConditions: Prisma.ArtistRequestWhereInput[] = [];

  if (search && typeof search === "string" && search.trim()) {
    const trimmedSearch = search.trim();
    andConditions.push({
      OR: [
        { artistName: { contains: trimmedSearch, mode: "insensitive" } },
        { user: { name: { contains: trimmedSearch, mode: "insensitive" } } },
        { user: { email: { contains: trimmedSearch, mode: "insensitive" } } },
        {
          requestedLabelName: { contains: trimmedSearch, mode: "insensitive" },
        },
      ],
    });
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  // Assuming ArtistRequest has a submission timestamp, e.g., 'createdAt' or 'submittedAt'
  // Let's check the schema; ArtistRequest has no direct timestamp.
  // We might need to sort by ID or add a timestamp to the model if date filtering is required.
  // For now, date filtering will be omitted for ArtistRequest until schema is confirmed/updated.

  if (andConditions.length > 0) {
    if (where.AND) {
      if (Array.isArray(where.AND)) {
        where.AND.push(...andConditions);
      } else {
        where.AND = [where.AND, ...andConditions];
      }
    } else {
      where.AND = andConditions;
    }
  }

  // Define a select object for ArtistRequest, similar to artistRequestSelect for ArtistProfile
  const artistRoleRequestSelect = {
    id: true,
    artistName: true,
    bio: true, // Include bio if needed for list view previews
    status: true,
    requestedLabelName: true,
    // Add any other fields from ArtistRequest model you want to display in the list
    user: {
      // Include basic user info
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    },
    // If ArtistRequest model had a submission date like 'createdAt', select it here
    // createdAt: true,
  };

  const options = {
    where,
    select: artistRoleRequestSelect,
    // orderBy: { createdAt: 'desc' }, // If using a createdAt field
    orderBy: { id: "desc" }, // Fallback sorting if no date field
  };

  // Explicitly type the paginate result if item type is different from Prisma.ArtistRequestGetPayload
  // For now, assuming the select matches a structure we can call 'ArtistRequestListItem' or similar
  const result = await paginate<Prisma.ArtistRequestGetPayload<typeof options>>(
    prisma.artistRequest,
    req,
    options
  );

  return {
    // Ensure the returned data structure matches what the frontend expects
    // The old 'requests' field might be expected.
    requests: result.data,
    pagination: result.pagination,
  };
};
// END NEW FUNCTION

// --- Data Export Functions ---
export const extractTrackAndArtistData = async () => {
  try {
    // Get artists with basic info
    const artists = await prisma.artistProfile.findMany({
      where: {
        isActive: true,
        isVerified: true,
      },
      select: {
        id: true,
        artistName: true,
        bio: true,
        monthlyListeners: true,
        createdAt: true,
        isVerified: true,
        userId: true,
        label: {
          select: {
            name: true,
          },
        },
        genres: {
          select: {
            genre: {
              select: {
                name: true,
              },
            },
          },
        },
        tracks: {
          select: {
            id: true,
          },
        },
        user: {
          select: {
            email: true,
            username: true,
            name: true,
          },
        },
        avatar: true,
        socialMediaLinks: true,
      },
      orderBy: {
        artistName: "asc",
      },
    });

    // Get albums with detailed info
    const albums = await prisma.album.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        releaseDate: true,
        duration: true,
        totalTracks: true,
        type: true,
        createdAt: true,
        artist: {
          select: {
            id: true,
            artistName: true,
          },
        },
        label: {
          select: {
            id: true,
            name: true,
          },
        },
        genres: {
          select: {
            genre: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          artist: {
            artistName: "asc",
          },
        },
        {
          releaseDate: "desc",
        },
      ],
    });

    // Get tracks with detailed info
    const tracks = await prisma.track.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        duration: true,
        releaseDate: true,
        coverUrl: true,
        audioUrl: true,
        label: {
          select: {
            name: true,
          },
        },
        playCount: true,
        tempo: true,
        mood: true,
        key: true,
        scale: true,
        danceability: true,
        energy: true,
        artist: {
          select: {
            artistName: true,
          },
        },
        album: {
          select: {
            id: true,
            title: true,
            type: true,
            releaseDate: true,
            coverUrl: true,
            totalTracks: true,
            duration: true,
          },
        },
        genres: {
          select: {
            genre: {
              select: {
                name: true,
              },
            },
          },
        },
        featuredArtists: {
          select: {
            artistProfile: {
              select: {
                artistName: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          artist: {
            artistName: "asc",
          },
        },
        {
          releaseDate: "desc",
        },
      ],
    });

    // Transform data for easier Excel processing
    const artistsForExport = artists.map((artist) => ({
      id: artist.id,
      artistName: artist.artistName,
      bio: artist.bio || "",
      userId: artist.userId || "",
      monthlyListeners: artist.monthlyListeners,
      verified: artist.isVerified,
      label: artist.label?.name || "",
      genres: artist.genres.map((g) => g.genre.name).join(", "),
      trackCount: artist.tracks.length,
      createdAt: artist.createdAt.toISOString().split("T")[0],
      userEmail: artist.user?.email || "",
      userUsername: artist.user?.username || "",
      userName: artist.user?.name || "",
      avatar: artist.avatar || "",
      socialMediaLinks: artist.socialMediaLinks
        ? JSON.stringify(artist.socialMediaLinks)
        : "",
    }));

    // Format albums for export
    const albumsForExport = albums.map((album) => ({
      id: album.id,
      title: album.title,
      artistName: album.artist.artistName,
      artistId: album.artist.id,
      releaseDate: album.releaseDate.toISOString().split("T")[0],
      albumType: album.type,
      totalTracks: album.totalTracks,
      duration: album.duration,
      labelName: album.label?.name || "",
      coverUrl: album.coverUrl || "",
      genres: album.genres.map((g) => g.genre.name).join(", "),
      createdAt: album.createdAt.toISOString().split("T")[0],
    }));

    const tracksForExport = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist.artistName,
      album: track.album?.title || "(Single)",
      albumId: track.album?.id || "",
      albumType: track.album?.type || "SINGLE",
      albumReleaseDate: track.album?.releaseDate
        ? track.album.releaseDate.toISOString().split("T")[0]
        : "",
      albumTotalTracks: track.album?.totalTracks || 1,
      albumDuration: track.album?.duration || track.duration,
      coverUrl: track.coverUrl || track.album?.coverUrl || "",
      audioUrl: track.audioUrl,
      labelName: track.label?.name || "",
      featuredArtistNames:
        track.featuredArtists
          ?.map((fa) => fa.artistProfile.artistName)
          .join(", ") || "",
      duration: track.duration,
      releaseDate: track.releaseDate.toISOString().split("T")[0],
      playCount: track.playCount,
      tempo: track.tempo || null,
      mood: track.mood || "",
      key: track.key || "",
      scale: track.scale || "",
      danceability: track.danceability || null,
      energy: track.energy || null,
      genres: track.genres.map((g) => g.genre.name).join(", "),
    }));

    return {
      artists: artistsForExport,
      albums: albumsForExport,
      tracks: tracksForExport,
      exportDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error extracting track and artist data:", error);
    throw error;
  }
};
// --- End Data Export Functions ---

// --- New function to fix inconsistent track types in albums ---
export const fixAlbumTrackTypeConsistency = async () => {
  try {
    console.log("[Admin Service] Starting album track type consistency fix...");

    // Find all albums
    const albums = await prisma.album.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        tracks: {
          select: {
            id: true,
            type: true,
          },
        },
      },
    });

    console.log(
      `[Admin Service] Found ${albums.length} albums to check for track type consistency`
    );

    let fixedAlbums = 0;
    let fixedTracks = 0;

    // Process each album
    for (const album of albums) {
      const inconsistentTracks = album.tracks.filter(
        (track) => track.type !== album.type
      );

      if (inconsistentTracks.length > 0) {
        // Fix inconsistent tracks
        await prisma.track.updateMany({
          where: {
            albumId: album.id,
            type: { not: album.type },
          },
          data: { type: album.type },
        });

        fixedAlbums++;
        fixedTracks += inconsistentTracks.length;
        console.log(
          `[Admin Service] Fixed ${inconsistentTracks.length} tracks in album "${album.title}" (ID: ${album.id})`
        );
      }
    }

    return {
      success: true,
      message: `Fixed track types in ${fixedAlbums} albums, updating ${fixedTracks} tracks to match their album types.`,
      fixedAlbums,
      fixedTracks,
    };
  } catch (error) {
    console.error(
      "[Admin Service] Error fixing album track type consistency:",
      error
    );
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      error: true,
    };
  }
};

export const removeTrackFromSystemPlaylist = async (
  adminExecutingId: string,
  playlistId: string,
  trackToRemoveId: string
): Promise<PrismaPlaylist> => {
  // 1. Verify Admin Privileges
  const adminUser = await prisma.user.findUnique({
    where: { id: adminExecutingId },
  });

  if (!adminUser) {
    throw new HttpError(404, "Admin user not found");
  }
  if (adminUser.role !== Role.ADMIN) {
    throw new HttpError(403, "Forbidden: Insufficient privileges");
  }

  // 2. Find the playlist to ensure it exists and is an AI-generated playlist
  const playlistDetails = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: {
      id: true,
      isAIGenerated: true,
      // Select 'tracks' relation to find the PlaylistTrack entry ID
      tracks: {
        where: { trackId: trackToRemoveId },
        select: {
          id: true, // This is the ID of the PlaylistTrack (join table) entry
        },
      },
    },
  });

  if (!playlistDetails) {
    throw new HttpError(404, "Playlist not found");
  }

  if (!playlistDetails.isAIGenerated) {
    throw new HttpError(
      403,
      "Forbidden: Can only remove tracks from AI-generated system playlists using this method."
    );
  }

  const playlistTrackEntry =
    playlistDetails.tracks.length > 0 ? playlistDetails.tracks[0] : null;

  if (!playlistTrackEntry) {
    throw new HttpError(
      404,
      `Track ${trackToRemoveId} not found in playlist ${playlistId}`
    );
  }

  // 3. Delete the PlaylistTrack entry and update playlist aggregates in a transaction
  const updatedPlaylist = await prisma.$transaction(async (tx) => {
    // Delete the association (PlaylistTrack record)
    await tx.playlistTrack.delete({
      where: {
        id: playlistTrackEntry.id, // Use the ID of the PlaylistTrack entry
      },
    });

    // Recalculate totalTracks and totalDuration
    const remainingPlaylistTracksData = await tx.playlistTrack.findMany({
      where: { playlistId: playlistId },
      include: { track: { select: { duration: true } } },
    });

    const newTotalDuration = remainingPlaylistTracksData.reduce(
      (sum, pt) => sum + (pt.track?.duration || 0),
      0
    );
    const newTotalTracks = remainingPlaylistTracksData.length;

    // Update the playlist metadata
    const finalUpdatedPlaylist = await tx.playlist.update({
      where: { id: playlistId },
      data: {
        totalTracks: newTotalTracks,
        totalDuration: newTotalDuration,
        updatedAt: new Date(),
      },
      // Select clause consistent with getUserAiPlaylists for frontend updates
      select: {
        id: true,
        name: true,
        description: true,
        coverUrl: true,
        privacy: true,
        type: true,
        isAIGenerated: true,
        totalTracks: true,
        totalDuration: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        lastGeneratedAt: true,
        tracks: {
          take: 3, // Or adjust as needed for preview modal updates
          orderBy: { trackOrder: "asc" as const },
          select: {
            track: {
              select: {
                id: true,
                title: true,
                coverUrl: true,
                artist: { select: { artistName: true } },
              },
            },
          },
        },
      },
    });
    return finalUpdatedPlaylist;
  });

  // Optional: Re-order PlaylistTracks if `trackOrder` is used and needs to be dense.
  // This step is omitted for now for simplicity. If PlaylistTrack has a 'trackOrder' field,
  // you might want to update the order of subsequent tracks. Example:
  // const remainingTracksInOrder = await prisma.playlistTrack.findMany({
  //   where: { playlistId },
  //   orderBy: { trackOrder: 'asc' },
  //   select: { id: true }
  // });
  // await prisma.$transaction(
  //   remainingTracksInOrder.map((pt, index) =>
  //     prisma.playlistTrack.update({
  //       where: { id: pt.id },
  //       data: { trackOrder: index + 1 } // Re-number starting from 1
  //     })
  //   )
  // );

  console.log(
    `[AdminService] Track ${trackToRemoveId} removed from playlist ${playlistId} by admin ${adminExecutingId}`
  );
  return updatedPlaylist;
};

export const deleteSystemPlaylist = async (
  playlistId: string,
  adminUserId: string
): Promise<void> => {
  // 1. Verify admin user
  const adminUser = await prisma.user.findUnique({
    where: { id: adminUserId },
  });

  if (!adminUser || adminUser.role !== Role.ADMIN) {
    throw new HttpError(
      403,
      "Forbidden: Admin access required to delete system playlists."
    );
  }

  // 2. Find the playlist
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: { tracks: true }, // Include tracks to check or for manual deletion if cascade is not set
  });

  if (!playlist) {
    throw new HttpError(404, `Playlist with ID ${playlistId} not found.`);
  }

  // 3. Check if it's a deletable type (e.g., SYSTEM or AI_GENERATED by an admin)
  // You might want to adjust this logic based on your specific requirements for which playlists admins can delete.
  if (
    playlist.type !== PlaylistType.SYSTEM &&
    !playlist.isAIGenerated // Corrected check: not SYSTEM type AND not AI-generated
  ) {
    // Alternatively, you could check if playlist.userId === adminUserId if AI playlists are tied to the admin who generated them.
    throw new HttpError(
      403,
      `Forbidden: Playlist with ID ${playlistId} is not a deletable system playlist and is not AI-generated.`
    );
  }

  // If not using onDelete: Cascade for PlaylistTrack, you'd delete tracks here:
  // await prisma.playlistTrack.deleteMany({ where: { playlistId: playlistId } });

  // 4. Delete the playlist
  await prisma.playlist.delete({
    where: { id: playlistId },
  });

  console.log(
    `[Admin Service] System Playlist ${playlistId} deleted by admin ${adminUserId}`
  );
};

// --- Utility Functions (if any) or End of File ---
