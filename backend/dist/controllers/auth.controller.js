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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeAllData = exports.deleteUser = exports.activateUser = exports.deactivateUser = exports.updateUser = exports.getUserByUsername = exports.getUserById = exports.getAllUsers = exports.login = exports.register = void 0;
const db_1 = __importDefault(require("../config/db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const discord_service_1 = require("../services/discord.service");
const userSelect = {
    id: true,
    email: true,
    username: true,
    name: true,
    avatar: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
};
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, username, password, name, isAdmin } = req.body;
        const existingUser = yield db_1.default.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });
        if (existingUser) {
            res.status(400).json({ message: 'Email hoặc username đã tồn tại!' });
            return;
        }
        const user = yield db_1.default.user.create({
            data: {
                email,
                username,
                password,
                name,
                role: isAdmin ? 'ADMIN' : 'USER',
            },
            select: userSelect,
        });
        yield (0, discord_service_1.sendUserNotification)(username);
        res.status(201).json({
            message: 'User mới đã được tạo thành công',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
            },
        });
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
        const user = yield db_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                username: true,
                password: true,
                name: true,
                avatar: true,
                role: true,
                isActive: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User không tồn tại trong hệ thống.' });
            return;
        }
        if (!user.isActive) {
            res
                .status(403)
                .json({ message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json({
            message: 'Đăng nhập thành công',
            user: userWithoutPassword,
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.login = login;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db_1.default.user.findMany();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllUsers = getAllUsers;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield db_1.default.user.findUnique({
            where: { id },
            select: userSelect,
        });
        if (!user) {
            res
                .status(404)
                .json({ message: 'Không tìm thấy user này trong hệ thống.' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getUserById = getUserById;
const getUserByUsername = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const user = yield db_1.default.user.findUnique({
            where: { username },
            select: userSelect,
        });
        if (!user) {
            res.status(404).json({
                message: `Không tìm thấy user với username: ${username}`,
            });
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getUserByUsername = getUserByUsername;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const { name, email, avatar } = req.body;
        const existingUser = yield db_1.default.user.findUnique({
            where: { username },
        });
        if (!existingUser) {
            res.status(404).json({ message: 'User không tồn tại' });
            return;
        }
        const updatedUser = yield db_1.default.user.update({
            where: { username },
            data: {
                name,
                email,
                avatar,
                updatedAt: new Date(),
            },
            select: userSelect,
        });
        res.json({
            message: 'Cập nhật user thành công',
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateUser = updateUser;
const deactivateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const existingUser = yield db_1.default.user.findUnique({
            where: { username },
        });
        if (!existingUser) {
            res.status(404).json({ message: 'User không tồn tại' });
            return;
        }
        yield db_1.default.user.update({
            where: { username },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
        res.json({
            message: 'Đã vô hiệu hóa tài khoản thành công',
        });
    }
    catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deactivateUser = deactivateUser;
const activateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const existingUser = yield db_1.default.user.findUnique({
            where: { username },
        });
        if (!existingUser) {
            res.status(404).json({ message: 'User không tồn tại' });
            return;
        }
        yield db_1.default.user.update({
            where: { username },
            data: {
                isActive: true,
                updatedAt: new Date(),
            },
        });
        res.json({
            message: 'Đã kích hoạt lại tài khoản thành công',
        });
    }
    catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.activateUser = activateUser;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const existingUser = yield db_1.default.user.findUnique({
            where: { username },
        });
        if (!existingUser) {
            res.status(404).json({ message: 'User không tồn tại.' });
            return;
        }
        yield db_1.default.user.delete({
            where: { username },
        });
        res.json({
            message: 'Đã xóa tài khoản thành công',
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteUser = deleteUser;
const purgeAllData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        yield db_1.default.track.deleteMany();
        yield db_1.default.album.deleteMany();
        yield db_1.default.user.deleteMany({
            where: {
                NOT: {
                    id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
                },
            },
        });
        yield (0, discord_service_1.deleteAllDiscordMessages)();
        res.json({ message: 'All data purged successfully' });
    }
    catch (error) {
        console.error('Purge data error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.purgeAllData = purgeAllData;
//# sourceMappingURL=auth.controller.js.map