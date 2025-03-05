import { Request, Response } from 'express';
import { client } from '../middleware/cache.middleware';

// Xử lý phân trang
export const paginate = async <T>(
  model: any,
  req: Request,
  options: {
    where?: any;
    select?: any;
    include?: any;
    orderBy?: any;
  } = {}
) => {
  // Extract pagination params from request
  const { page = 1, limit = 10 } = req.query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  // Execute queries in parallel for better performance
  const [data, total] = await Promise.all([
    model.findMany({
      ...options,
      skip,
      take: limitNumber,
    }),
    model.count({
      where: options.where,
    }),
  ]);

  // Return formatted response
  return {
    data,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
  };
};

// Xử lý cache
export const handleCache = async <T>(
  req: Request,
  fetchDataFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> => {
  const cacheKey = req.originalUrl;

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Redis] Cache miss for key: ${cacheKey}`);
  }

  const data = await fetchDataFn();

  if (process.env.USE_REDIS_CACHE === 'true' && data) {
    console.log(`[Redis] Caching data for key: ${cacheKey}`);
    await client.setEx(cacheKey, ttl, JSON.stringify(data));
  }

  return data;
};

// Validation helper
export const validateField = (
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    message?: string;
    enum?: string[];
  } = {}
) => {
  if (options.required && !value) {
    return `${fieldName} is required`;
  }

  if (value) {
    if (typeof value === 'string') {
      if (options.minLength && value.length < options.minLength) {
        return `${fieldName} must be at least ${options.minLength} characters long`;
      }

      if (options.maxLength && value.length > options.maxLength) {
        return `${fieldName} exceeds maximum length (${options.maxLength} characters)`;
      }

      if (options.pattern && !options.pattern.test(value)) {
        return options.message || `Invalid ${fieldName} format`;
      }
    }

    if (options.enum && !options.enum.includes(value)) {
      return `Invalid ${fieldName} value`;
    }
  }

  return null;
};

// Collect and filter validation errors
export const runValidations = (validations: (string | null)[]) => {
  return validations.filter((error): error is string => error !== null);
};

// Convert string value to boolean
export const toBooleanValue = (value: any): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === 'true' || value === true;
};

// Handle common errors
export const handleError = (
  res: Response,
  error: any,
  operation: string
): void => {
  console.error(`${operation} error:`, error);
  res.status(500).json({ message: 'Internal server error' });
};
