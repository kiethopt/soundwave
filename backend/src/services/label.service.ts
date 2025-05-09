import prisma from '../config/db';
import { labelSelect } from '../utils/prisma-selects';
import { Request } from 'express';
import { uploadFile } from './upload.service';
import { runValidations, validateField, paginate } from '../utils/handle-utils';
import { Prisma, LabelRegistrationRequest, RequestStatus, NotificationType, User, ArtistProfile, RecipientType, Label } from '@prisma/client';

export const getAllLabels = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;

  // Xây dựng điều kiện tìm kiếm
  const whereClause: Prisma.LabelWhereInput = {};

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Xử lý sắp xếp
  const orderByClause: Prisma.LabelOrderByWithRelationInput = {};
  const validSortKeys = ['name', 'tracks', 'albums'] as const;
  type SortKey = typeof validSortKeys[number];

  const key = sortBy as SortKey;
  const order = sortOrder === 'desc' ? 'desc' : 'asc'; // Default to asc

  if (sortBy && typeof sortBy === 'string' && validSortKeys.includes(key)) {
    if (key === 'name') {
      orderByClause.name = order;
    } else if (key === 'tracks') {
      orderByClause.tracks = { _count: order };
    } else if (key === 'albums') {
      orderByClause.albums = { _count: order };
    }
  } else {
    orderByClause.name = 'asc';
  }

  // Dùng hàm paginate để xử lý phân trang
  const result = await paginate<any>(prisma.label, req, {
    where: whereClause,
    include: {
      _count: {
        select: {
          tracks: true,
          albums: true,
        },
      },
    },
    orderBy: orderByClause,
  });

  return {
    data: result.data,
    pagination: result.pagination,
  };
};

export const getLabelById = async (id: string) => {
  const label = await prisma.label.findUnique({
    where: { id },
    select: {
      ...labelSelect,
      artists: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
          isVerified: true,
          _count: {
            select: {
              albums: { where: { isActive: true } },
              tracks: { where: { isActive: true } },
            },
          },
        },
        orderBy: { artistName: 'asc' },
      },
      albums: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          type: true,
          totalTracks: true,
          artist: {
            select: {
              id: true,
              artistName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
        orderBy: { releaseDate: 'desc' },
      },
      tracks: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          duration: true,
          playCount: true,
          artist: {
            select: {
              id: true,
              artistName: true,
              avatar: true,
              isVerified: true,
            },
          },
          album: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { releaseDate: 'desc' },
      },
    },
  });

  if (!label) return null;

  const artistsWithCounts = label.artists.map(artist => ({
    ...artist,
    albumCount: artist._count.albums,
    trackCount: artist._count.tracks,
  }));

  return {
    ...label,
    artists: artistsWithCounts,
  };
};

export const createLabel = async (req: Request) => {
  const { name, description } = req.body;
  const logoFile = req.file;

  const errors = runValidations([
    validateField(name, 'name', { required: true }),
  ]);

  if (errors.length > 0) {
    throw { status: 400, message: 'Validation failed', errors };
  }

  const existingLabel = await prisma.label.findUnique({
    where: { name },
  });

  if (existingLabel) {
    throw { status: 400, message: 'A label with this name already exists' };
  }

  let logoUrl: string | undefined;
  if (logoFile) {
    const uploadResult = await uploadFile(logoFile.buffer, 'labels', 'image');
    logoUrl = uploadResult.secure_url;
  }

  return prisma.label.create({
    data: {
      name,
      description,
      logoUrl,
    },
    select: labelSelect,
  });
};

export const updateLabel = async (req: Request) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const logoFile = req.file;

  const existingLabel = await prisma.label.findUnique({
    where: { id },
  });

  if (!existingLabel) {
    throw { status: 404, message: 'Label not found' };
  }

  if (name && name !== existingLabel.name) {
    const nameConflict = await prisma.label.findUnique({
      where: { name },
    });

    if (nameConflict) {
      throw { status: 400, message: 'A label with this name already exists' };
    }
  }

  let updateData: any = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  if (logoFile) {
    const uploadResult = await uploadFile(logoFile.buffer, 'labels', 'image');
    updateData.logoUrl = uploadResult.secure_url;
  }

  return prisma.label.update({
    where: { id },
    data: updateData,
    select: labelSelect,
  });
};

export const deleteLabel = async (id: string) => {
  const existingLabel = await prisma.label.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          albums: true,
          tracks: true,
        },
      },
    },
  });

  if (!existingLabel) {
    throw { status: 404, message: 'Label not found' };
  }

  if (existingLabel._count.albums > 0 || existingLabel._count.tracks > 0) {
    throw {
      status: 400,
      message:
        'Cannot delete label with associated albums or tracks. Remove the associations first.',
      data: {
        albums: existingLabel._count.albums,
        tracks: existingLabel._count.tracks,
      },
    };
  }

  return prisma.label.delete({
    where: { id },
  });
};

