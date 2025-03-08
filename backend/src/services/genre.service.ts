import prisma from '../config/db';
import { paginate } from '../utils/handle-utils';
import { Request } from 'express';

export const getAllGenres = async (req: Request) => {
  const options = {
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  };

  const result = await paginate(prisma.genre, req, options);

  return {
    genres: result.data,
    pagination: result.pagination,
  };
};
