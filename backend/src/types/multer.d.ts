import { Request, Response, NextFunction } from 'express';

declare module 'multer' {
  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface MulterError extends Error {
    code: string;
    field: string;
  }

  type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

  interface DiskStorageOptions {
    destination?(
      req: Request,
      file: File,
      callback: (error: Error | null, destination: string) => void
    ): void;
    filename?(
      req: Request,
      file: File,
      callback: (error: Error | null, filename: string) => void
    ): void;
  }

  function memoryStorage(): StorageEngine;

  interface Multer {
    single(
      name: string
    ): (req: Request, res: Response, next: NextFunction) => void;
    array(
      name: string,
      maxCount?: number
    ): (req: Request, res: Response, next: NextFunction) => void;
    fields(
      fields: ReadonlyArray<{ name: string; maxCount?: number }>
    ): (req: Request, res: Response, next: NextFunction) => void;
    none(): (req: Request, res: Response, next: NextFunction) => void;
    any(): (req: Request, res: Response, next: NextFunction) => void;
  }

  interface StorageEngine {
    _handleFile(
      req: Request,
      file: File,
      callback: (error?: any, info?: Partial<File>) => void
    ): void;
    _removeFile(
      req: Request,
      file: File,
      callback: (error: Error) => void
    ): void;
  }

  const multer: (options?: any) => Multer;
  export = multer;
}
