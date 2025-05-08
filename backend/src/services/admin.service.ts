import {
  Role,
  ClaimStatus,
  Prisma,
  NotificationType,
  RecipientType,
  AlbumType,
  PlaylistPrivacy,
  User as PrismaUser, // Alias User to avoid conflict
  Playlist as PrismaPlaylist, // Alias Playlist
  ArtistProfile,
  History, // Add History import
  PlaylistType,
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
} from "../utils/prisma-selects";
import { paginate, toBooleanValue } from "../utils/handle-utils";
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
import { uploadFile } from "./upload.service";
import * as mm from "music-metadata";
import { Essentia, EssentiaWASM } from "essentia.js";
import { MPEGDecoder, MPEGDecodedAudio } from "mpg123-decoder";
import { getOrCreateArtistProfile } from "./artist.service";
import { faker } from "@faker-js/faker";
import * as aiService from "./ai.service"; // Assuming ai.service.ts exports its functions
import { HttpError } from "../utils/errors"; // Assuming you have a custom error handler

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
  let request = await prisma.artistProfile.findUnique({
    where: { id },
    select: artistRequestDetailsSelect,
  });

  // Nếu không tìm thấy artist profile, thử tìm bằng userId
  if (!request) {
    request = await prisma.artistProfile.findFirst({
      where: {
        userId: id,
        verificationRequestedAt: { not: null },
      },
      select: artistRequestDetailsSelect,
    });
  }

  if (!request) {
    throw new Error("Request not found");
  }

  return request;
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

  if (userToDelete.email) {
    try {
      const userName = userToDelete.name || userToDelete.username || "User";
      const emailOptions = emailService.createAccountDeletedEmail(
        userToDelete.email,
        userName,
        reason
      );
      emailService
        .sendEmail(emailOptions)
        .catch((err) =>
          console.error(
            "[Async Email Error] Failed to send account deletion email:",
            err
          )
        );
    } catch (syncError) {
      console.error(
        "[Email Setup Error] Failed to create deletion email options:",
        syncError
      );
    }
  }

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

export const approveArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false,
    },
    select: {
      id: true,
      userId: true,
      requestedLabelName: true,
      user: { select: { id: true, email: true, name: true, username: true } },
    },
  });

  if (!artistProfile) {
    throw new Error("Artist request not found, already verified, or rejected.");
  }

  const requestedLabelName = artistProfile.requestedLabelName;
  const userForNotification = artistProfile.user;

  const updatedProfile = await prisma.$transaction(async (tx) => {
    const verifiedProfile = await tx.artistProfile.update({
      where: { id: requestId },
      data: {
        role: Role.ARTIST,
        isVerified: true,
        verifiedAt: new Date(),
        verificationRequestedAt: null,
        requestedLabelName: null,
      },
      select: { id: true },
    });

    let finalLabelId: string | null = null;

    if (requestedLabelName) {
      const labelRecord = await tx.label.upsert({
        where: { name: requestedLabelName },
        update: {},
        create: { name: requestedLabelName },
        select: { id: true },
      });
      finalLabelId = labelRecord.id;
    }

    if (finalLabelId) {
      await tx.artistProfile.update({
        where: { id: verifiedProfile.id },
        data: {
          labelId: finalLabelId,
        },
      });
    }

    const finalProfile = await tx.artistProfile.findUnique({
      where: { id: verifiedProfile.id },
      include: {
        user: { select: userSelect },
        label: true,
      },
    });

    if (!finalProfile) {
      throw new Error("Failed to retrieve updated profile after transaction.");
    }

    return finalProfile;
  });

  if (userForNotification) {
    prisma.notification
      .create({
        data: {
          type: "ARTIST_REQUEST_APPROVE",
          message: "Your request to become an Artist has been approved!",
          recipientType: "USER",
          userId: userForNotification.id,
          artistId: updatedProfile.id,
        },
      })
      .catch((err) =>
        console.error(
          "[Async Notify Error] Failed to create approval notification:",
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
              "[Async Email Error] Failed to send approval email:",
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
      "[Approve Request] User data missing for notification/email."
    );
  }

  return {
    ...updatedProfile,
    hasPendingRequest: false,
  };
};

