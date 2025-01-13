import { Role } from '@prisma/client';
import { File } from 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        artistProfileId?: string | null;
        isVerified: boolean;
        verificationRequestedAt?: string | null;
      };
      file?: File;
      files?: {
        audioFile?: File[];
        coverFile?: File[];
      };
    }
  }
}
