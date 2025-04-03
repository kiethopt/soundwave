import prisma from '../config/db';
import { labelSelect } from '../utils/prisma-selects';
import { Request } from 'express';
import { uploadFile } from './upload.service';
import { runValidations, validateField, paginate } from '../utils/handle-utils';

export const getAllLabels = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;

  // Xây dựng điều kiện tìm kiếm
  const whereClause: any = {};

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Xử lý sắp xếp
  const orderByClause: any = {};
  if (
    sortBy &&
    typeof sortBy === 'string' &&
    (sortOrder === 'asc' || sortOrder === 'desc')
  ) {
    if (sortBy === 'name' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
      orderByClause[sortBy] = sortOrder;
    } else {
      orderByClause.name = 'asc';
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

  const artistMap = new Map();
  label.albums?.forEach((album) => {
    if (album.artist) {
      const artistId = album.artist.id;
      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          ...album.artist,
          albumCount: 0,
          trackCount: 0,
        });
      }
      const artist = artistMap.get(artistId);
      artist.albumCount += 1;
      artistMap.set(artistId, artist);
    }
  });

  label.tracks?.forEach((track) => {
    if (track.artist) {
      const artistId = track.artist.id;
      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          ...track.artist,
          albumCount: 0,
          trackCount: 0,
        });
      }
      const artist = artistMap.get(artistId);
      artist.trackCount += 1;
      artistMap.set(artistId, artist);
    }
  });

  const artists = Array.from(artistMap.values()).sort((a, b) =>
    a.artistName.localeCompare(b.artistName)
  );

  return {
    ...label,
    artists,
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
