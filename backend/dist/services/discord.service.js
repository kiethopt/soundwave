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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllDiscordMessages = exports.updateAlbumMetadata = exports.saveMetadata = exports.uploadTrack = exports.sendUserNotification = void 0;
const discord_js_1 = require("discord.js");
const client = new discord_js_1.Client({
    intents: ['Guilds', 'GuildMessages', 'MessageContent'],
});
const DISCORD_CHANNELS = {
    USERS: '1321400881672880139',
    NOTIFICATIONS: '1319345907959074857',
    AUDIO_TRACKS: '1319281353337868308',
    AUDIO_ALBUMS: '1319345885045456996',
    AUDIO_METADATA: '1319281378738573382',
};
if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn('Warning: DISCORD_BOT_TOKEN is not set. Discord features will be disabled.');
}
else {
    client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
        console.error('Discord login error:', error);
    });
}
const sanitizeFilename = (filename, isAudio = true) => {
    var _a;
    const ext = ((_a = filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    const name = filename.replace(/\.[^/.]+$/, '');
    const normalized = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    return `${normalized}.${ext}`;
};
const sendUserNotification = (username) => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.DISCORD_BOT_TOKEN) {
        console.warn('Discord notification skipped: Bot token not configured');
        return;
    }
    try {
        const channel = (yield client.channels.fetch(DISCORD_CHANNELS.USERS));
        yield channel.send(`🎉 User mới đăng ký: ${username}`);
    }
    catch (error) {
        console.error('Discord notification error:', error);
    }
});
exports.sendUserNotification = sendUserNotification;
const uploadTrack = (fileBuffer_1, originalFilename_1, ...args_1) => __awaiter(void 0, [fileBuffer_1, originalFilename_1, ...args_1], void 0, function* (fileBuffer, originalFilename, isAudio = true, isAlbumTrack = false, isMetadata = false) {
    try {
        let channelId;
        if (isMetadata || !isAudio) {
            channelId = DISCORD_CHANNELS.AUDIO_METADATA;
        }
        else if (isAlbumTrack) {
            channelId = DISCORD_CHANNELS.AUDIO_ALBUMS;
        }
        else {
            channelId = DISCORD_CHANNELS.AUDIO_TRACKS;
        }
        const channel = (yield client.channels.fetch(channelId));
        const safeFilename = sanitizeFilename(originalFilename, isAudio);
        const message = yield channel.send({
            files: [
                {
                    attachment: fileBuffer,
                    name: safeFilename,
                    description: originalFilename,
                },
            ],
        });
        const attachment = message.attachments.first();
        if (!attachment) {
            throw new Error('Failed to upload file to Discord');
        }
        return {
            messageId: message.id,
            url: attachment.url,
        };
    }
    catch (error) {
        console.error('Discord upload error:', error);
        throw error;
    }
});
exports.uploadTrack = uploadTrack;
const saveMetadata = (metadata) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const channel = (yield client.channels.fetch(DISCORD_CHANNELS.AUDIO_METADATA));
        const message = yield channel.send({
            embeds: [
                {
                    title: metadata.title,
                    description: `Artist: ${metadata.artist}`,
                    fields: [
                        {
                            name: 'Type',
                            value: metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1),
                            inline: true,
                        },
                        {
                            name: metadata.type === 'track' ? 'Duration' : 'Track Count',
                            value: metadata.type === 'track'
                                ? `${Math.floor(metadata.duration / 60)}:${(metadata.duration % 60)
                                    .toString()
                                    .padStart(2, '0')}`
                                : `${metadata.trackCount} tracks`,
                            inline: true,
                        },
                        {
                            name: metadata.type === 'track' ? 'Album ID' : 'Release Date',
                            value: metadata.type === 'track'
                                ? metadata.albumId || 'Single Track'
                                : metadata.releaseDate,
                            inline: true,
                        },
                    ],
                },
            ],
        });
        return { messageId: message.id };
    }
    catch (error) {
        console.error('Discord metadata error:', error);
        throw error;
    }
});
exports.saveMetadata = saveMetadata;
const updateAlbumMetadata = (messageId, metadata) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const channel = (yield client.channels.fetch(DISCORD_CHANNELS.AUDIO_METADATA));
        const message = yield channel.messages.fetch(messageId);
        if (!message) {
            throw new Error('Không tìm thấy message metadata');
        }
        yield message.edit({
            embeds: [
                {
                    title: metadata.title,
                    description: `Artist: ${metadata.artist}`,
                    fields: [
                        {
                            name: 'Type',
                            value: metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1),
                            inline: true,
                        },
                        {
                            name: 'Track Count',
                            value: `${metadata.trackCount} tracks`,
                            inline: true,
                        },
                        {
                            name: 'Release Date',
                            value: metadata.releaseDate,
                            inline: true,
                        },
                    ],
                },
            ],
        });
    }
    catch (error) {
        console.error('Update Discord metadata error:', error);
        throw error;
    }
});
exports.updateAlbumMetadata = updateAlbumMetadata;
const deleteAllDiscordMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const channels = [
            DISCORD_CHANNELS.AUDIO_TRACKS,
            DISCORD_CHANNELS.AUDIO_ALBUMS,
            DISCORD_CHANNELS.AUDIO_METADATA,
        ];
        for (const channelId of channels) {
            const channel = (yield client.channels.fetch(channelId));
            const messages = yield channel.messages.fetch();
            for (const message of messages.values()) {
                yield message.delete();
            }
        }
    }
    catch (error) {
        console.error('Delete Discord messages error:', error);
        throw error;
    }
});
exports.deleteAllDiscordMessages = deleteAllDiscordMessages;
//# sourceMappingURL=discord.service.js.map