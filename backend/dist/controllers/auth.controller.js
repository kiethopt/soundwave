"use strict";
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
exports.switchProfile = exports.resetPassword = exports.requestPasswordReset = exports.logout = exports.login = exports.register = exports.registerAdmin = exports.validateToken = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const session_service_1 = require("../services/session.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET in environment variables');
}
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email format';
    }
    return null;
};
const validateRegisterData = (data) => {
    const { email, password, username } = data;
    if (!(email === null || email === void 0 ? void 0 : email.trim()))
        return 'Email is required';
    const emailValidationError = validateEmail(email);
    if (emailValidationError)
        return emailValidationError;
    if (!(password === null || password === void 0 ? void 0 : password.trim()))
        return 'Password is required';
    if (password.length < 6)
        return 'Password must be at least 6 characters';
    if (!(username === null || username === void 0 ? void 0 : username.trim()))
        return 'Username is required';
    if (username.length < 3)
        return 'Username must be at least 3 characters';
    if (/\s/.test(username))
        return 'Username cannot contain spaces';
    return null;
};
const validateLoginData = (data) => {
    const { email, password } = data;
    if (!(email === null || email === void 0 ? void 0 : email.trim()))
        return 'Email is required';
    if (!(password === null || password === void 0 ? void 0 : password.trim()))
        return 'Password is required';
    return null;
};
const generateToken = (userId, role, artistProfile) => {
    return jsonwebtoken_1.default.sign({
        id: userId,
        role,
    }, JWT_SECRET, { expiresIn: '24h' });
};
const cacheConfig = {
    short: { ttl: 300, swr: 60 },
    medium: { ttl: 1800, swr: 300 },
    long: { ttl: 3600, swr: 600 },
};
const validateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ message: 'Access denied. No token provided.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield db_1.default.user.findUnique({
            where: { id: decoded.id },
            select: prisma_selects_1.userSelect,
            cacheStrategy: cacheConfig.medium,
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            message: 'Token is valid',
            user,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.validateToken = validateToken;
const registerAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, username } = req.body;
        const validationError = validateRegisterData({ email, password, username });
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        const existingUser = yield db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'Email already exists' });
            return;
        }
        if (username) {
            const existingUsername = yield db_1.default.user.findUnique({
                where: { username },
            });
            if (existingUsername) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield db_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                username,
                role: client_1.Role.ADMIN,
            },
            select: prisma_selects_1.userSelect,
        });
        res.status(201).json({ message: 'Admin registered successfully', user });
    }
    catch (error) {
        console.error('Register admin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.registerAdmin = registerAdmin;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, username } = req.body;
        const validationError = validateRegisterData({ email, password, username });
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        const existingUser = yield db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'Email already exists' });
            return;
        }
        if (username) {
            const existingUsername = yield db_1.default.user.findUnique({
                where: { username },
            });
            if (existingUsername) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const user = yield db_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                username,
                role: client_1.Role.USER,
            },
            select: prisma_selects_1.userSelect,
        });
        res.status(201).json({ message: 'User registered successfully', user });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const validationError = validateLoginData({ email, password });
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        const user = yield db_1.default.user.findUnique({
            where: { email },
            select: Object.assign(Object.assign({}, prisma_selects_1.userSelect), { password: true, isActive: true }),
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid email or password' });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({
                message: 'Your account has been deactivated. Please contact administrator.',
            });
            return;
        }
        const isValidPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const updatedUser = yield db_1.default.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                currentProfile: user.role === client_1.Role.ADMIN ? 'ADMIN' : 'USER',
            },
            select: prisma_selects_1.userSelect,
        });
        const token = generateToken(user.id, user.role);
        const sessionId = yield session_service_1.sessionService.createSession(Object.assign(Object.assign({}, updatedUser), { password: user.password }));
        const userResponse = Object.assign(Object.assign({}, updatedUser), { password: undefined });
        res.json({
            message: 'Login successful',
            token,
            sessionId,
            user: userResponse,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const sessionId = req.header('Session-ID');
        if (!userId || !sessionId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        try {
            yield db_1.default.user.update({
                where: { id: userId },
                data: {
                    currentProfile: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === client_1.Role.ADMIN ? 'ADMIN' : 'USER',
                },
            });
        }
        catch (error) {
            console.error('Error updating user profile:', error);
        }
        yield session_service_1.sessionService.removeUserSession(userId, sessionId);
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.json({ message: 'Logged out successfully' });
    }
});
exports.logout = logout;
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const resetToken = (0, uuid_1.v4)();
        const resetTokenExpiry = (0, date_fns_1.addHours)(new Date(), 1);
        yield db_1.default.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpires: resetTokenExpiry,
            },
        });
        const resetLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/reset-password?token=${resetToken}`;
        yield sendEmail(user.email, 'Password Reset', `Click here to reset your password: ${resetLink}`);
        res.json({ message: 'Password reset email sent successfully' });
    }
    catch (error) {
        console.error('Request password reset error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        const user = yield db_1.default.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { gt: new Date() },
            },
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid or expired token' });
            return;
        }
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        yield db_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.resetPassword = resetPassword;
const sendEmail = (to, subject, text) => __awaiter(void 0, void 0, void 0, function* () {
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
        to,
        from: process.env.EMAIL_USER,
        subject,
        text,
        html: `<p>${text}</p>`,
    };
    try {
        yield mail_1.default.send(msg);
        console.log('Email sent successfully to:', to);
    }
    catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
});
const switchProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const sessionId = req.header('Session-ID');
        if (!userId || !sessionId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = yield db_1.default.user.findUnique({
            where: { id: userId },
            include: { artistProfile: true },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.artistProfile && !user.artistProfile.isActive) {
            res.status(403).json({
                message: 'Artist profile has been deactivated. Please contact admin.',
            });
            return;
        }
        if (!((_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.isVerified) || !((_c = user.artistProfile) === null || _c === void 0 ? void 0 : _c.isActive)) {
            res.status(403).json({
                message: 'You do not have a verified and active artist profile',
            });
            return;
        }
        const newProfile = user.currentProfile === 'USER' ? 'ARTIST' : 'USER';
        const updatedUser = yield db_1.default.user.update({
            where: { id: userId },
            data: { currentProfile: newProfile },
            select: prisma_selects_1.userSelect,
        });
        yield session_service_1.sessionService.updateSessionProfile(userId, sessionId, newProfile);
        res.json({
            message: 'Profile switched successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Switch profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.switchProfile = switchProfile;
//# sourceMappingURL=auth.controller.js.map