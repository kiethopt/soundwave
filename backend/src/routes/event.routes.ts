import express, { Request, Response, NextFunction } from 'express';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  searchEvent,
  addTracksToEvent,
  getAllEvents,
  playEvent,
  toggleEventVisibility,
  joinEvent,
  cancelJoinEvent,
} from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();


const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): express.RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).then(() => {
    }).catch(next);
  };
};


router.post(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.single('coverFile'),
  handleUploadError,
  asyncHandler(createEvent)
);

router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.single('coverFile'),
  handleUploadError,
  asyncHandler(updateEvent)
);

router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  asyncHandler(deleteEvent)
);


router.put(
  '/:id/toggle-visibility',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  asyncHandler(toggleEventVisibility)
);


router.post(
  '/:eventId/tracks',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.array('tracks'),
  handleUploadError,
  asyncHandler(addTracksToEvent)
);


router.get('/search', authenticate, cacheMiddleware, asyncHandler(searchEvent));


router.post('/:eventId/play', authenticate, cacheMiddleware, asyncHandler(playEvent));


router.post('/:id/join', authenticate, asyncHandler(joinEvent));
router.post('/:id/cancel', authenticate, asyncHandler(cancelJoinEvent));


router.get('/:id', authenticate, cacheMiddleware, asyncHandler(getEventById));


router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  asyncHandler(getAllEvents)
);

export default router;
