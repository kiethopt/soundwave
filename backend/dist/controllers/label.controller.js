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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelById = exports.getAllLabels = void 0;
const db_1 = __importDefault(require("../config/db"));
const labelService = __importStar(require("../services/label.service"));
const upload_service_1 = require("../services/upload.service");
const handle_utils_1 = require("../utils/handle-utils");
const getAllLabels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const labels = yield labelService.getAllLabels();
        res.json({ labels });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all labels');
    }
});
exports.getAllLabels = getAllLabels;
const getLabelById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const label = yield labelService.getLabelById(id);
        if (!label) {
            res.status(404).json({ message: 'Label not found' });
            return;
        }
        res.json({ label });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get label by ID');
    }
});
exports.getLabelById = getLabelById;
const createLabel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        const logoFile = req.file;
        const errors = (0, handle_utils_1.runValidations)([
            (0, handle_utils_1.validateField)(name, 'name', { required: true }),
        ]);
        if (errors.length > 0) {
            res.status(400).json({ message: 'Validation failed', errors });
            return;
        }
        const existingLabel = yield db_1.default.label.findUnique({
            where: { name },
        });
        if (existingLabel) {
            res
                .status(400)
                .json({ message: 'A label with this name already exists' });
            return;
        }
        let logoUrl;
        if (logoFile) {
            const uploadResult = yield (0, upload_service_1.uploadFile)(logoFile.buffer, 'labels', 'image');
            logoUrl = uploadResult.secure_url;
        }
        const label = yield labelService.createLabel({
            name,
            description,
            logoUrl,
        });
        res.status(201).json({
            message: 'Label created successfully',
            label,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Create label');
    }
});
exports.createLabel = createLabel;
const updateLabel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const logoFile = req.file;
        const existingLabel = yield db_1.default.label.findUnique({
            where: { id },
        });
        if (!existingLabel) {
            res.status(404).json({ message: 'Label not found' });
            return;
        }
        if (name && name !== existingLabel.name) {
            const nameConflict = yield db_1.default.label.findUnique({
                where: { name },
            });
            if (nameConflict) {
                res
                    .status(400)
                    .json({ message: 'A label with this name already exists' });
                return;
            }
        }
        let updateData = {};
        if (name)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (logoFile) {
            const uploadResult = yield (0, upload_service_1.uploadFile)(logoFile.buffer, 'labels', 'image');
            updateData.logoUrl = uploadResult.secure_url;
        }
        const updatedLabel = yield labelService.updateLabel(id, updateData);
        res.json({
            message: 'Label updated successfully',
            label: updatedLabel,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Update label');
    }
});
exports.updateLabel = updateLabel;
const deleteLabel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existingLabel = yield db_1.default.label.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        albums: true,
                        tracks: true,
                    },
                },
            },
        });
        if (!existingLabel) {
            res.status(404).json({ message: 'Label not found' });
            return;
        }
        if (existingLabel._count.albums > 0 || existingLabel._count.tracks > 0) {
            res.status(400).json({
                message: 'Cannot delete label with associated albums or tracks. Remove the associations first.',
                albums: existingLabel._count.albums,
                tracks: existingLabel._count.tracks,
            });
            return;
        }
        yield labelService.deleteLabel(id);
        res.json({ message: 'Label deleted successfully' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete label');
    }
});
exports.deleteLabel = deleteLabel;
//# sourceMappingURL=label.controller.js.map