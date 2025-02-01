"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const history_controller_1 = require("../controllers/history.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post('/play', auth_middleware_1.authenticate, history_controller_1.savePlayHistory);
router.post('/search', auth_middleware_1.authenticate, history_controller_1.saveSearchHistory);
router.get('/play', auth_middleware_1.authenticate, history_controller_1.getPlayHistory);
router.get('/search', auth_middleware_1.authenticate, history_controller_1.getSearchHistory);
router.get('/', auth_middleware_1.authenticate, history_controller_1.getAllHistory);
exports.default = router;
//# sourceMappingURL=history.routes.js.map