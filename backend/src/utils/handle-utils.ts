import { Request, Response } from "express";

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
      totalItems: total,
      currentPage: pageNumber,
      itemsPerPage: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber < Math.ceil(total / limitNumber),
      hasPrevPage: pageNumber > 1,
    },
  };
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
    if (typeof value === "string") {
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
  if (value === undefined || value === null) return undefined;

  // If it's already a boolean, return it directly
  if (typeof value === "boolean") return value;

  // Convert strings to boolean
  if (typeof value === "string") {
    const lowercaseValue = value.toLowerCase();
    if (lowercaseValue === "true") return true;
    if (lowercaseValue === "false") return false;
    // Try to convert to number first, then to boolean
    const num = Number(value);
    if (!isNaN(num)) return Boolean(num);
  }

  // For other types, try to convert to boolean
  return Boolean(value);
};

// Handle common errors
export const handleError = (
  res: Response,
  error: unknown,
  operation: string
): void => {
  // Format error message
  let statusCode = 500;
  let message = "Internal server error";
  console.error(`Error in ${operation}:`, error);

  // Prioritize custom error objects with status and message
  if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
    statusCode = typeof error.status === 'number' ? error.status : 500;
    message = typeof error.message === 'string' ? error.message : "An unexpected error occurred";
  } else if (error instanceof Error) {
    // Check for specific error types and patterns
    if (error.message.startsWith("INVALID_PROMPT:")) {
      // This should be handled by specific controllers before reaching here
      statusCode = 400;
      message = error.message.replace("INVALID_PROMPT:", "").trim();
      console.log(`[AI Error] Invalid prompt detected: ${message}`);
    } else if (
      error.message.includes("Not Found") ||
      error.name === "NotFoundError"
    ) {
      statusCode = 404;
      message = error.message || "Resource not found";
    } else if (
      error.message.includes("Forbidden") ||
      error.message.includes("Not authorized")
    ) {
      statusCode = 403;
      message = error.message;
    } else if (
      error.message.includes("Unauthorized") ||
      error.message.includes("authentication failed")
    ) {
      statusCode = 401;
      message = error.message;
    } else if (
      error.message.includes("Invalid") ||
      error.message.includes("already exists") ||
      error.message.includes("validation failed") ||
      error.name === "ValidationError"
    ) {
      statusCode = 400;
      message = error.message;
    }

    // Default fallback if not a specific pattern
    if (statusCode === 500 && !(typeof error === 'object' && error !== null && 'status' in error && 'message' in error) ) {
      message = (error instanceof Error ? error.message : String(error)) || "Internal server error";
    }
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
  });
};
