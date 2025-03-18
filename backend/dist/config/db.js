"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const auth_extension_1 = require("../prisma/extensions/auth.extension");
const admin_extension_1 = require("../prisma/extensions/admin.extension");
const artist_extension_1 = require("../prisma/extensions/artist.extension");
const user_extension_1 = require("../prisma/extensions/user.extension");
const album_extension_1 = require("../prisma/extensions/album.extension");
const track_extension_1 = require("../prisma/extensions/track.extension");
const prisma = new client_1.PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
});
const extendedPrisma = prisma
    .$extends(auth_extension_1.authExtension)
    .$extends(admin_extension_1.adminExtension)
    .$extends(artist_extension_1.artistExtension)
    .$extends(user_extension_1.userExtension)
    .$extends(track_extension_1.trackExtension)
    .$extends(album_extension_1.albumExtension);
exports.default = extendedPrisma;
//# sourceMappingURL=db.js.map