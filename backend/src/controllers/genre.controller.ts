import { Request, Response } from 'express';
import * as genreService from '../services/genre.service';
import { handleError } from '../utils/handle-utils';

export const getAllGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { genres, pagination } = await genreService.getAllGenres(req);

    res.json({
      genres,
      pagination,
    });
  } catch (error) {
    handleError(res, error, 'Get all genres');
  }
};
