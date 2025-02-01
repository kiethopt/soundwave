"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const session_middleware_1 = require("../middleware/session.middleware");
const router = express_1.default.Router();
router.post('/register', auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logout);
router.post('/request-password-reset', auth_controller_1.requestPasswordReset);
router.post('/reset-password', auth_controller_1.resetPassword);
router.post('/register-admin', auth_controller_1.registerAdmin);
router.get('/validate-token', auth_middleware_1.authenticate, session_middleware_1.sessionMiddleware, auth_controller_1.validateToken);
router.post('/switch-profile', auth_middleware_1.authenticate, session_middleware_1.sessionMiddleware, auth_controller_1.switchProfile);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map