"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeAudioWithReccoBeats = exports.deleteFile = exports.updateFileUrl = exports.uploadFile = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const db_1 = __importDefault(require("../config/db"));
const uploadFile = async (fileBuffer, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        cloudinary_1.default.uploader
            .upload_stream({ folder, resource_type: resourceType }, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        })
            .end(fileBuffer);
    });
};
exports.uploadFile = uploadFile;
const updateFileUrl = async (publicId) => {
    return cloudinary_1.default.url(publicId, { secure: true });
};
exports.updateFileUrl = updateFileUrl;
const deleteFile = async (publicId, resourceType = 'auto') => {
    return cloudinary_1.default.uploader.destroy(publicId, { resource_type: resourceType });
};
exports.deleteFile = deleteFile;
const analyzeAudioWithReccoBeats = async (audioBuffer, title, artistName) => {
    try {
        const reccoFeatures = await callReccoBeatsAPI(audioBuffer);
        const { key, scale } = deriveKeyAndScale(reccoFeatures);
        const mood = deriveMood(reccoFeatures.energy, reccoFeatures.valence);
        const genreIds = await determineGenresFromReccoFeatures(reccoFeatures, title, artistName);
        return {
            tempo: reccoFeatures.tempo,
            mood,
            key,
            scale,
            danceability: reccoFeatures.danceability,
            energy: reccoFeatures.energy,
            instrumentalness: reccoFeatures.instrumentalness,
            acousticness: reccoFeatures.acousticness,
            valence: reccoFeatures.valence,
            loudness: reccoFeatures.loudness,
            speechiness: reccoFeatures.speechiness,
            genreIds
        };
    }
    catch (error) {
        console.error('Error analyzing audio with ReccoBeats:', error);
        return {
            tempo: null,
            mood: null,
            key: null,
            scale: null,
            danceability: null,
            energy: null,
            instrumentalness: null,
            acousticness: null,
            valence: null,
            loudness: null,
            speechiness: null,
            genreIds: []
        };
    }
};
exports.analyzeAudioWithReccoBeats = analyzeAudioWithReccoBeats;
async function callReccoBeatsAPI(audioBuffer) {
    try {
        const formData = new FormData();
        formData.append('audioFile', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
        const response = await fetch('https://api.reccobeats.com/v1/analysis/audio-features', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('ReccoBeats API Error Body:', errorBody);
            throw new Error(`ReccoBeats API error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
        }
        const responseData = await response.json();
        console.log('ReccoBeats API Response:', responseData);
        return responseData;
    }
    catch (error) {
        console.error('Error calling ReccoBeats API:', error);
        throw error;
    }
}
function deriveKeyAndScale(reccoFeatures) {
    const { energy, valence, tempo } = reccoFeatures;
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const scale = (valence > 0.6 && energy > 0.4) ? 'major' : 'minor';
    const keyIndex = Math.floor((tempo * 0.4 + energy * 0.6) * 12) % 12;
    const key = keys[keyIndex];
    return { key, scale };
}
function deriveMood(energy, valence) {
    if (energy > 0.7 && valence > 0.7)
        return 'Energetic';
    if (energy > 0.7 && valence < 0.3)
        return 'Intense';
    if (energy < 0.3 && valence > 0.7)
        return 'Calm';
    if (energy < 0.3 && valence < 0.3)
        return 'Melancholic';
    if (energy > valence) {
        return energy > 0.6 ? 'Energetic' : (energy > 0.35 ? 'Moderate' : 'Calm');
    }
    else {
        return valence > 0.5 ? 'Happy' : 'Melancholic';
    }
}
function containsVietnameseChars(text) {
    return /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text);
}
async function determineGenresFromReccoFeatures(reccoFeatures, title, artistName) {
    const genres = await db_1.default.genre.findMany();
    const genreMap = new Map(genres.map((g) => [g.name.toLowerCase(), g.id]));
    const selectedGenres = [];
    const isVietnameseSong = title && containsVietnameseChars(title) ||
        artistName && containsVietnameseChars(artistName);
    const isRemix = title && title.toLowerCase().includes('remix');
    const isHouseRemix = isRemix && title && title.toLowerCase().includes('house');
    const isTechnoRemix = isRemix && title && title.toLowerCase().includes('techno');
    const isLofiTrack = title && title.toLowerCase().includes('lo-fi') || title?.toLowerCase().includes('lofi');
    const isKpopTrack = title && title.toLowerCase().includes('k-pop') || artistName?.toLowerCase().includes('k-pop');
    const isClassical = title && (title.toLowerCase().includes('sonata') ||
        title.toLowerCase().includes('symphony') ||
        title.toLowerCase().includes('concerto'));
    if (isVietnameseSong) {
        if (reccoFeatures.tempo >= 110 && reccoFeatures.tempo <= 125 &&
            reccoFeatures.acousticness > 0.6 && !isRemix) {
            addGenreIfExists('indie', genreMap, selectedGenres);
            addGenreIfExists('v-pop', genreMap, selectedGenres);
            if (reccoFeatures.energy < 0.4) {
                addGenreIfExists('ballad', genreMap, selectedGenres);
            }
        }
        else if (isHouseRemix) {
            addGenreIfExists('house', genreMap, selectedGenres);
            addGenreIfExists('dance', genreMap, selectedGenres);
            addGenreIfExists('v-pop', genreMap, selectedGenres);
        }
        else if (isTechnoRemix) {
            addGenreIfExists('techno', genreMap, selectedGenres);
            addGenreIfExists('electronic', genreMap, selectedGenres);
            addGenreIfExists('v-pop', genreMap, selectedGenres);
        }
        else if (isRemix) {
            addGenreIfExists('dance', genreMap, selectedGenres);
            addGenreIfExists('electronic', genreMap, selectedGenres);
            addGenreIfExists('v-pop', genreMap, selectedGenres);
        }
        else if (reccoFeatures.tempo <= 85 && reccoFeatures.acousticness > 0.7 && reccoFeatures.energy < 0.4) {
            addGenreIfExists('bolero', genreMap, selectedGenres);
            addGenreIfExists('v-pop', genreMap, selectedGenres);
        }
        else {
            addGenreIfExists('v-pop', genreMap, selectedGenres);
            if (reccoFeatures.energy < 0.4 && reccoFeatures.acousticness > 0.6) {
                addGenreIfExists('ballad', genreMap, selectedGenres);
            }
            else if (reccoFeatures.energy > 0.7 && reccoFeatures.tempo > 120) {
                addGenreIfExists('dance', genreMap, selectedGenres);
                addGenreIfExists('pop', genreMap, selectedGenres);
            }
            else {
                addGenreIfExists('pop', genreMap, selectedGenres);
            }
        }
    }
    else if (isKpopTrack || (title && /^[ㄱ-ㅎ가-힣]+/.test(title)) || (artistName && /^[ㄱ-ㅎ가-힣]+/.test(artistName))) {
        addGenreIfExists('k-pop', genreMap, selectedGenres);
        if (reccoFeatures.energy > 0.7 && reccoFeatures.danceability > 0.6) {
            addGenreIfExists('dance', genreMap, selectedGenres);
        }
        else if (reccoFeatures.energy < 0.4) {
            addGenreIfExists('ballad', genreMap, selectedGenres);
        }
    }
    else if (isClassical || (reccoFeatures.instrumentalness > 0.9 && reccoFeatures.acousticness > 0.9)) {
        addGenreIfExists('classical', genreMap, selectedGenres);
        if (title?.toLowerCase().includes('orchestra') || reccoFeatures.loudness > -10) {
            addGenreIfExists('orchestral', genreMap, selectedGenres);
        }
        if (title?.toLowerCase().includes('opera')) {
            addGenreIfExists('opera', genreMap, selectedGenres);
        }
    }
    else if (isLofiTrack || (reccoFeatures.energy < 0.4 && reccoFeatures.acousticness > 0.3 &&
        reccoFeatures.instrumentalness > 0.7 && reccoFeatures.tempo < 95)) {
        addGenreIfExists('lo-fi', genreMap, selectedGenres);
        addGenreIfExists('instrumental', genreMap, selectedGenres);
    }
    else {
        if (reccoFeatures.instrumentalness > 0.6 && reccoFeatures.acousticness > 0.6 &&
            reccoFeatures.tempo > 85 && reccoFeatures.tempo < 140) {
            addGenreIfExists('jazz', genreMap, selectedGenres);
        }
        else if (reccoFeatures.acousticness > 0.5 && reccoFeatures.energy < 0.6 &&
            reccoFeatures.energy > 0.3 && reccoFeatures.tempo < 100) {
            addGenreIfExists('blues', genreMap, selectedGenres);
        }
        else if (reccoFeatures.acousticness > 0.5 && reccoFeatures.instrumentalness < 0.4 &&
            reccoFeatures.tempo > 70 && reccoFeatures.tempo < 130) {
            addGenreIfExists('country', genreMap, selectedGenres);
        }
        else if (reccoFeatures.energy > 0.85 && reccoFeatures.loudness > -7) {
            if (reccoFeatures.tempo > 140) {
                addGenreIfExists('metal', genreMap, selectedGenres);
            }
            else {
                addGenreIfExists('punk', genreMap, selectedGenres);
            }
            addGenreIfExists('rock', genreMap, selectedGenres);
        }
        else if (reccoFeatures.instrumentalness > 0.6 && reccoFeatures.energy > 0.7 &&
            reccoFeatures.danceability > 0.6 && reccoFeatures.tempo > 120) {
            if (reccoFeatures.tempo > 140) {
                addGenreIfExists('techno', genreMap, selectedGenres);
            }
            else {
                addGenreIfExists('edm', genreMap, selectedGenres);
            }
            addGenreIfExists('electronic', genreMap, selectedGenres);
        }
        else if (reccoFeatures.danceability > 0.7 && reccoFeatures.energy > 0.6 &&
            reccoFeatures.tempo > 110 && reccoFeatures.tempo < 130) {
            if (reccoFeatures.acousticness < 0.3) {
                addGenreIfExists('disco', genreMap, selectedGenres);
            }
            else {
                addGenreIfExists('new wave', genreMap, selectedGenres);
            }
            addGenreIfExists('dance', genreMap, selectedGenres);
        }
        else if (reccoFeatures.tempo > 60 && reccoFeatures.tempo < 100 &&
            reccoFeatures.energy > 0.4 && reccoFeatures.energy < 0.7 &&
            reccoFeatures.valence > 0.6) {
            addGenreIfExists('reggae', genreMap, selectedGenres);
        }
        else if (reccoFeatures.tempo > 60 && reccoFeatures.tempo < 110 &&
            reccoFeatures.energy > 0.3 && reccoFeatures.energy < 0.7 &&
            reccoFeatures.valence > 0.3 && reccoFeatures.acousticness < 0.6) {
            addGenreIfExists('r&b', genreMap, selectedGenres);
            addGenreIfExists('soul', genreMap, selectedGenres);
        }
        else if (reccoFeatures.acousticness > 0.7 && reccoFeatures.instrumentalness < 0.5) {
            addGenreIfExists('singer-songwriter', genreMap, selectedGenres);
            if (reccoFeatures.energy < 0.4) {
                addGenreIfExists('folk', genreMap, selectedGenres);
            }
        }
        else if (reccoFeatures.tempo > 130 && reccoFeatures.energy > 0.6 &&
            reccoFeatures.instrumentalness < 0.4 && reccoFeatures.valence < 0.5) {
            addGenreIfExists('trap', genreMap, selectedGenres);
            addGenreIfExists('hip-hop', genreMap, selectedGenres);
        }
        else if ((reccoFeatures.instrumentalness > 0.7 && reccoFeatures.acousticness < 0.3 &&
            reccoFeatures.energy > 0.5) || reccoFeatures.speechiness > 0.7) {
            addGenreIfExists('experimental', genreMap, selectedGenres);
        }
        else if (reccoFeatures.instrumentalness < 0.7 &&
            reccoFeatures.danceability > 0.5 &&
            reccoFeatures.tempo >= 70 && reccoFeatures.tempo <= 170 &&
            reccoFeatures.acousticness < 0.6 &&
            reccoFeatures.energy > 0.2) {
            addGenreIfExists('hip-hop', genreMap, selectedGenres);
            addGenreIfExists('rap', genreMap, selectedGenres);
            if (reccoFeatures.valence < 0.4 && selectedGenres.length < 3) {
                addGenreIfExists('alternative', genreMap, selectedGenres);
            }
        }
        else if (reccoFeatures.instrumentalness > 0.7) {
            addGenreIfExists('instrumental', genreMap, selectedGenres);
            if (reccoFeatures.acousticness > 0.7 && selectedGenres.length < 3) {
                addGenreIfExists('acoustic', genreMap, selectedGenres);
            }
            else if (reccoFeatures.energy < 0.4 && selectedGenres.length < 3) {
                addGenreIfExists('ambient', genreMap, selectedGenres);
            }
            else if (reccoFeatures.energy > 0.7 && selectedGenres.length < 3) {
                addGenreIfExists('electronic', genreMap, selectedGenres);
            }
        }
        else if (reccoFeatures.acousticness > 0.7) {
            addGenreIfExists('acoustic', genreMap, selectedGenres);
            if (reccoFeatures.energy < 0.4 && selectedGenres.length < 3) {
                addGenreIfExists('folk', genreMap, selectedGenres);
            }
            else if (selectedGenres.length < 3) {
                addGenreIfExists('indie', genreMap, selectedGenres);
            }
        }
        else if (reccoFeatures.danceability > 0.7) {
            if (reccoFeatures.energy > 0.7) {
                addGenreIfExists('dance', genreMap, selectedGenres);
                if (isRemix && selectedGenres.length < 3) {
                    addGenreIfExists('house', genreMap, selectedGenres);
                }
                else if (selectedGenres.length < 3) {
                    addGenreIfExists('pop', genreMap, selectedGenres);
                }
            }
            else if (selectedGenres.length < 3) {
                addGenreIfExists('funk', genreMap, selectedGenres);
                if (selectedGenres.length < 3)
                    addGenreIfExists('pop', genreMap, selectedGenres);
            }
        }
        else if (reccoFeatures.energy > 0.8) {
            if (reccoFeatures.tempo > 125) {
                addGenreIfExists('rock', genreMap, selectedGenres);
            }
            else if (selectedGenres.length < 3) {
                addGenreIfExists('pop', genreMap, selectedGenres);
                if (selectedGenres.length < 3)
                    addGenreIfExists('rock', genreMap, selectedGenres);
            }
        }
        else if (reccoFeatures.tempo > 120 && selectedGenres.length < 1) {
            addGenreIfExists('pop', genreMap, selectedGenres);
        }
        else if (reccoFeatures.tempo < 85 && selectedGenres.length < 2) {
            if (reccoFeatures.valence < 0.4) {
                addGenreIfExists('alternative', genreMap, selectedGenres);
            }
            else {
                addGenreIfExists('soul', genreMap, selectedGenres);
            }
        }
    }
    if (title && (title.toLowerCase().includes('world') ||
        title.toLowerCase().includes('ethnic') ||
        title.toLowerCase().includes('latin')) && selectedGenres.length < 3) {
        if (title.toLowerCase().includes('latin')) {
            addGenreIfExists('latin', genreMap, selectedGenres);
        }
        else {
            addGenreIfExists('world', genreMap, selectedGenres);
        }
    }
    if (title && (title.toLowerCase().includes('gospel') ||
        title.toLowerCase().includes('worship') ||
        title.toLowerCase().includes('spiritual')) && selectedGenres.length < 3) {
        addGenreIfExists('gospel', genreMap, selectedGenres);
    }
    if (selectedGenres.length === 0) {
        addGenreIfExists('pop', genreMap, selectedGenres);
    }
    return selectedGenres.slice(0, 3);
}
function addGenreIfExists(genreName, genreMap, selectedGenres) {
    const id = genreMap.get(genreName.toLowerCase());
    if (id && !selectedGenres.includes(id)) {
        selectedGenres.push(id);
    }
}
//# sourceMappingURL=upload.service.js.map