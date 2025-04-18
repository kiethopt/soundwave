import { Request, Response } from 'express';
import * as historyService from '../services/history.service';
import { handleError } from '../utils/handle-utils';

// Lưu lịch sử nghe nhạc
export const savePlayHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { trackId, duration, completed } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!trackId) {
      res.status(400).json({ message: 'Track ID is required' });
      return;
    }

    const history = await historyService.savePlayHistoryService(
      user.id,
      trackId,
      duration,
      completed
    );

    res.status(201).json({
      message: 'Play history saved successfully',
      history,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Track not found') {
        res.status(404).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, 'Save play history');
  }
};

// Lưu lịch sử tìm kiếm
export const saveSearchHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const history = await historyService.saveSearchHistoryService(user.id, query);

    res.status(201).json({
      message: 'Search history saved successfully',
      history,
    });
  } catch (error) {
     if (error instanceof Error && error.message === 'Search query is required') {
        res.status(400).json({ message: error.message });
        return;
      }
    handleError(res, error, 'Save search history');
  }
};

// Lấy lịch sử nghe nhạc của người dùng
export const getPlayHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await historyService.getPlayHistoryService(req);
    res.json({
      histories: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
     if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(401).json({ message: error.message });
        return;
      }
    handleError(res, error, 'Get play history');
  }
};

// Lấy lịch sử tìm kiếm của người dùng
export const getSearchHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await historyService.getSearchHistoryService(req);
    res.json(result); // Service now returns the correct structure with pagination
  } catch (error) {
     if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(401).json({ message: error.message });
        return;
      }
    handleError(res, error, 'Get search history');
  }
};

// Lấy tất cả lịch sử (nghe nhạc và tìm kiếm) của người dùng
export const getAllHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await historyService.getAllHistoryService(req);
    res.json({
      histories: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
     if (error instanceof Error && error.message === 'Unauthorized') {
        res.status(401).json({ message: error.message });
        return;
      }
    handleError(res, error, 'Get all history');
  }
};

// Lấy gợi ý tìm kiếm dựa trên lịch sử
export const getSearchSuggestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 5;
    const suggestions = await historyService.getSearchSuggestionsService(user.id, limit);

    res.json(suggestions);
  } catch (error) {
    handleError(res, error, 'Get search suggestions');
  }
};

// Xóa lịch sử tìm kiếm của người dùng
export const deleteSearchHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await historyService.deleteSearchHistoryService(user.id);

    res.status(200).json({ 
      message: `Successfully deleted ${result.count} search history entries.`,
      count: result.count 
    });
  } catch (error) {
    handleError(res, error, 'Delete search history');
  }
};
