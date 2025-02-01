"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const album_middleware_1 = require("../middleware/album.middleware");
const prisma = new client_1.PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
});
const extendedPrisma = prisma.$extends(album_middleware_1.albumExtension);
exports.default = extendedPrisma;
//# sourceMappingURL=db.js.map