"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const album_middleware_1 = require("../middleware/album.middleware");
const extension_accelerate_1 = require("@prisma/extension-accelerate");
const auth_middleware_1 = require("../middleware/auth.middleware");
const artist_middleware_1 = require("../middleware/artist.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const user_middleware_1 = require("src/middleware/user.middleware");
const prisma = new client_1.PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
});
const extendedPrisma = prisma
    .$extends(auth_middleware_1.authExtension)
    .$extends(admin_middleware_1.adminExtension)
    .$extends(album_middleware_1.albumExtension)
    .$extends(artist_middleware_1.artistExtension)
    .$extends(user_middleware_1.userExtension)
    .$extends((0, extension_accelerate_1.withAccelerate)());
exports.default = extendedPrisma;
//# sourceMappingURL=db.js.map