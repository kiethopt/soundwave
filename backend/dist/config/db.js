"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const auth_extension_1 = require("../prisma/extensions/auth.extension");
const admin_extension_1 = require("../prisma/extensions/admin.extension");
const artist_extension_1 = require("../prisma/extensions/artist.extension");
const user_extension_1 = require("../prisma/extensions/user.extension");
const album_extension_1 = require("../prisma/extensions/album.extension");
const track_extension_1 = require("../prisma/extensions/track.extension");
const playlist_extension_1 = require("../prisma/extensions/playlist.extension");
const event_extension_1 = require("../prisma/extensions/event.extension");
const history_extension_1 = require("../prisma/extensions/history.extension");
const label_extension_1 = require("../prisma/extensions/label.extension");
const prisma = new client_1.PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
});
const extendedPrisma = prisma
    .$extends(auth_extension_1.authExtension)
    .$extends(admin_extension_1.adminExtension)
    .$extends(artist_extension_1.artistExtension)
    .$extends(user_extension_1.userExtension)
    .$extends(track_extension_1.trackExtension)
    .$extends(album_extension_1.albumExtension)
    .$extends(playlist_extension_1.playlistExtension)
    .$extends(event_extension_1.eventExtension)
    .$extends(history_extension_1.historyExtension)
    .$extends(label_extension_1.labelExtension);
exports.default = extendedPrisma;
//# sourceMappingURL=db.js.map