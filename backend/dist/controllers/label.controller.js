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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectableLabels = exports.requestNewLabelRegistration = exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelById = exports.getAllLabels = void 0;
const labelService = __importStar(require("../services/label.service"));
const handle_utils_1 = require("../utils/handle-utils");
const getAllLabels = async (req, res) => {
    try {
        const result = await labelService.getAllLabels(req);
        res.json({
            labels: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all labels');
    }
};
exports.getAllLabels = getAllLabels;
const getLabelById = async (req, res) => {
    try {
        const { id } = req.params;
        const label = await labelService.getLabelById(id);
        if (!label) {
            res.status(404).json({ message: 'Label not found' });
            return;
        }
        res.json({ label });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get label by ID');
    }
};
exports.getLabelById = getLabelById;
const createLabel = async (req, res) => {
    try {
        const label = await labelService.createLabel(req);
        res.status(201).json({
            message: 'Label created successfully',
            label,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Create label');
    }
};
exports.createLabel = createLabel;
const updateLabel = async (req, res) => {
    try {
        const updatedLabel = await labelService.updateLabel(req);
        res.json({
            message: 'Label updated successfully',
            label: updatedLabel,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Update label');
    }
};
exports.updateLabel = updateLabel;
const deleteLabel = async (req, res) => {
    try {
        const { id } = req.params;
        await labelService.deleteLabel(id);
        res.json({ message: 'Label deleted successfully' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete label');
    }
};
exports.deleteLabel = deleteLabel;
const requestNewLabelRegistration = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated or user ID not found.' });
            return;
        }
        const { name, description } = req.body;
        const logoFile = req.file;
        const registrationRequest = await labelService.requestNewLabelRegistration(userId, { name, description }, logoFile);
        res.status(201).json({
            message: 'Label registration request submitted successfully.',
            data: registrationRequest,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Request new label registration');
    }
};
exports.requestNewLabelRegistration = requestNewLabelRegistration;
const getSelectableLabels = async (req, res) => {
    try {
        if (!req.user || !req.user.artistProfile || !req.user.artistProfile.id) {
            res.status(403).json({ message: 'Forbidden: Artist profile not found or user not authenticated as artist.' });
            return;
        }
        const artistProfileId = req.user.artistProfile.id;
        const labels = await labelService.getSelectableLabelsForArtist(artistProfileId);
        res.status(200).json({ data: labels });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get selectable labels for artist');
    }
};
exports.getSelectableLabels = getSelectableLabels;
//# sourceMappingURL=label.controller.js.map