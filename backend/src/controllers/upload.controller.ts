import { RequestHandler } from "express";
import { uploadToCloudinary } from "../utils/cloudinary";

export const uploadImage: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Không tìm thấy file",
      });
      return;
    }

    const result = await uploadToCloudinary(req.file);

    res.json({
      success: true,
      data: {
        url: result.secure_url,
      },
    });
  } catch (error) {
    next(error);
  }
};
