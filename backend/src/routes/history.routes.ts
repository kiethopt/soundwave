import { Router } from 'express';
// import {
//   saveHistory,
//   getHistory,
//   deleteHistory,
//   clearHistory,
// } from '../controllers/history.controller';
import { isAuthenticated, checkUserActive } from '../middleware/auth';

const router = Router();

export default router;
