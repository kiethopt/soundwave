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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelById = exports.getAllLabels = void 0;
const labelService = __importStar(require("../services/label.service"));
const handle_utils_1 = require("../utils/handle-utils");
const getAllLabels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield labelService.getAllLabels(req);
        res.json({
            labels: result.data,
            pagination: result.pagination,
        });
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
        const label = yield labelService.createLabel(req);
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
        const updatedLabel = yield labelService.updateLabel(req);
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
        yield labelService.deleteLabel(id);
        res.json({ message: 'Label deleted successfully' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete label');
    }
});
exports.deleteLabel = deleteLabel;
//# sourceMappingURL=label.controller.js.map