// === LABEL REGISTRATION SERVICES ===

/**
 * Artist requests a new label registration.
 */
export const requestNewLabelRegistration = async (
  userId: string, 
  data: { name: string; description?: string }, 
  logoFile?: Express.Multer.File
) => {
  const errors = runValidations([
    validateField(data.name, 'name', { required: true, minLength: 3, maxLength: 100 }),
    validateField(data.description, 'description', { maxLength: 500 }),
  ]);

  if (errors.length > 0) {
    throw { status: 400, message: 'Validation failed', errors };
  }

  // 1. Check if the user has an artist profile
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId },
  });

  if (!artistProfile) {
    throw { status: 403, message: 'User does not have an artist profile or is not an artist.' };
  }

  // 2. Check if this artist already has a PENDING request for the SAME label name
  const existingPendingRequest = await prisma.labelRegistrationRequest.findFirst({
    where: {
      requestingArtistId: artistProfile.id,
      requestedLabelName: data.name,
      status: RequestStatus.PENDING,
    },
  });

  if (existingPendingRequest) {
    throw { status: 400, message: `You already have a pending registration request for the label "${data.name}".` };
  }
  
  // 3. Check if a label with this name ALREADY EXISTS and is active (optional, but good to prevent obvious duplicates)
  const existingLabel = await prisma.label.findFirst({
      where: { name: data.name }
  });
  if (existingLabel) {
      throw { status: 400, message: `A label named "${data.name}" already exists.` };
  }

  let logoUrl: string | undefined;
  if (logoFile) {
    try {
      const uploadResult = await uploadFile(logoFile.buffer, 'label_logos', 'image'); // Assuming 'label_logos' folder
      logoUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error("Error uploading label logo:", uploadError);
      throw { status: 500, message: 'Failed to upload label logo.' };
    }
  }

  // 4. Create the label registration request
  const registrationRequest = await prisma.labelRegistrationRequest.create({
    data: {
      requestedLabelName: data.name,
      requestedLabelDescription: data.description,
      requestedLabelLogoUrl: logoUrl,
      requestingArtistId: artistProfile.id,
      status: RequestStatus.PENDING,
    },
    include: {
      requestingArtist: {
        select: {
          artistName: true,
        },
      },
    },
  });

  // 5. Notify Admins (Simplified - Assumes you have a way to get all admin IDs or a generic admin target)
  // In a real app, you might query for all admin users
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  if (admins.length > 0) {
    const notifications = admins.map(admin => ({
      userId: admin.id,
      recipientType: RecipientType.USER,
      type: NotificationType.LABEL_REGISTRATION_SUBMITTED,
      message: `Artist ${artistProfile.artistName} has requested to register a new label: "${data.name}".`,
      // You might want to add a link or reference to the request ID here if your Notification model supports it
      // claimId: registrationRequest.id, // Assuming claimId can be used for this purpose or add a new field
    }));
    await prisma.notification.createMany({ data: notifications });
  }

  return registrationRequest;
};

/**
 * Admin gets all label registration requests.
 */
export const getAllLabelRegistrations = async (req: Request) => {
  const { search, status, sortBy, sortOrder } = req.query;

  const whereClause: Prisma.LabelRegistrationRequestWhereInput = {};

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { requestedLabelName: { contains: search, mode: 'insensitive' } },
      { requestingArtist: { artistName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && typeof status === 'string' && Object.values(RequestStatus).includes(status as RequestStatus)) {
    whereClause.status = status as RequestStatus;
  }

  const orderByClause: Prisma.LabelRegistrationRequestOrderByWithRelationInput = {};
  const validSortKeys = ['submittedAt', 'requestedLabelName', 'status'] as const;
  type SortKey = typeof validSortKeys[number];
  const key = sortBy as SortKey;
  const order = sortOrder === 'desc' ? 'desc' : 'asc';

  if (sortBy && typeof sortBy === 'string' && validSortKeys.includes(key)) {
    orderByClause[key] = order;
  } else {
    orderByClause.submittedAt = 'desc'; // Default sort
  }

  const result = await paginate<LabelRegistrationRequest>(prisma.labelRegistrationRequest, req, {
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
          }
      }
    },
    orderBy: orderByClause,
  });

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
        }
      }
    },
  });

  if (!request) {
    throw { status: 404, message: 'Label registration request not found.' };
  }
  return request;
};

/**
 * Admin approves a label registration request.
 */
