import { Request, Response } from 'express';
import * as labelService from '../services/label.service';
import * as adminService from '../services/admin.service';
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

// === LABEL REGISTRATION CONTROLLERS ===

export const requestNewLabelRegistration = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated or user ID not found.' });
      return;
    }
    const { name, description } = req.body;
    const logoFile = req.file;

    const registrationRequest = await labelService.requestNewLabelRegistration(
      userId,
      { name, description },
      logoFile
    );
    res.status(201).json({
      message: 'Label registration request submitted successfully.',
      data: registrationRequest,
    });
  } catch (error) {
    handleError(res, error, 'Request new label registration');
  }
};

/**
 * Get labels that are selectable by the currently authenticated artist.
 * This includes labels they own (registered and approved) and potentially public labels.
 */
export const getSelectableLabels = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ensure user is authenticated and has an artist profile
    if (!req.user || !req.user.artistProfile || !req.user.artistProfile.id) {
      res.status(403).json({ message: 'Forbidden: Artist profile not found or user not authenticated as artist.' });
      return;
    }

    const artistProfileId = req.user.artistProfile.id;
    const labels = await labelService.getSelectableLabelsForArtist(artistProfileId);
    
    res.status(200).json({ data: labels });
  } catch (error) {
    handleError(res, error, 'Get selectable labels for artist');
  }
};
