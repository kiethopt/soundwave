"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recognizeAudioWithACRCloud = void 0;
const acrcloud_1 = __importDefault(require("acrcloud"));
const ACRCLOUD_HOST = process.env.ACRCLOUD_HOST;
const ACRCLOUD_ACCESS_KEY = process.env.ACRCLOUD_ACCESS_KEY;
const ACRCLOUD_ACCESS_SECRET = process.env.ACRCLOUD_ACCESS_SECRET;
let acrClient = null;
if (ACRCLOUD_HOST && ACRCLOUD_ACCESS_KEY && ACRCLOUD_ACCESS_SECRET) {
    acrClient = new acrcloud_1.default({
        host: ACRCLOUD_HOST,
        access_key: ACRCLOUD_ACCESS_KEY,
        access_secret: ACRCLOUD_ACCESS_SECRET,
        data_type: 'audio',
    });
    console.log('[ACRCloud Service] SDK initialized.');
}
else {
    console.warn('[ACRCloud Service] Credentials not found. SDK not initialized.');
}
const recognizeAudioWithACRCloud = async (audioBuffer, originalFileName, trackTitleForLog) => {
    if (!acrClient) {
        console.warn('[ACRCloud Service] SDK not initialized. Copyright check skipped.');
        return { isMatched: false, error: true, errorMessage: 'ACRCloud SDK not initialized.' };
    }
    const logContext = trackTitleForLog ? ` for track "${trackTitleForLog}"` : '';
    console.log(`[ACRCloud Service] Identifying audio via SDK${logContext} (File: ${originalFileName || 'N/A'})`);
    try {
        const result = await acrClient.identify(audioBuffer);
        if (result.status && result.status.code === 0) {
            if (result.metadata && result.metadata.music && result.metadata.music.length > 0) {
                const sdkMatch = result.metadata.music[0];
                const mappedMatch = {
                    title: sdkMatch.title || 'Unknown Title',
                    artists: sdkMatch.artists?.map(a => ({ name: a.name })) || [{ name: 'Unknown Artist' }],
                    album: { name: sdkMatch.album?.name || 'Unknown Album' },
                    release_date: sdkMatch.release_date,
                    label: sdkMatch.label,
                    duration_ms: sdkMatch.duration_ms,
                    score: sdkMatch.score,
                    play_offset_ms: sdkMatch.play_offset_ms,
                    external_ids: sdkMatch.external_ids,
                    acrid: sdkMatch.acrid,
                    external_metadata: {}
                };
                console.log(`[ACRCloud Service] SDK Match found: "${mappedMatch.title}" by ${mappedMatch.artists.map(a => a.name).join(', ')}`);
                return {
                    isMatched: true,
                    match: mappedMatch,
                };
            }
            else {
                console.log(`[ACRCloud Service] SDK: No music match found${logContext} (File: ${originalFileName || 'N/A'})`);
                return { isMatched: false };
            }
        }
        else {
            const errorCode = result.status?.code || 500;
            const errorMessage = result.status?.msg || 'ACRCloud SDK returned an error';
            console.error(`[ACRCloud Service] SDK API Error (Code: ${errorCode}): ${errorMessage}${logContext} (File: ${originalFileName || 'N/A'})`);
            return { isMatched: false, error: true, errorMessage, errorCode };
        }
    }
    catch (err) {
        console.error(`[ACRCloud Service] SDK identify() error${logContext} (File: ${originalFileName || 'N/A'}):`, err);
        const errorMessage = err.message || 'Error during ACRCloud SDK recognition';
        const errorCode = err.code || undefined;
        return { isMatched: false, error: true, errorMessage, errorCode };
    }
};
exports.recognizeAudioWithACRCloud = recognizeAudioWithACRCloud;
//# sourceMappingURL=acrcloud.service.js.map