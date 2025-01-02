"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', auth_controller_1.register);
router.post('/login', auth_controller_1.login);
router.get('/users', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.getAllUsers);
router.get('/users/id/:id', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.getUserById);
router.get('/users/username/:username', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.getUserByUsername);
router.put('/users/:username', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.updateUser);
router.patch('/users/:username/deactivate', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.deactivateUser);
router.patch('/users/:username/activate', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.activateUser);
router.delete('/users/:username', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.deleteUser);
router.delete('/purge-data', auth_1.isAuthenticated, auth_1.isAdmin, auth_controller_1.purgeAllData);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map