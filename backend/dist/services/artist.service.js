// dist/artist.controller.js
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
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
exports.getRelatedArtists = exports.getArtistStats = exports.updateArtistProfile = exports.getArtistTracks = exports.getArtistAlbums = exports.getArtistProfile = exports.getAllArtistsProfile = void 0;
const client_1 = require("@prisma/client");
const artistService = __importStar(require("../services/artist.service"));

const validateUpdateArtistProfile = (data) => {
    const { bio, socialMediaLinks, genreIds } = data;
    if (bio && bio.length > 500) {
        return 'Bio must be less than 500 characters';
    }
    if (socialMediaLinks) {
        if (typeof socialMediaLinks !== 'object') {
            return 'Social media links must be an object';
        }
        const validKeys = ['facebook', 'instagram', 'twitter', 'youtube'];
        for (const key of Object.keys(socialMediaLinks)) {
            if (!validKeys.includes(key)) {
                return `Invalid social media key: ${key}`;
            }
            if (typeof socialMediaLinks[key] !== 'string') {
                return `Social media link for ${key} must be a string`;
            }
        }
    }
    if (genreIds) {
        if (!Array.isArray(genreIds)) {
            return 'Genre IDs must be an array';
        }
        if (genreIds.some((id) => typeof id !== 'string')) {
            return 'All genre IDs must be strings';
        }
    }
    return null;
};

const getAllArtistsProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10 } = req.query;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (
            user.role !== client_1.Role.ADMIN &&
            (!user.artistProfile?.isVerified || user.currentProfile !== 'ARTIST')
        ) {
            res.status(403).json({
                message: 'You do not have permission to perform this action',
                code: 'SWITCH_TO_ARTIST_PROFILE',
            });
            return;
        }
        const result = yield artistService.ArtistService.getAllArtistsProfile(
            user,
            Number(page),
            Number(limit)
        );
        res.json(result);
    } catch (error) {
        console.error('Get all artists profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllArtistsProfile = getAllArtistsProfile;

const getArtistProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const artist = yield artistService.ArtistService.getArtistProfile(id);
        if (!artist) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        res.json(artist);
    } catch (error) {
        console.error('Error fetching artist profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistProfile = getArtistProfile;

const getArtistAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const result = yield artistService.ArtistService.getArtistAlbums(
            user,
            id,
            Number(page),
            Number(limit)
        );
        if (!result) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        res.json(result);
    } catch (error) {
        console.error('Error fetching artist albums:', error);
        if (error.message === 'Artist is not verified') {
            res.status(403).json({ message: 'Artist is not verified' });
            return;
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistAlbums = getArtistAlbums;

const getArtistTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const result = yield artistService.ArtistService.getArtistTracks(
            user,
            id,
            Number(page),
            Number(limit)
        );
        if (!result) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        res.json(result);
    } catch (error) {
        console.error('Error fetching artist tracks:', error);
        if (error.message === 'Artist is not verified') {
            res.status(403).json({ message: 'Artist is not verified' });
            return;
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistTracks = getArtistTracks;

const updateArtistProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { bio, socialMediaLinks, genreIds, isVerified, artistName } = req.body;
        const files = req.files;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        let parsedSocialMediaLinks = socialMediaLinks;
        if (typeof socialMediaLinks === 'string') {
            try {
                parsedSocialMediaLinks = JSON.parse(socialMediaLinks);
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid socialMediaLinks format',
                });
                return;
            }
        }
        let parsedGenreIds = genreIds;
        if (typeof genreIds === 'string') {
            try {
                parsedGenreIds = genreIds.split(',');
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid genreIds format',
                });
                return;
            }
        }
        const error = validateUpdateArtistProfile({
            bio,
            socialMediaLinks: parsedSocialMediaLinks,
            genreIds: parsedGenreIds,
        });
        if (error) {
            res.status(400).json({
                success: false,
                message: error,
            });
            return;
        }
        const updatedArtistProfile = yield artistService.ArtistService.updateArtistProfile(
            user,
            id,
            {
                bio,
                socialMediaLinks: parsedSocialMediaLinks,
                genreIds: parsedGenreIds,
                isVerified,
                artistName,
            },
            files
        );
        res.status(200).json({
            success: true,
            message: 'Artist profile updated successfully',
            data: updatedArtistProfile,
        });
    } catch (error) {
        console.error('Update artist profile error:', error);
        res.status(403).json({
            success: false,
            message: error.message || 'Internal server error',
        });
    }
});
exports.updateArtistProfile = updateArtistProfile;

const getArtistStats = (req, res) => __awaiter(void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const stats = yield artistService.ArtistService.getArtistStats(user);
        res.json(stats);
    } catch (error) {
        console.error('Get artist stats error:', error);
        res.status(error.message === 'Forbidden' ? 403 : 500).json({
            message: error.message || 'Internal server error',
        });
    }
});
exports.getArtistStats = getArtistStats;

const getRelatedArtists = (req, res) => __awaiter(void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const relatedArtists = yield artistService.ArtistService.getRelatedArtists(id);
        res.json(relatedArtists);
    } catch (error) {
        console.error('Get related artists error:', error);
        res.status(error.message === 'Artist not found' ? 404 : 500).json({
            message: error.message || 'Internal server error',
        });
    }
});
exports.getRelatedArtists = getRelatedArtists;
//# sourceMappingURL=artist.controller.js.map