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
exports.uploadImage = void 0;
const cloudinary_1 = require("../utils/cloudinary");
const uploadImage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: "Không tìm thấy file",
            });
            return;
        }
        const result = yield (0, cloudinary_1.uploadToCloudinary)(req.file);
        res.json({
            success: true,
            data: {
                url: result.secure_url,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.uploadImage = uploadImage;
//# sourceMappingURL=upload.controller.js.map