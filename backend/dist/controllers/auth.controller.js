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
exports.getMaintenanceStatus = exports.switchProfile = exports.resetPassword = exports.requestPasswordReset = exports.logout = exports.login = exports.register = exports.registerAdmin = exports.validateToken = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
const mail_1 = __importDefault(require("@sendgrid/mail"));
const prisma_selects_1 = require("../utils/prisma-selects");
const playlist_service_1 = require("../services/playlist.service");
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
const generateToken = (userId, role, artistProfile) => {
    return jsonwebtoken_1.default.sign({
        id: userId,
        role,
    }, JWT_SECRET, { expiresIn: '24h' });
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
        try {
            yield playlist_service_1.systemPlaylistService.initializeForNewUser(user.id);
            console.log(`System playlists initialized for new user: ${user.id}`);
        }
        catch (error) {
            console.error('Failed to initialize system playlists for new user:', error);
        }
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
        const { emailOrUsername, password } = req.body;
        if (!emailOrUsername || !password) {
            res
                .status(400)
                .json({ message: 'Email/username and password are required' });
            return;
        }
        const user = yield db_1.default.user.findFirst({
            where: {
                OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
            },
            select: Object.assign(Object.assign({}, prisma_selects_1.userSelect), { password: true, isActive: true }),
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
        const isValidPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ message: 'Invalid email/username or password' });
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
        const userResponse = Object.assign(Object.assign({}, updatedUser), { password: undefined });
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
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
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
        yield sendEmail(user.email, 'Password Reset', resetLink);
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
        const isSamePassword = yield bcrypt_1.default.compare(newPassword, user.password);
        if (isSamePassword) {
            res
                .status(400)
                .json({
                message: 'New password cannot be the same as the old password',
            });
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
const sendEmail = (to, subject, resetLink) => __awaiter(void 0, void 0, void 0, function* () {
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
        to,
        from: process.env.EMAIL_USER,
        subject,
        text: `Click here to reset your password: ${resetLink}`,
        html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your SoundWave Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; color: #333333;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-spacing: 0; border-collapse: collapse;">
          <!-- Header with logo -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #1a1a1a; padding: 20px 0; text-align: center;">
                    <img src="https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743396192/fcazc9wdyqvaz1c3xwg7.png" alt="SoundWave" width="200" style="display: block; margin: 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Rest of the email template remains the same -->
          <tr>
            <td style="padding: 0;">
              <div style="background: linear-gradient(135deg, #A57865 0%, #3a3a3a 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
                <p style="color: #ffffff; opacity: 0.9; margin: 15px 0 0; font-size: 16px;">We've received a request to reset your password</p>
              </div>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">Hi ${to.split('@')[0]},</p>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">We received a request to reset your SoundWave password. Use the button below to set up a new password for your account. This link is only valid for the next hour.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 15px 35px; border-radius: 6px; font-weight: 600; font-size: 16px; border: 2px solid #000000; transition: all 0.3s ease;">RESET PASSWORD</a>
                    </div>
                    
                    <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Security note section -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #f5f5f5; padding: 25px 30px; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">For security, this request was received from your SoundWave account. This link will expire in 60 minutes.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer with music note decoration -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                    <div style="margin-bottom: 20px; font-size: 0;">
                      <!-- Music notes decoration -->
                      <span style="display: inline-block; width: 8px; height: 8px; background-color: #A57865; margin: 0 5px; border-radius: 50%;"></span>
                      <span style="display: inline-block; width: 8px; height: 15px; background-color: #A57865; margin: 0 5px; border-radius: 4px;"></span>
                      <span style="display: inline-block; width: 8px; height: 12px; background-color: #A57865; margin: 0 5px; border-radius: 4px;"></span>
                      <span style="display: inline-block; width: 8px; height: 18px; background-color: #A57865; margin: 0 5px; border-radius: 4px;"></span>
                      <span style="display: inline-block; width: 8px; height: 8px; background-color: #A57865; margin: 0 5px; border-radius: 50%;"></span>
                    </div>
                    
                    <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #ffffff;">This email was sent to ${to}</p>
                    <p style="margin: 0 0 15px; font-size: 14px; line-height: 1.6; color: #cccccc;">This is an automated message. Please do not reply.</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #cccccc;">© ${new Date().getFullYear()} SoundWave. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
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
        if (!userId) {
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
const getMaintenanceStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
        res.json({ enabled: maintenanceMode });
    }
    catch (error) {
        console.error('Error getting maintenance status:', error);
        res.status(500).json({ message: 'Could not retrieve maintenance status' });
    }
});
exports.getMaintenanceStatus = getMaintenanceStatus;
//# sourceMappingURL=auth.controller.js.map