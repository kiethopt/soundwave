"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackExtension = void 0;
const db_1 = __importDefault(require("../../config/db"));
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
exports.trackExtension = client_1.Prisma.defineExtension({
    name: 'trackExtension',
    model: {
        track: {
            async autoPublishTracks() {
                try {
                    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
                    const tracksToPublish = await db_1.default.track.findMany({
                        where: {
                            isActive: false,
                            releaseDate: {
                                gte: twoMinutesAgo,
                                lte: new Date(),
                            },
                            updatedAt: {
                                lt: twoMinutesAgo,
                            },
                        },
                    });
                    if (tracksToPublish.length === 0) {
                        return;
                    }
                    console.log(`Found ${tracksToPublish.length} tracks to auto-publish.`);
                    for (const track of tracksToPublish) {
                        try {
                            await db_1.default.track.update({
                                where: { id: track.id },
                                data: { isActive: true },
                            });
                            console.log(`Auto published track: ${track.title} (ID: ${track.id})`);
                        }
                        catch (updateError) {
                            console.error(`Failed to auto-publish track ${track.id}:`, updateError);
                        }
                    }
                }
                catch (error) {
                    console.error('Auto publish error:', error);
                }
            },
        },
    },
});
node_cron_1.default.schedule('* * * * *', async () => {
    console.log('Running cron job to auto-publish tracks...');
    try {
        await db_1.default.track.autoPublishTracks();
    }
    catch (error) {
        console.error('Cron job error:', error);
    }
});
//# sourceMappingURL=track.extension.js.map