import prisma from '../config/db';
import { labelSelect } from '../utils/prisma-selects';

export const getAllLabels = async () => {
  return prisma.label.findMany({
    orderBy: {
      name: 'asc',
    },
    select: labelSelect,
  });
};

export const getLabelById = async (id: string) => {
  return prisma.label.findUnique({
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
        },
        orderBy: { releaseDate: 'desc' },
      },
    },
  });
};

export const createLabel = async (data: any) => {
  return prisma.label.create({
    data,
    select: labelSelect,
  });
};

export const updateLabel = async (id: string, data: any) => {
  return prisma.label.update({
    where: { id },
    data,
    select: labelSelect,
  });
};

export const deleteLabel = async (id: string) => {
  return prisma.label.delete({
    where: { id },
  });
};
