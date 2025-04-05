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
exports.convertGoogleAvatar = exports.getMaintenanceStatus = exports.switchProfile = exports.resetPassword = exports.requestPasswordReset = exports.logout = exports.googleRegister = exports.googleLogin = exports.login = exports.register = exports.registerAdmin = exports.validateToken = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
const prisma_selects_1 = require("../utils/prisma-selects");
const emailService = __importStar(require("../services/email.service"));
const aiService = __importStar(require("../services/ai.service"));
const google_auth_library_1 = require("google-auth-library");
const node_fetch_1 = __importDefault(require("node-fetch"));
const cloudinary_1 = require("../utils/cloudinary");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET in environment variables');
}
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email format';
    }
    return null;
};
const validateRegisterData = (data) => {
    const { email, password, username } = data;
    if (!email?.trim())
        return 'Email is required';
    const emailValidationError = validateEmail(email);
    if (emailValidationError)
        return emailValidationError;
    if (!password?.trim())
        return 'Password is required';
    if (password.length < 6)
        return 'Password must be at least 6 characters';
    if (!username?.trim())
        return 'Username is required';
    if (username.length < 3)
        return 'Username must be at least 3 characters';
    if (/\s/.test(username))
        return 'Username cannot contain spaces';
    return null;
};
const generateToken = (userId, role, artistProfile) => {
    return jsonwebtoken_1.default.sign({
        id: userId,
        role,
    }, JWT_SECRET, { expiresIn: '24h' });
};
const validateToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ message: 'Access denied. No token provided.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await db_1.default.user.findUnique({
            where: { id: decoded.id },
            select: prisma_selects_1.userSelect,
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
};
exports.validateToken = validateToken;
const registerAdmin = async (req, res) => {
    try {
        const { email, password, name, username } = req.body;
        const validationError = validateRegisterData({ email, password, username });
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'Email already exists' });
            return;
        }
        if (username) {
            const existingUsername = await db_1.default.user.findUnique({
                where: { username },
            });
            if (existingUsername) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await db_1.default.user.create({
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
};
exports.registerAdmin = registerAdmin;
const register = async (req, res) => {
    try {
        const { email, password, confirmPassword, name, username } = req.body;
        if (password !== confirmPassword) {
            res.status(400).json({ message: 'Passwords do not match' });
            return;
        }
        const validationError = validateRegisterData({ email, password, username });
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'Email already exists' });
            return;
        }
        if (username) {
            const existingUsername = await db_1.default.user.findUnique({
                where: { username },
            });
            if (existingUsername) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await db_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                username,
                role: client_1.Role.USER,
            },
            select: prisma_selects_1.userSelect,
        });
        try {
            const defaultTrackIds = await aiService.generateDefaultPlaylistForNewUser(user.id);
            if (defaultTrackIds.length > 0) {
                const tracksInfo = await db_1.default.track.findMany({
                    where: { id: { in: defaultTrackIds } },
                    select: { id: true, duration: true },
                });
                const totalDuration = tracksInfo.reduce((sum, track) => sum + track.duration, 0);
                const trackIdMap = new Map(tracksInfo.map((t) => [t.id, t]));
                const orderedTrackIds = defaultTrackIds.filter((id) => trackIdMap.has(id));
                await db_1.default.playlist.create({
                    data: {
                        name: 'Welcome Mix',
                        description: 'A selection of popular tracks to start your journey on Soundwave.',
                        privacy: 'PRIVATE',
                        type: 'NORMAL',
                        isAIGenerated: false,
                        userId: user.id,
                        totalTracks: orderedTrackIds.length,
                        totalDuration: totalDuration,
                        tracks: {
                            createMany: {
                                data: orderedTrackIds.map((trackId, index) => ({
                                    trackId,
                                    trackOrder: index,
                                })),
                            },
                        },
                    },
                });
                console.log(`[Register] Created Welcome Mix for new user ${user.id} with ${orderedTrackIds.length} popular tracks.`);
            }
            else {
                console.log(`[Register] No popular tracks found to create Welcome Mix for user ${user.id}.`);
            }
        }
        catch (playlistError) {
            console.error(`[Register] Error creating initial playlists for user ${user.id}:`, playlistError);
        }
        try {
            const emailOptions = emailService.createWelcomeEmail(user.email, user.name || user.username || 'there');
            await emailService.sendEmail(emailOptions);
            console.log(`[Register] Welcome email sent to ${user.email}`);
        }
        catch (emailError) {
            console.error('[Register] Error sending welcome email:', emailError);
        }
        res.status(201).json({ message: 'User registered successfully', user });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        if (!emailOrUsername || !password) {
            res
                .status(400)
                .json({ message: 'Email/username and password are required' });
            return;
        }
        const user = await db_1.default.user.findFirst({
            where: {
                OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
            },
            select: { ...prisma_selects_1.userSelect, password: true, isActive: true },
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid email/username or password' });
            return;
        }
        const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
        if (maintenanceMode && user.role !== client_1.Role.ADMIN) {
            res.status(503).json({
                message: 'The system is currently under maintenance. Please try again later.',
                code: 'MAINTENANCE_MODE',
            });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({
                message: 'Your account has been deactivated. Please contact administrator.',
            });
            return;
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: 'Invalid email/username or password' });
            return;
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                currentProfile: user.role === client_1.Role.ADMIN ? 'ADMIN' : 'USER',
            },
            select: prisma_selects_1.userSelect,
        });
        const token = generateToken(user.id, user.role);
        const userResponse = {
            ...updatedUser,
            password: undefined,
        };
        res.json({
            message: 'Login successful',
            token,
            user: userResponse,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ message: 'Google token is required' });
            return;
        }
        const userInfo = await (0, node_fetch_1.default)('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json());
        if (!userInfo.email) {
            res.status(400).json({ message: 'Invalid Google token' });
            return;
        }
        const { email, name, sub: googleId } = userInfo;
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            res.status(400).json({
                message: 'You do not have a SoundWave account connected to a Google account. If you have a SoundWave account, please try logging in with your SoundWave email or username. If you do not have a SoundWave account, please sign up.',
                code: 'GOOGLE_ACCOUNT_NOT_FOUND'
            });
            return;
        }
        const tokenResponse = generateToken(user.id, user.role);
        res.json({
            message: 'Login successful',
            token: tokenResponse,
            user,
        });
    }
    catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.googleLogin = googleLogin;
