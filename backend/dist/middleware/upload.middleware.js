"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = void 0;
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image and audio files are allowed'));
        }
    },
});
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res
                .status(400)
                .json({ message: 'File too large. Maximum allowed size is 10MB.' });
        }
        else {
            res.status(400).json({ message: err.message });
        }
    }
    else if (err) {
        res.status(400).json({ message: err.message });
    }
    else {
        next();
    }
};
exports.handleUploadError = handleUploadError;
exports.default = upload;
//# sourceMappingURL=upload.middleware.js.map