export const approveLabelRegistration = async (adminUserId: string, registrationId: string) => {
  const registrationRequest = await prisma.labelRegistrationRequest.findUnique({
    where: { id: registrationId },
    include: { requestingArtist: true }, // Need artist profile to update it
  });

  if (!registrationRequest) {
    throw { status: 404, message: 'Label registration request not found.' };
  }

  if (registrationRequest.status !== RequestStatus.PENDING) {
    throw { status: 400, message: `Request is already ${registrationRequest.status.toLowerCase()}.` };
  }

  // Transaction to ensure all operations succeed or fail together
  return prisma.$transaction(async (tx) => {
    // 1. Create the new Label
    const newLabel = await tx.label.create({
      data: {
        name: registrationRequest.requestedLabelName,
        description: registrationRequest.requestedLabelDescription,
        logoUrl: registrationRequest.requestedLabelLogoUrl,
        // artists: { connect: { id: registrationRequest.requestingArtistId } } // Connect the requesting artist initially
      },
      select: labelSelect, // Use your existing labelSelect
    });

    // 2. Update the ArtistProfile with the new labelId
    await tx.artistProfile.update({
      where: { id: registrationRequest.requestingArtistId },
      data: { labelId: newLabel.id },
    });

    // 3. Update the LabelRegistrationRequest
    const updatedRequest = await tx.labelRegistrationRequest.update({
      where: { id: registrationId },
      data: {
        status: RequestStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
        createdLabelId: newLabel.id,
      },
    });

    // 4. Notify the artist
    if (registrationRequest.requestingArtist.userId) {
      await tx.notification.create({
        data: {
          userId: registrationRequest.requestingArtist.userId,
          recipientType: RecipientType.USER, // Artist is a user
          type: NotificationType.LABEL_REGISTRATION_APPROVED,
          message: `Congratulations! Your request to register the label "${newLabel.name}" has been approved.`,
          // claimId: registrationRequest.id, // Optional: link to the request
        },
      });
    }
    return { updatedRequest, newLabel };
  });
};

/**
 * Admin rejects a label registration request.
 */
export const rejectLabelRegistration = async (
  adminUserId: string, 
  registrationId: string, 
  rejectionReason: string
) => {
  const errors = runValidations([
    validateField(rejectionReason, 'rejectionReason', { required: true, minLength: 10, maxLength: 500 }),
  ]);
  if (errors.length > 0) {
    throw { status: 400, message: 'Validation failed for rejection reason', errors };
  }

  const registrationRequest = await prisma.labelRegistrationRequest.findUnique({
    where: { id: registrationId },
    include: { requestingArtist: true }, // For notification
  });

  if (!registrationRequest) {
    throw { status: 404, message: 'Label registration request not found.' };
  }

  if (registrationRequest.status !== RequestStatus.PENDING) {
    throw { status: 400, message: `Request is already ${registrationRequest.status.toLowerCase()}.` };
  }

  const updatedRequest = await prisma.labelRegistrationRequest.update({
    where: { id: registrationId },
    data: {
      status: RequestStatus.REJECTED,
      reviewedAt: new Date(),
      reviewedByAdminId: adminUserId,
      rejectionReason: rejectionReason,
    },
  });

  // Notify the artist
  if (registrationRequest.requestingArtist.userId) {
    await prisma.notification.create({
      data: {
        userId: registrationRequest.requestingArtist.userId,
        recipientType: RecipientType.USER, // Artist is a user
        type: NotificationType.LABEL_REGISTRATION_REJECTED,
        message: `We regret to inform you that your request to register the label "${registrationRequest.requestedLabelName}" has been rejected. Reason: ${rejectionReason}`,
        // claimId: registrationRequest.id, // Optional: link to the request
      },
    });
  }

  return updatedRequest;
};

// New function to get labels selectable by a specific artist
export const getSelectableLabelsForArtist = async (artistProfileId: string): Promise<Label[]> => {
  if (!artistProfileId) {
    throw new Error('Artist profile ID is required to fetch selectable labels.');
  }

  // 1. Find approved label registration requests for this artist
  const approvedRequests = await prisma.labelRegistrationRequest.findMany({
    where: {
      requestingArtistId: artistProfileId,
      status: RequestStatus.APPROVED,
      createdLabelId: { // Ensure there is a created label linked
        not: null,
      },
    },
    select: {
      createdLabelId: true,
    },
  });

  const ownedLabelIds = approvedRequests
    .map(req => req.createdLabelId)
    .filter((id): id is string => id !== null); // Ensure no null IDs

  // 2. Fetch the details of these owned labels
  let selectableLabels: Label[] = []; // Explicitly type here
  if (ownedLabelIds.length > 0) {
    selectableLabels = await prisma.label.findMany({
      where: {
        id: { in: ownedLabelIds },
      },
      select: labelSelect, // Use your standard label selection
      orderBy: {
        name: 'asc',
      },
    });
  }

  // In the future, you could add logic here to fetch "public" labels
  // and merge them with selectableLabels, ensuring no duplicates.
  // For example:
  // const publicLabels = await prisma.label.findMany({
  //   where: { isPublic: true }, // Assuming an isPublic field
  //   select: labelSelect,
  // });
  // // Ensure correct typing if merging
  // const allLabels: Label[] = [...new Map([...selectableLabels, ...publicLabels].map(item => [item.id, item])).values()];
  // return allLabels.sort((a, b) => a.name.localeCompare(b.name));

  return selectableLabels;
};
