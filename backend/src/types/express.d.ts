import { Role } from '@prisma/client';
import { File } from 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        isVerified: boolean;
        verificationRequestedAt?: string;
      };
      files?: {
        audioFile?: File[];
        coverFile?: File[];
      };
    }
  }
}
