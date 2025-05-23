"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.toBooleanValue = exports.runValidations = exports.validateField = exports.paginate = void 0;
const paginate = async (model, req, options = {}) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
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
exports.paginate = paginate;
const validateField = (value, fieldName, options = {}) => {
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
exports.validateField = validateField;
const runValidations = (validations) => {
    return validations.filter((error) => error !== null);
};
exports.runValidations = runValidations;
const toBooleanValue = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const lowercaseValue = value.toLowerCase();
        if (lowercaseValue === "true")
            return true;
        if (lowercaseValue === "false")
            return false;
        const num = Number(value);
        if (!isNaN(num))
            return Boolean(num);
    }
    return Boolean(value);
};
exports.toBooleanValue = toBooleanValue;
const handleError = (res, error, operation) => {
    let statusCode = 500;
    let message = "Internal server error";
    console.error(`Error in ${operation}:`, error);
    if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
        statusCode = typeof error.status === 'number' ? error.status : 500;
        message = typeof error.message === 'string' ? error.message : "An unexpected error occurred";
    }
    else if (error instanceof Error) {
        if (error.message.startsWith("INVALID_PROMPT:")) {
            statusCode = 400;
            message = error.message.replace("INVALID_PROMPT:", "").trim();
            console.log(`[AI Error] Invalid prompt detected: ${message}`);
        }
        else if (error.message.includes("Not Found") ||
            error.name === "NotFoundError") {
            statusCode = 404;
            message = error.message || "Resource not found";
        }
        else if (error.message.includes("Forbidden") ||
            error.message.includes("Not authorized")) {
            statusCode = 403;
            message = error.message;
        }
        else if (error.message.includes("Unauthorized") ||
            error.message.includes("authentication failed")) {
            statusCode = 401;
            message = error.message;
        }
        else if (error.message.includes("Invalid") ||
            error.message.includes("already exists") ||
            error.message.includes("validation failed") ||
            error.name === "ValidationError") {
            statusCode = 400;
            message = error.message;
        }
        if (statusCode === 500 && !(typeof error === 'object' && error !== null && 'status' in error && 'message' in error)) {
            message = (error instanceof Error ? error.message : String(error)) || "Internal server error";
        }
    }
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.handleError = handleError;
//# sourceMappingURL=handle-utils.js.map