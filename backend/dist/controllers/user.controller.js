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
exports.getNewestAlbums = exports.getNewestTracks = exports.getTopTracks = exports.getTopArtists = exports.getTopAlbums = exports.getRecommendedArtists = exports.getUserProfile = exports.checkArtistRequest = exports.editProfile = exports.getFollowing = exports.getFollowers = exports.unfollowUser = exports.followUser = exports.getAllGenres = exports.searchAll = exports.requestToBecomeArtist = void 0;
const userService = __importStar(require("../services/user.service"));
const handle_utils_1 = require("../utils/handle-utils");
const requestToBecomeArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield userService.requestArtistRole(req.user, req.body, req.file);
        res.json({ message: 'Artist role request submitted successfully' });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Forbidden') {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
            else if (error.message.includes('already requested')) {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message.includes('Invalid JSON format')) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Request artist role');
    }
});
exports.requestToBecomeArtist = requestToBecomeArtist;
const searchAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        if (!q) {
            res.status(400).json({ message: 'Query is required' });
            return;
        }
        const searchQuery = String(q).trim();
        const results = yield userService.search(req.user, searchQuery);
        res.json(results);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Search');
    }
});
exports.searchAll = searchAll;
const getAllGenres = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const genres = yield userService.getAllGenres();
        res.json(genres);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all genres');
    }
});
exports.getAllGenres = getAllGenres;
const followUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: followingId } = req.params;
        const result = yield userService.followTarget(req.user, followingId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Target not found') {
                res.status(404).json({ message: 'Target not found' });
                return;
            }
            else if (error.message === 'Cannot follow yourself') {
                res.status(400).json({ message: 'Cannot follow yourself' });
                return;
            }
            else if (error.message === 'Already following') {
                res.status(400).json({ message: 'Already following' });
                return;
            }
            else if (error.message === 'Unauthorized') {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Follow user');
    }
});
exports.followUser = followUser;
const unfollowUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: followingId } = req.params;
        const result = yield userService.unfollowTarget(req.user, followingId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Target not found') {
                res.status(404).json({ message: 'Target not found' });
                return;
            }
            else if (error.message === 'Not following this target') {
                res.status(400).json({ message: 'Not following this target' });
                return;
            }
            else if (error.message === 'Unauthorized') {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Unfollow user');
    }
});
exports.unfollowUser = unfollowUser;
const getFollowers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const followers = yield userService.getUserFollowers(req);
        res.json(followers);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get followers');
    }
});
exports.getFollowers = getFollowers;
const getFollowing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const following = yield userService.getUserFollowing(req);
        res.json(following);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get following');
    }
});
exports.getFollowing = getFollowing;
const editProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedUser = yield userService.editProfile(req.user, req.body, req.file);
        res.json(updatedUser);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') {
                res.status(401).json({ message: 'Unauthorized' });
            }
            else if (error.message === 'Email already in use') {
                res.status(400).json({ message: 'Email already in use' });
            }
            else if (error.message === 'Username already in use') {
                res.status(400).json({ message: 'Username already in use' });
            }
            else if (error.message === 'No data provided for update') {
                res.status(400).json({ message: 'No data provided for update' });
            }
            else {
                res.status(500).json({ message: 'Internal server error' });
            }
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.editProfile = editProfile;
const checkArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const request = yield userService.getArtistRequest(req.user.id);
        res.json(request);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Check artist request');
    }
});
exports.checkArtistRequest = checkArtistRequest;
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield userService.getUserProfile(id);
        res.json(user);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            res.status(404).json({ message: 'User not found' });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.getUserProfile = getUserProfile;
const getRecommendedArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recommendedArtists = yield userService.getRecommendedArtists(req.user);
        res.json(recommendedArtists);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.getRecommendedArtists = getRecommendedArtists;
const getTopAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const topAlbums = yield userService.getTopAlbums();
        res.json(topAlbums);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTopAlbums = getTopAlbums;
const getTopArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const topArtists = yield userService.getTopArtists();
        res.json(topArtists);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTopArtists = getTopArtists;
const getTopTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const topTracks = yield userService.getTopTracks();
        res.json(topTracks);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTopTracks = getTopTracks;
const getNewestTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tracks = yield userService.getNewestTracks();
        res.json(tracks);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getNewestTracks = getNewestTracks;
const getNewestAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const albums = yield userService.getNewestAlbums();
        res.json(albums);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getNewestAlbums = getNewestAlbums;
//# sourceMappingURL=user.controller.js.map