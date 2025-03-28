"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.toBooleanValue = exports.runValidations = exports.validateField = exports.paginate = void 0;
const paginate = (model_1, req_1, ...args_1) => __awaiter(void 0, [model_1, req_1, ...args_1], void 0, function* (model, req, options = {}) {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const [data, total] = yield Promise.all([
        model.findMany(Object.assign(Object.assign({}, options), { skip, take: limitNumber })),
        model.count({
            where: options.where,
        }),
    ]);
    return {
        data,
        pagination: {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
        },
    };
});
exports.paginate = paginate;
const validateField = (value, fieldName, options = {}) => {
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
exports.validateField = validateField;
const runValidations = (validations) => {
    return validations.filter((error) => error !== null);
};
exports.runValidations = runValidations;
const toBooleanValue = (value) => {
    if (value === undefined)
        return undefined;
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return Boolean(value);
};
exports.toBooleanValue = toBooleanValue;
const handleError = (res, error, operation) => {
    console.error(`${operation} error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({
        message: 'Internal server error',
        error: errorMessage,
    });
};
exports.handleError = handleError;
//# sourceMappingURL=handle-utils.js.map