"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.post('/', auth_middleware_1.authenticate, report_controller_1.createReport);
router.get('/my-reports', auth_middleware_1.authenticate, report_controller_1.getUserReports);
router.get('/:id', auth_middleware_1.authenticate, report_controller_1.getReportById);
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), report_controller_1.getReports);
router.patch('/:id/resolve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), report_controller_1.resolveReport);
exports.default = router;
//# sourceMappingURL=report.routes.js.map