"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const label_controller_1 = require("../controllers/label.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const upload_middleware_1 = __importStar(require("../middleware/upload.middleware"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const router = express_1.default.Router();
router.get('/', cache_middleware_1.cacheMiddleware, label_controller_1.getAllLabels);
router.get('/:id', cache_middleware_1.cacheMiddleware, label_controller_1.getLabelById);
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), upload_middleware_1.default.single('logoFile'), upload_middleware_1.handleUploadError, label_controller_1.createLabel);
router.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), upload_middleware_1.default.single('logoFile'), upload_middleware_1.handleUploadError, label_controller_1.updateLabel);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), label_controller_1.deleteLabel);
exports.default = router;
//# sourceMappingURL=label.routes.js.map