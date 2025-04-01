import { Request, Response } from 'express';
import prisma from '../config/db';
import * as labelService from '../services/label.service';
import { uploadFile } from '../services/upload.service';
import {
  handleError,
  runValidations,
  validateField,
} from '../utils/handle-utils';

export const getAllLabels = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const labels = await labelService.getAllLabels();
    res.json({ labels });
  } catch (error) {
    handleError(res, error, 'Get all labels');
  }
};

export const getLabelById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const label = await labelService.getLabelById(id);

    if (!label) {
      res.status(404).json({ message: 'Label not found' });
      return;
    }

    res.json({ label });
  } catch (error) {
    handleError(res, error, 'Get label by ID');
  }
};

export const createLabel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const logoFile = req.file;

    // Validate label data
    const errors = runValidations([
      validateField(name, 'name', { required: true }),
    ]);

    if (errors.length > 0) {
      res.status(400).json({ message: 'Validation failed', errors });
      return;
    }

    // Check if label with this name already exists
    const existingLabel = await prisma.label.findUnique({
      where: { name },
    });

    if (existingLabel) {
      res
        .status(400)
        .json({ message: 'A label with this name already exists' });
      return;
    }

    let logoUrl: string | undefined;

    if (logoFile) {
      const uploadResult = await uploadFile(logoFile.buffer, 'labels', 'image');
      logoUrl = uploadResult.secure_url;
    }

    const label = await labelService.createLabel({
      name,
      description,
      logoUrl,
    });

    res.status(201).json({
      message: 'Label created successfully',
      label,
    });
  } catch (error) {
    handleError(res, error, 'Create label');
  }
};

export const updateLabel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const logoFile = req.file;

    // Check if label exists
    const existingLabel = await prisma.label.findUnique({
      where: { id },
    });

    if (!existingLabel) {
      res.status(404).json({ message: 'Label not found' });
      return;
    }

    // Check if new name conflicts with another label
    if (name && name !== existingLabel.name) {
      const nameConflict = await prisma.label.findUnique({
        where: { name },
      });

      if (nameConflict) {
        res
          .status(400)
          .json({ message: 'A label with this name already exists' });
        return;
      }
    }

    let updateData: any = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (logoFile) {
      const uploadResult = await uploadFile(logoFile.buffer, 'labels', 'image');
      updateData.logoUrl = uploadResult.secure_url;
    }

    const updatedLabel = await labelService.updateLabel(id, updateData);

    res.json({
      message: 'Label updated successfully',
      label: updatedLabel,
    });
  } catch (error) {
    handleError(res, error, 'Update label');
  }
};

export const deleteLabel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if label exists
    const existingLabel = await prisma.label.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            albums: true,
            tracks: true,
          },
        },
      },
    });

    if (!existingLabel) {
      res.status(404).json({ message: 'Label not found' });
      return;
    }

    // Check if label has associated albums or tracks
    if (existingLabel._count.albums > 0 || existingLabel._count.tracks > 0) {
      res.status(400).json({
        message:
          'Cannot delete label with associated albums or tracks. Remove the associations first.',
        albums: existingLabel._count.albums,
        tracks: existingLabel._count.tracks,
      });
      return;
    }

    await labelService.deleteLabel(id);

    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Delete label');
  }
};
