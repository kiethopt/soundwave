"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.updateFileUrl = exports.uploadFile = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const uploadFile = async (fileBuffer, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        cloudinary_1.default.uploader
            .upload_stream({ folder, resource_type: resourceType }, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
            .end(fileBuffer);
    });
};
exports.uploadFile = uploadFile;
const updateFileUrl = async (publicId) => {
    return cloudinary_1.default.url(publicId, { secure: true });
};
exports.updateFileUrl = updateFileUrl;
const deleteFile = async (publicId, resourceType = 'auto') => {
    return cloudinary_1.default.uploader.destroy(publicId, { resource_type: resourceType });
};
exports.deleteFile = deleteFile;
//# sourceMappingURL=upload.service.js.map