export const rejectArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false,
    },
    include: {
      user: { select: userSelect },
    },
  });

  if (!artistProfile) {
    throw new Error("Artist request not found, already verified, or rejected.");
  }

  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  return {
    user: artistProfile.user,
    hasPendingRequest: false,
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
    prisma.artistProfile.count({
      where: { verificationRequestedAt: { not: null }, isVerified: false },
    }),
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
        name: "Gemini AI (Playlists)",
        status: "Available",
        message: `API Key valid. Configured model: ${modelName}`,
      });
    } catch (error: any) {
      console.error("[System Status] Gemini AI check failed:", error);
      statuses.push({
        name: "Gemini AI (Playlists)",
        status: "Issue",
        message: error.message || "Failed to initialize or connect to Gemini",
      });
    }
  } else {
    statuses.push({
      name: "Gemini AI (Playlists)",
      status: "Disabled",
      message: "GEMINI_API_KEY not set",
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

export const getCacheStatus = async (): Promise<{ enabled: boolean }> => {
  const useCache = process.env.USE_REDIS_CACHE === "true";
  let redisConnected = false;
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.ping();
      redisConnected = true;
    } catch (error) {
      console.error("Redis ping failed:", error);
      redisConnected = false;
    }
  }
  return { enabled: useCache && redisConnected };
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

export const updateCacheStatus = async (
  enabled?: boolean
): Promise<{ enabled: boolean }> => {
  try {
    const envPath =
      process.env.NODE_ENV === "production"
        ? path.resolve(process.cwd(), "../.env")
        : path.resolve(process.cwd(), ".env");

    if (!fs.existsSync(envPath)) {
      console.error(`.env file not found at ${envPath}`);
      throw new Error("Environment file not found.");
    }

    const currentStatus = process.env.USE_REDIS_CACHE === "true";

    if (enabled === undefined) {
      return { enabled: currentStatus };
    }

    if (enabled === currentStatus) {
      console.log(
        `[Redis] Cache status already ${
          enabled ? "enabled" : "disabled"
        }. No change needed.`
      );
      return { enabled };
    }

    let envContent = fs.readFileSync(envPath, "utf8");
    const regex = /USE_REDIS_CACHE=.*/;
    const newLine = `USE_REDIS_CACHE=${enabled}`;

    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `
${newLine}`;
    }
    fs.writeFileSync(envPath, envContent);

    process.env.USE_REDIS_CACHE = String(enabled);
    console.log(
      `[Redis] Cache ${
        enabled ? "enabled" : "disabled"
      }. Restart might be required for full effect.`
    );

    const {
      client: dynamicRedisClient,
    } = require("../middleware/cache.middleware");

    if (enabled && dynamicRedisClient && !dynamicRedisClient.isOpen) {
      try {
        await dynamicRedisClient.connect();
        console.log("[Redis] Connected successfully.");
      } catch (connectError) {
        console.error(
          "[Redis] Failed to connect after enabling:",
          connectError
        );
      }
    } else if (!enabled && dynamicRedisClient && dynamicRedisClient.isOpen) {
      try {
        await dynamicRedisClient.disconnect();
        console.log("[Redis] Disconnected successfully.");
      } catch (disconnectError) {
        console.error(
          "[Redis] Failed to disconnect after disabling:",
          disconnectError
        );
      }
    }

    return { enabled };
  } catch (error) {
    console.error("Error updating cache status:", error);
    const currentStatusAfterError = process.env.USE_REDIS_CACHE === "true";
    throw new Error(
      `Failed to update cache status. Current status: ${currentStatusAfterError}`
    );
  }
};

export const updateAIModel = async (model?: string) => {
  try {
    const validModels = [
      "gemini-2.5-flash-preview-04-17",
      "gemini-2.5-pro-preview-03-25",
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
    status: ClaimStatus.PENDING, // Only fetch pending requests
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
  if (
    claimRequest.artistProfile.userId ||
    claimRequest.artistProfile.isVerified
  ) {
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
    console.log(`Resampling audio from ${originalSampleRate} Hz to 44100 Hz for RhythmExtractor2013`);
    const targetSampleRate = 44100;
    const resampleRatio = targetSampleRate / originalSampleRate;
    const resampledLength = Math.floor(monoChannel.length * resampleRatio);
    const resampledBuffer = new Float32Array(resampledLength);

    for (let i = 0; i < resampledLength; i++) {
      // Calculate the position in the original buffer
      const originalPos = i / resampleRatio;
      const originalPosFloor = Math.floor(originalPos);
      const originalPosCeil = Math.min(originalPosFloor + 1, monoChannel.length - 1);
      const fraction = originalPos - originalPosFloor;

      // Linear interpolation between the two closest samples
      resampledBuffer[i] = 
        monoChannel[originalPosFloor] * (1 - fraction) + 
        monoChannel[originalPosCeil] * fraction;
    }

    console.log(`Resampled audio to ${resampledBuffer.length} samples at 44100 Hz`);
    return resampledBuffer;
    // Explicit return to satisfy linter - should never reach here due to earlier returns
  } catch (error) {
    console.error("Error during MP3 decoding or processing:", error);
    return null; // Return null if any error occurs
  }
}

// Helper function to determine genre based on audio analysis
async function determineGenresFromAudioAnalysis(
  tempo: number | null,
  mood: string | null,
  key: string | null,
  scale: string | null,
  energy?: number | null,
  danceability?: number | null,
  duration?: number | null,
  title?: string | null,
  artistName?: string | null
): Promise<string[]> {
  const genres = await prisma.genre.findMany();
  const genreMap = new Map(genres.map((g) => [g.name.toLowerCase(), g.id]));
  const selectedGenres: string[] = [];
  const safeEnergy = typeof energy === "number" ? energy : null;

  // Detect Vietnamese song via diacritics
  const isVietnameseSong =
    (title &&
      title.match(
        /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i
      ) !== null) ||
    (artistName &&
      artistName.match(
        /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i
      ) !== null);

  // Check if the song is a remix
  const isRemix = title && title.toLowerCase().includes("remix");
  const isHouseRemix = isRemix && title.toLowerCase().includes("house");

  // Vietnamese indie pattern detection
  const isVietnameseIndie =
    isVietnameseSong &&
    tempo !== null &&
    tempo >= 110 &&
    tempo <= 125 &&
    ((key === "C" && scale === "major") || mood === "Melancholic") &&
    !isRemix; // Exclude remixes

  if (isVietnameseIndie) {
    console.log("Vietnamese indie pattern detected");

    const indieId = genreMap.get("indie") || genreMap.get("indie pop");
    if (indieId) {
      selectedGenres.push(indieId);
      console.log("Added: Indie (primary)");
    }

    const popId = genreMap.get("pop");
    if (popId && !selectedGenres.includes(popId)) {
      selectedGenres.push(popId);
      console.log("Added: Pop (secondary)");
    }

    if (safeEnergy !== null && safeEnergy > 0.5) {
      const rockId = genreMap.get("alternative") || genreMap.get("rock");
      if (rockId && !selectedGenres.includes(rockId)) {
        selectedGenres.push(rockId);
        console.log("Added: Alternative/Rock (energetic Vietnamese indie)");
      }
    } else {
      const vPopId = genreMap.get("v-pop") || genreMap.get("vietnamese pop");
      if (vPopId && !selectedGenres.includes(vPopId)) {
        selectedGenres.push(vPopId);
        console.log("Added: V-Pop");
      }
    }

    return selectedGenres.slice(0, 3);
  }

  // Vietnamese house remix detection for genres
  if (isVietnameseSong && isHouseRemix) {
    console.log("Vietnamese house remix detected");

    const houseId =
      genreMap.get("house") ||
      genreMap.get("electronic") ||
      genreMap.get("dance");
    if (houseId) {
      selectedGenres.push(houseId);
      console.log("Added: House/Electronic (primary for house remix)");
    }

    const danceId = genreMap.get("dance");
    if (danceId && !selectedGenres.includes(danceId)) {
      selectedGenres.push(danceId);
      console.log("Added: Dance (secondary for house remix)");
    }

    const vPopId = genreMap.get("v-pop") || genreMap.get("vietnamese pop");
    if (vPopId && !selectedGenres.includes(vPopId)) {
      selectedGenres.push(vPopId);
      console.log("Added: V-Pop (Vietnamese origin)");
    }

    return selectedGenres.slice(0, 3);
  }

  // Regular Vietnamese remix detection for genres
  if (isVietnameseSong && isRemix) {
    console.log("Vietnamese remix detected");

    const danceId = genreMap.get("dance") || genreMap.get("electronic");
    if (danceId) {
      selectedGenres.push(danceId);
      console.log("Added: Dance/Electronic (Vietnamese remix)");
    }

    const popId = genreMap.get("pop");
    if (popId && !selectedGenres.includes(popId)) {
      selectedGenres.push(popId);
      console.log("Added: Pop (remix base)");
    }

    const vPopId = genreMap.get("v-pop") || genreMap.get("vietnamese pop");
    if (vPopId && !selectedGenres.includes(vPopId)) {
      selectedGenres.push(vPopId);
      console.log("Added: V-Pop (Vietnamese origin)");
    }

    return selectedGenres.slice(0, 3);
  }

  // Regular Vietnamese song detection
  if (isVietnameseSong) {
    console.log("Vietnamese song detected");

    // Handle F minor key specifically for Vietnamese songs (ballads/bolero)
    if (key === "F" && scale === "minor") {
      console.log("Detected Vietnamese song in F minor - applying ballad/pop genres");
      
      // Try to add ballad genre first
      const balladId = genreMap.get("ballad");
      if (balladId) {
        selectedGenres.push(balladId);
        console.log("Added: Ballad (F minor key)");
      }
      
      // Add pop genre
      const popId = genreMap.get("pop");
      if (popId && !selectedGenres.includes(popId)) {
        selectedGenres.push(popId);
        console.log("Added: Pop");
      }
      
      // Add v-pop or bolero genre as third option
      const vPopId = genreMap.get("v-pop") || genreMap.get("vietnamese pop");
      if (vPopId && !selectedGenres.includes(vPopId)) {
        selectedGenres.push(vPopId);
        console.log("Added: V-Pop");
      }
      
      return selectedGenres.slice(0, 3);
    }

    const vPopId =
      genreMap.get("v-pop") ||
      genreMap.get("vietnamese pop") ||
      genreMap.get("pop");
    if (vPopId) {
      selectedGenres.push(vPopId);
      console.log("Added: Vietnamese Pop");
    }

    if (tempo !== null && tempo >= 120 && scale === "major") {
      const popId = genreMap.get("pop");
      if (popId && !selectedGenres.includes(popId)) {
        selectedGenres.push(popId);
        console.log("Added: Pop (upbeat)");
      }
    }

    if (mood === "Melancholic" || mood === "Calm") {
      const balladId = genreMap.get("ballad");
      if (balladId && !selectedGenres.includes(balladId)) {
        selectedGenres.push(balladId);
        console.log("Added: Ballad");
      }

      const indieId = genreMap.get("indie");
      if (indieId && !selectedGenres.includes(indieId)) {
        selectedGenres.push(indieId);
        console.log("Added: Indie (melancholic)");
      }
    }
  }

  // Generic genre mapping
  if (tempo !== null && tempo >= 125) {
    if (safeEnergy !== null && safeEnergy > 0.7) {
      const edm = genreMap.get("electronic") || genreMap.get("edm");
      const dance = genreMap.get("dance");

      if (edm && !selectedGenres.includes(edm)) {
        selectedGenres.push(edm);
        console.log("Added: Electronic");
      }

      if (dance && !selectedGenres.includes(dance)) {
        selectedGenres.push(dance);
        console.log("Added: Dance");
      }
    }

    if (scale === "major") {
      const popId = genreMap.get("pop");
      if (popId && !selectedGenres.includes(popId)) {
        selectedGenres.push(popId);
        console.log("Added: Pop (high tempo)");
      }
    }
  }

  if (mood === "Energetic") {
    const popId = genreMap.get("pop");
    if (popId && !selectedGenres.includes(popId)) {
      selectedGenres.push(popId);
      console.log("Added: Pop (energetic)");
    }

    if (safeEnergy !== null && safeEnergy > 0.65 && !isVietnameseSong) {
      const rockId = genreMap.get("rock");
      if (rockId && !selectedGenres.includes(rockId)) {
        selectedGenres.push(rockId);
        console.log("Added: Rock (non-Vietnamese)");
      }
    }
  }

  if (mood === "Calm" || mood === "Melancholic") {
    const ambientId = genreMap.get("ambient");

    if (ambientId && !selectedGenres.includes(ambientId)) {
      selectedGenres.push(ambientId);
      console.log("Added: Ambient");
    }

    if (mood === "Melancholic") {
      const indieId = genreMap.get("indie");
      if (indieId && !selectedGenres.includes(indieId)) {
        selectedGenres.push(indieId);
        console.log("Added: Indie (melancholic)");
      }
    }
  }

  if (scale === "minor" && !isVietnameseSong) {
    const altId = genreMap.get("alternative");

    if (altId && !selectedGenres.includes(altId)) {
      selectedGenres.push(altId);
      console.log("Added: Alternative (minor key)");
    }
  }

  // Default fallback
  if (selectedGenres.length === 0) {
    const popId = genreMap.get("pop");
    if (popId) {
      selectedGenres.push(popId);
      console.log("Added: Pop (default)");
    }
  }

  return selectedGenres.slice(0, 3);
}

// Helper function to add a genre if it exists in the system
function addGenreIfExists(
  genreName: string,
  genreMap: Map<string, string>,
  selectedGenres: string[]
) {
  const id = genreMap.get(genreName);
  if (id && !selectedGenres.includes(id)) {
    selectedGenres.push(id);
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

export const processBulkUpload = async (files: Express.Multer.File[]) => {
  const results = [];

  for (const file of files) {
    try {
      console.log(`Processing file: ${file.originalname}`);

      // 1. Upload to Cloudinary
      const audioUploadResult = await uploadFile(file.buffer, "tracks", "auto");
      const audioUrl = audioUploadResult.secure_url;

      // 2. Extract Metadata (music-metadata)
      let duration = 0;
      let title = file.originalname.replace(/\.[^/.]+$/, ""); // Default title from filename
      let derivedArtistName = "Unknown Artist"; // Default artist name

      try {
        const metadata = await mm.parseBuffer(file.buffer, file.mimetype);
        duration = Math.round(metadata.format.duration || 0);

        // Try to get artist and title from metadata
        if (metadata.common?.artist) {
          derivedArtistName = metadata.common.artist;
        }
        if (metadata.common?.title) {
          title = metadata.common.title;
        }
      } catch (metadataError) {
        console.error("Error parsing basic audio metadata:", metadataError);
      }

      // 3. Analyze Audio (Essentia)
      let tempo: number | null = null;
      let mood: string | null = null;
      let key: string | null = null;
      let scale: string | null = null;
      let danceability: number | null = null;
      let energy: number | null = null;
      let confidence: number | null = null;

      try {
        const pcmF32 = await convertMp3BufferToPcmF32(file.buffer);

        if (pcmF32) {
          const essentia = new Essentia(EssentiaWASM);
          const audioVector = essentia.arrayToVector(pcmF32);

          // Debug: PCM length
          console.log("PCM length:", pcmF32.length);

          // Get sample rate from metadata
          try {
            const metadata = await mm.parseBuffer(file.buffer, file.mimetype);
            // RhythmExtractor2013 specifically requires 44100 Hz
            const targetSampleRate = 44100;

            // Try RhythmExtractor2013 for more robust BPM
            try {
              const rhythmResult = essentia.RhythmExtractor2013(
                audioVector,
                targetSampleRate // Always use 44100 Hz with RhythmExtractor2013
              );
              let rawTempo = rhythmResult.bpm;
              confidence = rhythmResult.confidence || null;
              console.log(
                "RhythmExtractor2013 BPM:",
                rawTempo,
                "Confidence:",
                confidence
              );

              // Get a second tempo estimation if confidence is low
              let percivalTempo = null;
              if (confidence === null || confidence < 3) {
                try {
                  const percivalResult =
                    essentia.PercivalBpmEstimator(audioVector);
                  percivalTempo = percivalResult.bpm;
                  console.log("PercivalBpmEstimator BPM:", percivalTempo);

                  // If the tempos are close, average them for better accuracy
                  if (Math.abs(rawTempo - percivalTempo) < 10) {
                    rawTempo = (rawTempo + percivalTempo) / 2;
                    console.log("Averaged tempo from two estimators:", rawTempo);
                  }
                  // If confidence is very low, prefer Percival result
                  else if (confidence !== null && confidence < 1) {
                    rawTempo = percivalTempo;
                    console.log(
                      "Using Percival tempo due to very low confidence:",
                      rawTempo
                    );
                  }
                  // If the estimations are significantly different, go with Percival if it's a more common tempo value
                  else if (
                    Math.abs(Math.round(percivalTempo) % 10) <
                    Math.abs(Math.round(rawTempo) % 10)
                  ) {
                    rawTempo = percivalTempo;
                    console.log(
                      "Using Percival tempo as it matches common BPM patterns better:",
                      rawTempo
                    );
                  }
                } catch (percivalError) {
                  console.error(
                    "Error estimating tempo with PercivalBpmEstimator:",
                    percivalError
                  );
                }
              }

              // Round to nearest whole number
              tempo = Math.round(rawTempo);

              // Last validation against typical ranges
              if (tempo < 60 || tempo > 200) {
                console.warn(
                  `Unusual tempo detected: ${tempo}. Applying sanity check.`
                );
                // If we have a backup from Percival and it's more reasonable, use it
                if (
                  percivalTempo !== null &&
                  percivalTempo >= 60 &&
                  percivalTempo <= 200
                ) {
                  tempo = Math.round(percivalTempo);
                  console.log(
                    "Using percival tempo as primary was out of expected range:",
                    tempo
                  );
                }
              }
              // Check for common BPM detection errors - often off by ~10%
              else if (percivalTempo !== null) {
                const percentDiff = Math.abs(tempo - percivalTempo) / tempo;

                // If there's a significant difference (~9-11%) between methods
                if (percentDiff > 0.08 && percentDiff < 0.12) {
                  console.log(
                    `Detected possible BPM harmonic error (${tempo} vs ${percivalTempo}), percentDiff: ${percentDiff.toFixed(
                      2
                    )}`
                  );

                  // For indie/pop songs, prefer the higher BPM if it's between 110-125
                  if (
                    percivalTempo > 110 &&
                    percivalTempo < 125 &&
                    percivalTempo > tempo
                  ) {
                    tempo = Math.round(percivalTempo);
                    console.log(
                      `Corrected BPM to ${tempo} - likely indie/pop song in 110-125 BPM range`
                    );
                  }
                  // For songs around 100-114 BPM, also prefer higher tempo
                  else if (
                    percivalTempo > 100 &&
                    percivalTempo < 115 &&
                    percivalTempo > tempo
                  ) {
                    tempo = Math.round(percivalTempo);
                    console.log(
                      `Corrected BPM to ${tempo} - likely in 100-115 BPM range`
                    );
                  }
                }
              }
            } catch (tempoError) {
              console.error(
                "Error estimating tempo with RhythmExtractor2013:",
                tempoError
              );
              // Fallback to PercivalBpmEstimator if RhythmExtractor2013 fails
              try {
                const tempoResult = essentia.PercivalBpmEstimator(audioVector);
                tempo = Math.round(tempoResult.bpm);
                console.log("PercivalBpmEstimator BPM (fallback):", tempoResult.bpm);
              } catch (fallbackError) {
                console.error(
                  "Error estimating tempo with PercivalBpmEstimator fallback:",
                  fallbackError
                );
                tempo = null;
              }
            }
          } catch (metadataError) {
            console.error("Error getting sample rate from metadata:", metadataError);
            // If we can't get the sample rate, try PercivalBpmEstimator which doesn't require it
            try {
              const tempoResult = essentia.PercivalBpmEstimator(audioVector);
              tempo = Math.round(tempoResult.bpm);
              console.log("PercivalBpmEstimator BPM (no sample rate):", tempo);
            } catch (fallbackError) {
              console.error(
                "Fallback tempo estimation failed:",
                fallbackError
              );
              tempo = null;
            }
          }

          // Danceability Estimation
          try {
            const danceabilityResult = essentia.Danceability(audioVector);
            danceability = danceabilityResult.danceability;
          } catch (danceabilityError) {
            console.error("Error estimating danceability:", danceabilityError);
          }

          // Energy Calculation (used for mood placeholder and energy field)
          try {
            const energyResult = essentia.Energy(audioVector);
            const rawEnergy = energyResult.energy;

            // Check for Vietnamese song by looking for diacritics in title/artist
            const isVietnameseSong =
              title.match(
                /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i
              ) !== null ||
              derivedArtistName.match(
                /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i
              ) !== null;

            // Check if the song is a remix
            const isRemix = title.toLowerCase().includes("remix");
            const isHouseRemix =
              isRemix && title.toLowerCase().includes("house");

            // Vietnamese indie song detection based on tempo and energy patterns
            // Most Vietnamese indie songs in the 110-125 BPM range are misclassified
            const isVietnameseIndie =
              isVietnameseSong &&
              tempo !== null &&
              tempo >= 110 &&
              tempo <= 125 &&
              !isRemix; // Exclude remixes from indie pattern

            // Only apply energy correction for slower Vietnamese ballads
            // Fast-paced Vietnamese songs can still be energetic
            if (isVietnameseIndie) {
              // Vietnamese indie songs are often misclassified as high energy
              energy = Math.min(rawEnergy, 0.35); // Lower energy value for indie songs
              console.log(
                `Energy correction for Vietnamese indie song: ${rawEnergy} → ${energy} (indie pattern detected)`
              );

              // Vietnamese indie songs are generally more melancholic/calm than detected
              mood = "Melancholic";
              console.log(
                "Mood set to: Melancholic (Vietnamese indie pattern)"
              );
            } else if (isVietnameseSong && isHouseRemix) {
              // House remixes are almost always highly energetic, especially in Vietnamese music
              energy = Math.max(rawEnergy, 0.85); // Very high energy for house remixes
              mood = "Energetic";
              console.log(
                "Mood set to: Energetic (Vietnamese house remix detected)"
              );
            } else if (isVietnameseSong && isRemix) {
              // Vietnamese remixes should be classified as energetic
              energy = Math.max(rawEnergy, 0.7); // Higher energy for regular remixes
              mood = "Energetic";
              console.log("Mood set to: Energetic (Vietnamese remix detected)");
            } else if (
              isVietnameseSong &&
              tempo !== null &&
              tempo < 110 &&
              scale !== null &&
              (scale as string).toLowerCase() === "minor"
            ) {
              // This is likely a Vietnamese ballad (slower tempo, minor key)
              energy = Math.min(rawEnergy, 0.35);
              console.log(
                `Energy correction applied for Vietnamese ballad: ${rawEnergy} → ${energy} (slow tempo, minor key)`
              );
            } else if (isVietnameseSong && tempo !== null && tempo >= 130) {
              // This is likely an upbeat Vietnamese song - allow it to be energetic
              // But still slightly adjust energy for better accuracy
              energy = Math.min(rawEnergy, 0.8);
              console.log(
                `Minor energy adjustment for upbeat Vietnamese song: ${rawEnergy} → ${energy} (higher tempo)`
              );
            } else if (
              tempo !== null &&
              tempo >= 90 &&
              tempo <= 120 &&
              key !== null &&
              (key as string).toLowerCase().includes("e") &&
              scale !== null &&
              (scale as string).toLowerCase() === "minor"
            ) {
              // Apply correction for other ballad characteristics
              energy = Math.min(rawEnergy, 0.4);
              console.log(
                `Energy correction applied: ${rawEnergy} → ${energy} (ballad characteristics detected)`
              );
            } else {
              energy = rawEnergy;
              console.log(`Using original energy value: ${energy}`);
            }

            // Set mood based on energy, key, scale and tempo (unless already set)
            if (mood === null) {
              if (
                isVietnameseSong &&
                tempo !== null &&
                tempo >= 130 &&
                energy !== null &&
                energy > 0.5
              ) {
                mood = "Energetic"; // Fast Vietnamese songs with decent energy should be Energetic
                console.log("Mood set to: Energetic (upbeat Vietnamese song)");
              } else if (
                isVietnameseSong &&
                key !== null &&
                scale !== null &&
                (scale as string).toLowerCase() === "minor" &&
                tempo !== null &&
                tempo < 120
              ) {
                mood = "Melancholic"; // Slower Vietnamese songs in minor key are typically melancholic
                console.log(
                  "Mood set to: Melancholic (Vietnamese song in minor key with slower tempo)"
                );
              } else if (
                energy !== null &&
                key !== null &&
                scale !== null &&
                (scale as string).toLowerCase() === "minor" &&
                energy <= 0.4
              ) {
                mood = "Melancholic"; // Minor key with low energy = melancholic
                console.log(
                  "Mood set to: Melancholic (minor key + low energy)"
                );
              } else if (energy !== null && energy <= 0.4) {
                mood = "Calm"; // Low energy = calm
                console.log("Mood set to: Calm (based on low energy)");
              } else if (energy !== null && energy > 0.6) {
                mood = "Energetic"; // High energy = energetic
                console.log("Mood set to: Energetic (based on high energy)");
              } else if (energy !== null) {
                mood = "Neutral"; // Medium energy = neutral
                console.log("Mood set to: Neutral (medium energy)");
              }
            }
          } catch (energyError) {
            console.error("Error calculating energy:", energyError);
          }

          // Key & Scale Estimation
          try {
            const keyResult = essentia.KeyExtractor(audioVector);
            const rawKey = keyResult.key;
            const rawScale = keyResult.scale;
            console.log(
              "Key estimation:",
              rawKey,
              rawScale,
              "Strength:",
              keyResult.strength
            );

            // Add relative key validation for common confusions
            // Key detection often confused between relative major/minor keys
            // (e.g., A minor is the relative minor of C major, F minor is relative to Ab major)
            let correctedKey = rawKey;
            let correctedScale = rawScale;

            // Validation for common key detection errors
            const keyCorrection: Record<
              string,
              { key: string; possibleErrors: string[] }
            > = {
              A: { key: "A", possibleErrors: ["F", "C"] },
              F: { key: "F", possibleErrors: ["A", "D"] },
              Eb: { key: "Eb", possibleErrors: ["C", "G"] }, // Eb minor vs C Major confusion
              // Could add more corrections based on observed issues
            };

            // Check for Vietnamese indie song pattern - often Eb minor is actually C Major
            const isVietnameseSong =
              title.match(
                /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i
              ) !== null ||
              derivedArtistName.match(
                /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i
              ) !== null;

            // Check if song is a remix - remixes have different key profiles
            const isRemix =
              title.toLowerCase().includes("remix") ||
              title.toLowerCase().includes("edm");

            // Vietnamese indie key correction (skip for remixes as they intentionally change keys)
            if (
              isVietnameseSong &&
              rawKey === "Eb" &&
              rawScale === "minor" &&
              tempo !== null &&
              tempo >= 110 &&
              tempo <= 125 &&
              !isRemix
            ) {
              console.log(
                "Detected Vietnamese indie song with Eb minor key - likely C Major confusion"
              );
              correctedKey = "C";
              correctedScale = "major";
              console.log(
                `Corrected key from ${rawKey} ${rawScale} to ${correctedKey} ${correctedScale} (Vietnamese indie pattern)`
              );
            }
            // For Vietnamese remixes, we generally trust the raw key/scale detection
            else if (isVietnameseSong && isRemix) {
              console.log(
                "Vietnamese remix detected - using raw key detection without correction"
              );
              // No correction for remixes since they may have intentional key changes
            }
            // Special case for common A minor / F minor confusion with pop/rock songs
            // REMOVED: This was causing incorrect key changes from F minor to A minor
            // else if (
            //   rawKey === "F" &&
            //   rawScale === "minor" &&
            //   tempo !== null &&
            //   tempo >= 100 &&
            //   tempo <= 115
            // ) {
            //   console.log(
            //     "Detected potential F minor / A minor confusion in common BPM range (100-115)"
            //   );
            //   correctedKey = "A"; // Prefer A minor in this range, especially for pop/rock songs
            //   console.log(
            //     `Corrected key from ${rawKey} to ${correctedKey} based on common A minor / F minor confusion`
            //   );
            // }
            // If we have a specific correction and low confidence, do deeper analysis
            else if (keyResult.strength < 0.6 && keyCorrection[rawKey]) {
              console.log(
                `Low confidence key detection, checking for common errors for ${rawKey} ${rawScale}`
              );

              // Try alternate key detection method for validation
              try {
                // Get the sample rate for section calculation
                const metadataForKey = await mm.parseBuffer(file.buffer, file.mimetype);
                const sampleRateForKey = metadataForKey.format.sampleRate || 44100;
                
                // Run further analysis on first ~30 seconds which often provides better results
                const shortSection =
                  pcmF32.length > 30 * sampleRateForKey
                    ? new Float32Array(pcmF32.buffer, 0, 30 * sampleRateForKey)
                    : pcmF32;

                const shortVector = essentia.arrayToVector(shortSection);
                const secondKeyResult = essentia.KeyExtractor(shortVector);

                console.log(
                  "Secondary key detection on shorter segment:",
                  secondKeyResult.key,
                  secondKeyResult.scale,
                  "Strength:",
                  secondKeyResult.strength
                );

                // If second detection is one of the common confusion keys, trust it more
                if (
                  keyCorrection[rawKey].possibleErrors.includes(
                    secondKeyResult.key
                  ) &&
                  secondKeyResult.strength > keyResult.strength
                ) {
                  correctedKey = secondKeyResult.key;
                  correctedScale = secondKeyResult.scale;
                  console.log(
                    `Corrected key from ${rawKey} to ${correctedKey} based on secondary analysis`
                  );
                }
              } catch (secondaryKeyError) {
                console.error(
                  "Error in secondary key detection:",
                  secondaryKeyError
                );
              }
            }

            // Assign final key and scale values
            key = correctedKey;
            scale = correctedScale;
          } catch (keyError) {
            console.error("Error estimating key/scale:", keyError);
          }
        } else {
          console.warn("Audio decoding failed, skipping all audio analysis.");
        }
      } catch (analysisError) {
        console.error("Error during audio analysis pipeline:", analysisError);
      }

      // 4. Get or Create VERIFIED Artist Profile (for admin bulk upload)
      const artistProfile = await getOrCreateVerifiedArtistProfile(
        derivedArtistName
      );
      const artistId = artistProfile.id;

      // 5. Auto-Determine genres based on analysis
      let genreIds: string[] = [];
      try {
        genreIds = await determineGenresFromAudioAnalysis(
          tempo,
          mood,
          key,
          scale,
          energy,
          danceability,
          duration,
          title,
          derivedArtistName
        );
        console.log(
          `Auto-determined genres for "${title}": ${genreIds.length} genres`
        );
      } catch (genreError) {
        console.error(
          "Error determining genres from audio analysis:",
          genreError
        );

        // 5b. Fallback to default genre - using "Pop" as a fallback if available
        try {
          const popGenre = await prisma.genre.findFirst({
            where: {
              name: { equals: "Pop", mode: "insensitive" },
            },
          });

          if (popGenre) {
            genreIds = [popGenre.id];
          } else {
            // If Pop genre doesn't exist, get the first genre
            const anyGenre = await prisma.genre.findFirst({
              orderBy: { createdAt: "asc" },
            });
            if (anyGenre) {
              genreIds = [anyGenre.id];
            }
          }
        } catch (fallbackGenreError) {
          console.error("Error finding fallback genre:", fallbackGenreError);
        }
      }

      // 6. Generate cover artwork based on track metadata
      let coverUrl = null;
      try {
        coverUrl = await generateCoverArtwork(title, derivedArtistName, mood);
        console.log(`Generated cover artwork for "${title}"`);
      } catch (coverError) {
        console.error("Error generating cover artwork:", coverError);
      }

      // 7. Create Track record in Prisma
      const releaseDate = new Date(); // Default to current date

      const trackData: Prisma.TrackCreateInput = {
        title,
        duration,
        releaseDate,
        audioUrl,
        coverUrl, // Add the generated cover URL
        type: AlbumType.SINGLE,
        isActive: true,
        tempo,
        mood,
        key,
        scale,
        danceability,
        energy,
        artist: { connect: { id: artistId } },
      };

      // Add genres if we determined any
      if (genreIds.length > 0) {
        trackData.genres = {
          create: genreIds.map((genreId) => ({
            genre: { connect: { id: genreId } },
          })),
        };
      }

      const newTrack = await prisma.track.create({
        data: trackData,
        select: trackSelect,
      });

      // 8. Add created track info to results
      results.push({
        trackId: newTrack.id,
        title: newTrack.title,
        artistName: derivedArtistName,
        artistId: artistId,
        duration: newTrack.duration,
        audioUrl: newTrack.audioUrl,
        coverUrl: newTrack.coverUrl, // Include coverUrl in the result
        tempo: newTrack.tempo,
        mood: newTrack.mood,
        key: newTrack.key,
        scale: newTrack.scale,
        genreIds: genreIds,
        genres: newTrack.genres?.map((g) => g.genre.name),
        fileName: file.originalname,
        success: true,
      });
    } catch (error) {
      console.error(`Error processing file ${file.originalname}:`, error);
      results.push({
        fileName: file.originalname,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      });
    }
  }

  return results;
};

export const generateAndAssignAiPlaylistToUser = async (
  adminExecutingId: string,
  targetUserId: string
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

  // 2. Verify Target User Exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, name: true }, // Select only necessary fields
  });

  if (!targetUser) {
    throw new HttpError(404, "Target user not found");
  }

  const targetUserDisplayName =
    targetUser.username || targetUser.name || targetUserId;

  // 3. Get User's Listening History (just to check if it's empty)
  const listeningHistory = await prisma.history.findMany({
    where: {
      userId: targetUserId,
      type: "PLAY", // Assuming 'PLAY' is the type for played tracks
      trackId: { not: null }, // Ensure there's an associated track
    },
    take: 10, // Only need a few to check for existence and variety
    select: { trackId: true },
  });

  const uniqueTracksInHistory = new Set(listeningHistory.map((h) => h.trackId))
    .size;
  const hasSufficientHistory = uniqueTracksInHistory > 3; // Arbitrary threshold for "sufficient" history

  let playlistOptions: aiService.PlaylistGenerationOptions = {};
  let trackIdsToUse: string[] | undefined = undefined;

  if (!hasSufficientHistory) {
    // 4. No (or insufficient) listening history: Generate playlist from top played tracks
    console.log(
      `[AdminService] User ${targetUserId} has no/insufficient history. Generating from top tracks.`
    );
    trackIdsToUse = await aiService.getTopPlayedTrackIds(10); // Fix: Only pass count
    if (!trackIdsToUse || trackIdsToUse.length === 0) {
      // Fallback: if no top tracks either (e.g. new system), maybe throw error or return empty playlist indication
      // For now, createAIGeneratedPlaylist will throw an error if trackIds are empty.
      console.warn(
        "[AdminService] No top tracks found to generate default playlist."
      );
    }
    playlistOptions = {
      name: `Popular Mix for ${targetUserDisplayName}`,
      description:
        "Discover popular tracks! An AI-curated playlist based on trending songs.",
      // trackCount will be implicitly set by the length of trackIdsToUse in createAIGeneratedPlaylist
    };
  } else {
    // 5. Has listening history: Generate personalized playlist using AI
    console.log(
      `[AdminService] User ${targetUserId} has history. Generating personalized AI mix.`
    );
    playlistOptions = {
      name: `Your AI Mix, ${targetUserDisplayName}`,
      description: `A personalized playlist crafted by AI, just for you, ${targetUserDisplayName}! Based on your listening taste.`,
      trackCount: 10, // Request 10 tracks from Gemini
    };
  }

  try {
    console.log(
      `[AdminService] Attempting to generate AI playlist for user ${targetUserId}`
    );

    // Call the AI service to create the playlist
    // Pass an empty options object, or specific options EXCEPT name/description
    const newPlaylist = await aiService.createAIGeneratedPlaylist(
      targetUserId,
      {
        /* Pass other options if needed, e.g., coverUrl, but not name/desc */
      },
      trackIdsToUse
    );

    console.log(
      `[AdminService] Successfully generated AI playlist ${newPlaylist.id} for user ${targetUserId}`
    );
    return newPlaylist;
  } catch (error) {
    console.error(
      `[AdminService] Error generating AI playlist for user ${targetUserId}:`,
      error
    );
    // Re-throw or handle more gracefully
    if (error instanceof Error) {
      throw new HttpError(
        500,
        `Failed to generate AI playlist: ${error.message}`
      );
    }
    throw new HttpError(
      500,
      "An unexpected error occurred while generating the AI playlist."
    );
  }
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
      take: 3,
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
          // Add audio feature fields to the select statement
          tempo: true,
          mood: true,
          key: true,
          scale: true,
          danceability: true,
          energy: true,
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
