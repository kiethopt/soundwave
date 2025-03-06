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
exports.handleError = exports.toBooleanValue = exports.runValidations = exports.validateField = exports.handleCache = exports.paginate = void 0;
const cache_middleware_1 = require("../middleware/cache.middleware");
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
const handleCache = (req_1, fetchDataFn_1, ...args_1) => __awaiter(void 0, [req_1, fetchDataFn_1, ...args_1], void 0, function* (req, fetchDataFn, ttl = 300) {
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = yield cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            console.log(`[Redis] Cache hit for key: ${cacheKey}`);
            return JSON.parse(cachedData);
        }
        console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }
    const data = yield fetchDataFn();
    if (process.env.USE_REDIS_CACHE === 'true' && data) {
        console.log(`[Redis] Caching data for key: ${cacheKey}`);
        yield cache_middleware_1.client.setEx(cacheKey, ttl, JSON.stringify(data));
    }
    return data;
});
exports.handleCache = handleCache;
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
    return value === 'true' || value === true;
};
exports.toBooleanValue = toBooleanValue;
const handleError = (res, error, operation) => {
    console.error(`${operation} error:`, error);
    res.status(500).json({ message: 'Internal server error' });
};
exports.handleError = handleError;
//# sourceMappingURL=handle-utils.js.map