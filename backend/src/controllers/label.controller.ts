import { Request, Response } from 'express';
import * as labelService from '../services/label.service';
import { handleError } from '../utils/handle-utils';

export const getAllLabels = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await labelService.getAllLabels(req);
    res.json({
      labels: result.data,
      pagination: result.pagination,
    });
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
    const label = await labelService.createLabel(req);
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
    const updatedLabel = await labelService.updateLabel(req);
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
    await labelService.deleteLabel(id);
    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Delete label');
  }
};
