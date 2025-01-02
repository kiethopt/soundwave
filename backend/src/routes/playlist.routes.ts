import { Router } from 'express';
// import {
//   saveHistory,
//   getHistory,
//   deleteHistory,
//   clearHistory,
// } from '../controllers/playlist.controller';
import { isAuthenticated, checkUserActive } from '../middleware/auth';
