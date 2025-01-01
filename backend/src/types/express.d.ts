import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      files?: {
        [fieldname: string]: Express.Multer.File[];
      };
    }
  }
}

export {};
