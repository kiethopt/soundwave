import { Role } from '@prisma/client';
import { File } from 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string | null;
        name: string | null;
        avatar: string | null;
        role: Role;
        currentProfile: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLoginAt: Date | null;
        passwordResetToken: string | null;
        passwordResetExpires: Date | null;
        artistProfile?: {
          id: string;
          artistName: string;
          isVerified: boolean;
          verificationRequestedAt: Date | null;
          role: Role;
          albums: Array<{
            id: string;
            title: string;
            coverUrl: string | null;
            releaseDate: Date;
            duration: number;
            type: AlbumType;
            isActive: boolean;
            tracks: Array<any>;
          }>;
          tracks: Array<any>;
        } | null;
      };
      file?: File;
      files?: {
        audioFile?: File[];
        coverFile?: File[];
      };
    }

    interface Multer {
      File: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      };
    }

    interface Error {
      code?: string;
      status?: number;
    }
  }
}
