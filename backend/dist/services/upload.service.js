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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.updateFileUrl = exports.uploadFile = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const uploadFile = (fileBuffer_1, folder_1, ...args_1) => __awaiter(void 0, [fileBuffer_1, folder_1, ...args_1], void 0, function* (fileBuffer, folder, resourceType = 'auto') {
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
});
exports.uploadFile = uploadFile;
const updateFileUrl = (publicId) => __awaiter(void 0, void 0, void 0, function* () {
    return cloudinary_1.default.url(publicId, { secure: true });
});
exports.updateFileUrl = updateFileUrl;
const deleteFile = (publicId_1, ...args_1) => __awaiter(void 0, [publicId_1, ...args_1], void 0, function* (publicId, resourceType = 'auto') {
    return cloudinary_1.default.uploader.destroy(publicId, { resource_type: resourceType });
});
exports.deleteFile = deleteFile;
//# sourceMappingURL=upload.service.js.map