import prisma from '../config/db';
import { labelSelect } from '../utils/prisma-selects';
import { Request } from 'express';
import { uploadFile } from './upload.service';
import { runValidations, validateField, paginate } from '../utils/handle-utils';
import { Prisma } from '@prisma/client';

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