const googleRegister = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ message: 'Google token is required' });
            return;
        }
        const userInfo = await (0, node_fetch_1.default)('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json());
        if (!userInfo.email) {
            res.status(400).json({ message: 'Invalid Google token' });
            return;
        }
        const { email, name, sub: googleId, picture: googleAvatarUrl } = userInfo;
        let user = await db_1.default.user.findUnique({ where: { email } });
        if (user) {
            const tokenResponse = generateToken(user.id, user.role);
            res.json({
                message: 'Login successful',
                token: tokenResponse,
                user,
            });
            return;
        }
        let avatar = googleAvatarUrl;
        if (googleAvatarUrl) {
            try {
                const response = await (0, node_fetch_1.default)(googleAvatarUrl);
                const buffer = await response.arrayBuffer();
                const result = await (0, cloudinary_1.uploadToCloudinary)(Buffer.from(buffer), {
                    folder: 'avatars',
                    resource_type: 'image'
                });
                avatar = result.secure_url;
            }
            catch (error) {
                console.error('Error converting Google avatar:', error);
            }
        }
        const randomPassword = (0, uuid_1.v4)();
        const hashedPassword = await bcrypt_1.default.hash(randomPassword, 10);
        user = await db_1.default.user.create({
            data: {
                email,
                name,
                role: client_1.Role.USER,
                password: hashedPassword,
                avatar,
            },
        });
        try {
            const defaultTrackIds = await aiService.generateDefaultPlaylistForNewUser(user.id);
            if (defaultTrackIds.length > 0) {
                const tracksInfo = await db_1.default.track.findMany({
                    where: { id: { in: defaultTrackIds } },
                    select: { id: true, duration: true },
                });
                const totalDuration = tracksInfo.reduce((sum, track) => sum + track.duration, 0);
                const trackIdMap = new Map(tracksInfo.map((t) => [t.id, t]));
                const orderedTrackIds = defaultTrackIds.filter((id) => trackIdMap.has(id));
                await db_1.default.playlist.create({
                    data: {
                        name: 'Welcome Mix',
                        description: 'A selection of popular tracks to start your journey on Soundwave.',
                        privacy: 'PRIVATE',
                        type: 'NORMAL',
                        isAIGenerated: false,
                        userId: user.id,
                        totalTracks: orderedTrackIds.length,
                        totalDuration: totalDuration,
                        tracks: {
                            createMany: {
                                data: orderedTrackIds.map((trackId, index) => ({
                                    trackId,
                                    trackOrder: index,
                                })),
                            },
                        },
                    },
                });
                console.log(`[Google Register] Created Welcome Mix for new user ${user.id} with ${orderedTrackIds.length} popular tracks.`);
            }
            else {
                console.log(`[Google Register] No popular tracks found to create Welcome Mix for user ${user.id}.`);
            }
        }
        catch (playlistError) {
            console.error(`[Google Register] Error creating initial playlists for user ${user.id}:`, playlistError);
        }
        try {
            const emailOptions = emailService.createWelcomeEmail(user.email, user.name || 'there');
            await emailService.sendEmail(emailOptions);
            console.log(`[Google Register] Welcome email sent to ${user.email}`);
        }
        catch (emailError) {
            console.error('[Google Register] Error sending welcome email:', emailError);
        }
        const tokenResponse = generateToken(user.id, user.role);
        res.status(201).json({
            message: 'Registration successful',
            token: tokenResponse,
            user,
        });
    }
    catch (error) {
        console.error('Google register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.googleRegister = googleRegister;
const logout = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        try {
            await db_1.default.user.update({
                where: { id: userId },
                data: {
                    currentProfile: req.user?.role === client_1.Role.ADMIN ? 'ADMIN' : 'USER',
                },
            });
        }
        catch (error) {
            console.error('Error updating user profile:', error);
        }
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.json({ message: 'Logged out successfully' });
    }
};
exports.logout = logout;
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`[Reset Password] Request received for email: ${email}`);
        const user = await db_1.default.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, username: true },
        });
        if (!user) {
            console.log(`[Reset Password] User not found for email: ${email}`);
            res.status(404).json({ message: 'User not found' });
            return;
        }
        console.log(`[Reset Password] User found: ${user.id}`);
        const resetToken = (0, uuid_1.v4)();
        const resetTokenExpiry = (0, date_fns_1.addHours)(new Date(), 1);
        await db_1.default.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: resetToken,
                passwordResetExpires: resetTokenExpiry,
            },
        });
        console.log(`[Reset Password] Reset token generated and saved for user: ${user.id}`);
        const resetLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/reset-password?token=${resetToken}`;
        try {
            const userName = user.name || user.username || 'bạn';
            const emailOptions = emailService.createPasswordResetEmail(user.email, userName, resetLink);
            console.log(`[Reset Password] Attempting to send reset email to: ${user.email}`);
            await emailService.sendEmail(emailOptions);
            console.log(`[Reset Password] Email send attempt finished for: ${user.email}`);
            res.json({ message: 'Password reset email sent successfully' });
            return;
        }
        catch (emailError) {
            console.error('[Reset Password] Failed to send email:', emailError);
            res.status(500).json({ message: 'Failed to send password reset email' });
            return;
        }
    }
    catch (error) {
        console.error('[Reset Password] General error:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
    }
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const user = await db_1.default.user.findFirst({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { gt: new Date() },
            },
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid or expired token' });
            return;
        }
        const isSamePassword = await bcrypt_1.default.compare(newPassword, user.password);
        if (isSamePassword) {
            res.status(400).json({
                message: 'New password cannot be the same as the old password',
            });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await db_1.default.user.update({
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
};
exports.resetPassword = resetPassword;
const switchProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await db_1.default.user.findUnique({
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
        if (!user.artistProfile?.isVerified || !user.artistProfile?.isActive) {
            res.status(403).json({
                message: 'You do not have a verified and active artist profile',
            });
            return;
        }
        const newProfile = user.currentProfile === 'USER' ? 'ARTIST' : 'USER';
        const updatedUser = await db_1.default.user.update({
            where: { id: userId },
            data: { currentProfile: newProfile },
            select: prisma_selects_1.userSelect,
        });
        res.json({
            message: 'Profile switched successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Switch profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.switchProfile = switchProfile;
const getMaintenanceStatus = async (req, res) => {
    try {
        const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
        res.json({ enabled: maintenanceMode });
    }
    catch (error) {
        console.error('Error getting maintenance status:', error);
        res.status(500).json({ message: 'Could not retrieve maintenance status' });
    }
};
exports.getMaintenanceStatus = getMaintenanceStatus;
const convertGoogleAvatar = async (req, res) => {
    try {
        const { googleAvatarUrl } = req.body;
        if (!googleAvatarUrl) {
            res.status(400).json({ error: 'Google avatar URL is required' });
            return;
        }
        const response = await (0, node_fetch_1.default)(googleAvatarUrl);
        const buffer = await response.arrayBuffer();
        const result = await (0, cloudinary_1.uploadToCloudinary)(Buffer.from(buffer), {
            folder: 'avatars',
            resource_type: 'image'
        });
        res.json({ url: result.secure_url });
    }
    catch (error) {
        console.error('Error converting Google avatar:', error);
        res.status(500).json({ error: 'Failed to convert Google avatar' });
    }
};
exports.convertGoogleAvatar = convertGoogleAvatar;
//# sourceMappingURL=auth.controller.js.map