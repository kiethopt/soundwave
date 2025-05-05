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
exports.getUserClaims = exports.submitArtistClaim = exports.getPlayHistory = exports.setFollowVisibility = exports.getGenreNewestTracks = exports.getGenreTopArtists = exports.getGenreTopTracks = exports.getGenreTopAlbums = exports.getUserTopAlbums = exports.getUserTopArtists = exports.getUserTopTracks = exports.getNewestAlbums = exports.getNewestTracks = exports.getTopTracks = exports.getTopArtists = exports.getTopAlbums = exports.getRecommendedArtists = exports.getUserProfile = exports.checkArtistRequest = exports.editProfile = exports.getFollowing = exports.getFollowers = exports.unfollowUser = exports.followUser = exports.getAllGenres = exports.searchAll = exports.requestToBecomeArtist = void 0;
const userService = __importStar(require("../services/user.service"));
const handle_utils_1 = require("../utils/handle-utils");
const socket_1 = require("../config/socket");
const requestToBecomeArtist = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const createdProfile = await userService.requestArtistRole(currentUser, req.body, req.file);
        try {
            const io = (0, socket_1.getIO)();
            const userSockets = (0, socket_1.getUserSockets)();
            if (currentUser && currentUser.id) {
                const targetSocketId = userSockets.get(currentUser.id);
                if (targetSocketId) {
                    console.log(`🚀 Emitting artist_request_submitted to user ${currentUser.id} via socket ${targetSocketId}`);
                    io.to(targetSocketId).emit('artist_request_submitted', {
                        hasPendingRequest: true,
                        artistProfileId: createdProfile.id
                    });
                }
                else {
                    console.log(`Socket not found for user ${currentUser.id}. Cannot emit request submission update.`);
                }
            }
            else {
                console.warn('[Socket Emit] currentUser or currentUser.id is undefined. Cannot emit socket event.');
            }
        }
        catch (socketError) {
            console.error('[Controller] Failed to emit socket event for artist request submission:', socketError);
        }
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
};
exports.requestToBecomeArtist = requestToBecomeArtist;
const searchAll = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            res.status(400).json({ message: 'Query is required' });
            return;
        }
        const searchQuery = String(q).trim();
        const results = await userService.search(req.user, searchQuery);
        res.json(results);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Search');
    }
};
exports.searchAll = searchAll;
const getAllGenres = async (req, res) => {
    try {
        const genres = await userService.getAllGenres();
        res.json(genres);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all genres');
    }
};
exports.getAllGenres = getAllGenres;
const followUser = async (req, res) => {
    try {
        const { id: followingId } = req.params;
        const result = await userService.followTarget(req.user, followingId);
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
};
exports.followUser = followUser;
const unfollowUser = async (req, res) => {
    try {
        const { id: followingId } = req.params;
        const result = await userService.unfollowTarget(req.user, followingId);
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
};
exports.unfollowUser = unfollowUser;
const getFollowers = async (req, res) => {
    const { id } = req.params;
    try {
        const followers = await userService.getUserFollowers(id);
        res.json(followers);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'User not found') {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            else if (error.message === 'Unauthorized') {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            else if (error.message === 'User ID is required') {
                res.status(400).json({ message: 'User ID is required' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Get followers');
    }
};
exports.getFollowers = getFollowers;
const getFollowing = async (req, res) => {
    const { id } = req.params;
    try {
        const following = await userService.getUserFollowing(id);
        res.json(following);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'User not found') {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            else if (error.message === 'Unauthorized') {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            else if (error.message === 'User ID is required') {
                res.status(400).json({ message: 'User ID is required' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Get following');
    }
};
exports.getFollowing = getFollowing;
const editProfile = async (req, res) => {
    try {
        const updatedUser = await userService.editProfile(req.user, req.body, req.file);
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
};
exports.editProfile = editProfile;
const checkArtistRequest = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const request = await userService.getArtistRequest(req.user.id);
        res.json(request);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Check artist request');
    }
};
exports.checkArtistRequest = checkArtistRequest;
const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserProfile(id);
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
};
exports.getUserProfile = getUserProfile;
const getRecommendedArtists = async (req, res) => {
    try {
        const recommendedArtists = await userService.getRecommendedArtists(req.user);
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
};
exports.getRecommendedArtists = getRecommendedArtists;
const getTopAlbums = async (req, res) => {
    try {
        const topAlbums = await userService.getTopAlbums();
        res.json(topAlbums);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTopAlbums = getTopAlbums;
const getTopArtists = async (req, res) => {
    try {
        const topArtists = await userService.getTopArtists();
        res.json(topArtists);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTopArtists = getTopArtists;
const getTopTracks = async (req, res) => {
    try {
        const topTracks = await userService.getTopTracks();
        res.json(topTracks);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTopTracks = getTopTracks;
const getNewestTracks = async (req, res) => {
    try {
        const tracks = await userService.getNewestTracks();
        res.json(tracks);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getNewestTracks = getNewestTracks;
const getNewestAlbums = async (req, res) => {
    try {
        const albums = await userService.getNewestAlbums();
        res.json(albums);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getNewestAlbums = getNewestAlbums;
const getUserTopTracks = async (req, res) => {
    try {
        const tracks = await userService.getUserTopTracks(req.user);
        res.json(tracks);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUserTopTracks = getUserTopTracks;
const getUserTopArtists = async (req, res) => {
    try {
        const artists = await userService.getUserTopArtists(req.user);
        res.json(artists);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUserTopArtists = getUserTopArtists;
const getUserTopAlbums = async (req, res) => {
    try {
        const albums = await userService.getUserTopAlbums(req.user);
        res.json(albums);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUserTopAlbums = getUserTopAlbums;
const getGenreTopAlbums = async (req, res) => {
    try {
        const { id } = req.params;
        const albums = await userService.getGenreTopAlbums(id);
        res.json(albums);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getGenreTopAlbums = getGenreTopAlbums;
const getGenreTopTracks = async (req, res) => {
    try {
        const { id } = req.params;
        const tracks = await userService.getGenreTopTracks(id);
        res.json(tracks);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getGenreTopTracks = getGenreTopTracks;
const getGenreTopArtists = async (req, res) => {
    try {
        const { id } = req.params;
        const artists = await userService.getGenreTopArtists(id);
        res.json(artists);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getGenreTopArtists = getGenreTopArtists;
const getGenreNewestTracks = async (req, res) => {
    try {
        const { id } = req.params;
        const tracks = await userService.getGenreNewestTracks(id);
        res.json(tracks);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getGenreNewestTracks = getGenreNewestTracks;
const setFollowVisibility = async (req, res) => {
    try {
        const isPublic = req.body.isVisible;
        const result = await userService.setFollowVisibility(req.user, isPublic);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Set follow visibility');
    }
};
exports.setFollowVisibility = setFollowVisibility;
const getPlayHistory = async (req, res) => {
    try {
        const playHistory = await userService.getPlayHistory(req.user);
        res.json(playHistory);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get play history');
    }
};
exports.getPlayHistory = getPlayHistory;
const submitArtistClaim = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser || !currentUser.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const userId = currentUser.id;
        const { artistProfileId, proof } = req.body;
        if (!artistProfileId || !proof) {
            res.status(400).json({ message: 'Artist profile ID and proof are required.' });
            return;
        }
        const claim = await userService.submitArtistClaim(userId, artistProfileId, proof);
        res.status(201).json({ message: 'Claim submitted successfully.', claim });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Unauthorized')) {
                res.status(401).json({ message: error.message });
            }
            else if (error.message.includes('not found') || error.message.includes('already associated') || error.message.includes('already verified')) {
                res.status(404).json({ message: error.message });
            }
            else if (error.message.includes('already have a pending claim') || error.message.includes('already been approved') || error.message.includes('was rejected')) {
                res.status(409).json({ message: error.message });
            }
            else {
                (0, handle_utils_1.handleError)(res, error, 'Submit artist claim');
            }
        }
        else {
            (0, handle_utils_1.handleError)(res, error, 'Submit artist claim');
        }
    }
};
exports.submitArtistClaim = submitArtistClaim;
const getUserClaims = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser || !currentUser.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const userId = currentUser.id;
        const claims = await userService.getUserClaims(userId);
        res.json(claims);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            res.status(401).json({ message: error.message });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, 'Get user claims');
        }
    }
};
exports.getUserClaims = getUserClaims;
//# sourceMappingURL=user.controller.js.map