import cloudinary from '../config/cloudinary';
import prisma from '../config/db';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export const uploadFile = async (
  fileBuffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'auto' = 'auto'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as CloudinaryUploadResult);
          }
        }
      )
      .end(fileBuffer);
  });
};

export const updateFileUrl = async (publicId: string) => {
  return cloudinary.url(publicId, { secure: true });
};

export const deleteFile = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'auto' = 'auto'
) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

// Interface cho kết quả phân tích từ ReccoBeats API
export interface AudioAnalysisResult {
  tempo: number | null;
  mood: string | null;
  key: string | null;
  scale: string | null;
  danceability: number | null;
  energy: number | null;
  instrumentalness: number | null;
  acousticness: number | null;
  valence: number | null;
  genreIds: string[]; // Danh sách ID các thể loại phù hợp
}

// Interface cho kết quả trực tiếp từ ReccoBeats API
interface ReccoBeatsResponse {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  speechiness: number;
  tempo: number;
  valence: number;
}

/**
 * Phân tích file âm thanh sử dụng ReccoBeats API
 * @param audioBuffer Buffer của file âm thanh cần phân tích
 * @param title Tiêu đề bài hát (tùy chọn, để phát hiện bài hát Việt Nam)
 * @param artistName Tên nghệ sĩ (tùy chọn, để phát hiện bài hát Việt Nam)
 * @returns Kết quả phân tích âm thanh bao gồm tempo, mood, key, scale, và genreIds
 */
export const analyzeAudioWithReccoBeats = async (
  audioBuffer: Buffer,
  title?: string,
  artistName?: string
): Promise<AudioAnalysisResult> => {
  try {
    // Gọi API ReccoBeats để phân tích âm thanh
    const reccoFeatures = await callReccoBeatsAPI(audioBuffer);
    
    // Xác định key và scale từ các đặc điểm âm thanh
    const { key, scale } = deriveKeyAndScale(reccoFeatures);
    
    // Xác định tâm trạng (mood) từ energy và valence
    const mood = deriveMood(reccoFeatures.energy, reccoFeatures.valence);
    
    // Xác định thể loại phù hợp từ kết quả phân tích
    const genreIds = await determineGenresFromReccoFeatures(
      reccoFeatures,
      title,
      artistName
    );
    
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
      genreIds
    };
  } catch (error) {
    console.error('Error analyzing audio with ReccoBeats:', error);
    // Trả về giá trị mặc định nếu có lỗi
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
      genreIds: []
    };
  }
};

/**
 * Gọi API ReccoBeats để phân tích âm thanh
 * @param audioBuffer Buffer của file âm thanh
 * @returns Kết quả phân tích từ ReccoBeats API
 */
async function callReccoBeatsAPI(audioBuffer: Buffer): Promise<ReccoBeatsResponse> {
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
    
    /*
    // Code giả lập đã được comment lại
    const bufferLength = audioBuffer.length;
    const randomFactor = Math.random(); 
    
    return {
      acousticness: 0.3 + randomFactor * 0.5,
      danceability: 0.4 + randomFactor * 0.5,
      energy: 0.3 + randomFactor * 0.6,
      instrumentalness: randomFactor > 0.7 ? 0.8 + randomFactor * 0.2 : randomFactor * 0.3,
      liveness: 0.1 + randomFactor * 0.3,
      loudness: -15 - randomFactor * 10,
      speechiness: randomFactor > 0.7 ? 0.05 + randomFactor * 0.1 : 0.3 + randomFactor * 0.3,
      tempo: 70 + randomFactor * 100, 
      valence: 0.2 + randomFactor * 0.7,
    };
    */
  } catch (error) {
    console.error('Error calling ReccoBeats API:', error);
    throw error;
  }
}

/**
 * Xác định key và scale từ các đặc điểm âm thanh
 */
function deriveKeyAndScale(reccoFeatures: ReccoBeatsResponse): { key: string | null; scale: string | null } {
  // ReccoBeats API không trả về key và scale trực tiếp
  // Nhưng chúng ta có thể suy luận dựa trên các đặc điểm khác
  // Đây là một thuật toán giả định đơn giản
  
  const { energy, valence, tempo } = reccoFeatures;
  
  // Các key phổ biến
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Bài hát với valence cao và energy nhất định thường ở major, ngược lại là minor
  const scale = (valence > 0.6 && energy > 0.4) ? 'major' : 'minor';
  
  // Thuật toán đơn giản để xác định key dựa trên tempo và energy
  // Đây chỉ là một ví dụ, không phải phương pháp khoa học
  const keyIndex = Math.floor((tempo * 0.4 + energy * 0.6) * 12) % 12;
  const key = keys[keyIndex];
  
  return { key, scale };
}

/**
 * Xác định tâm trạng (mood) từ energy và valence
 */
function deriveMood(energy: number, valence: number): string {
  // Energy cao + valence cao = Energetic/Happy
  if (energy > 0.7 && valence > 0.7) return 'Energetic';
  
  // Energy cao + valence thấp = Angry/Intense
  if (energy > 0.7 && valence < 0.3) return 'Intense';
  
  // Energy thấp + valence cao = Peaceful/Calm
  if (energy < 0.3 && valence > 0.7) return 'Calm';
  
  // Energy thấp + valence thấp = Melancholic/Sad
  if (energy < 0.3 && valence < 0.3) return 'Melancholic';
  
  // Trường hợp còn lại, dựa trên giá trị cao hơn
  if (energy > valence) {
    return energy > 0.6 ? 'Energetic' : (energy > 0.35 ? 'Moderate' : 'Calm');
  } else {
    return valence > 0.5 ? 'Happy' : 'Melancholic';
  }
}

/**
 * Kiểm tra xem một chuỗi có chứa ký tự tiếng Việt không
 */
function containsVietnameseChars(text: string): boolean {
  return /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text);
}

/**
 * Xác định thể loại từ kết quả phân tích ReccoBeats
 */
async function determineGenresFromReccoFeatures(
  reccoFeatures: ReccoBeatsResponse,
  title?: string,
  artistName?: string
): Promise<string[]> {
  const genres = await prisma.genre.findMany();
  const genreMap = new Map(genres.map((g) => [g.name.toLowerCase(), g.id]));
  const selectedGenres: string[] = [];
  
  const isVietnameseSong = title && containsVietnameseChars(title) || 
                           artistName && containsVietnameseChars(artistName);
  
  const isRemix = title && title.toLowerCase().includes('remix');
  const isHouseRemix = isRemix && title && title.toLowerCase().includes('house');
  
  if (isVietnameseSong) {
    // Nhạc Việt Nam indie
    if (reccoFeatures.tempo >= 110 && reccoFeatures.tempo <= 125 && 
        reccoFeatures.acousticness > 0.6 && !isRemix) {
      addGenreIfExists('indie', genreMap, selectedGenres);
      addGenreIfExists('v-pop', genreMap, selectedGenres);
      
      if (reccoFeatures.energy < 0.4) {
        addGenreIfExists('ballad', genreMap, selectedGenres);
      }
    }
    // House remix Việt Nam
    else if (isHouseRemix) {
      addGenreIfExists('house', genreMap, selectedGenres);
      addGenreIfExists('dance', genreMap, selectedGenres);
      addGenreIfExists('v-pop', genreMap, selectedGenres);
    }
    // Remix Việt Nam thông thường
    else if (isRemix) {
      addGenreIfExists('dance', genreMap, selectedGenres);
      addGenreIfExists('electronic', genreMap, selectedGenres);
      addGenreIfExists('v-pop', genreMap, selectedGenres);
    }
    // Nhạc V-Pop thông thường
    else {
      addGenreIfExists('v-pop', genreMap, selectedGenres);
      
      if (reccoFeatures.energy < 0.4 && reccoFeatures.acousticness > 0.6) {
        addGenreIfExists('ballad', genreMap, selectedGenres);
      } else if (reccoFeatures.energy > 0.7 && reccoFeatures.tempo > 120) {
        addGenreIfExists('dance', genreMap, selectedGenres);
        addGenreIfExists('pop', genreMap, selectedGenres);
      } else {
        addGenreIfExists('pop', genreMap, selectedGenres);
      }
    }
  }
  // Logic cho nhạc quốc tế (không phải Việt Nam)
  else {
    // Ưu tiên Hip-Hop/Rap nếu các chỉ số phù hợp
    if (
      reccoFeatures.instrumentalness < 0.7 && // Không phải là nhạc không lời hoàn toàn
      reccoFeatures.danceability > 0.5 &&     // Có độ "dance" nhất định
      reccoFeatures.tempo >= 70 && reccoFeatures.tempo <= 170 && // Tempo trong khoảng của Hip-Hop
      reccoFeatures.acousticness < 0.6 &&     // Thường không quá acoustic
      reccoFeatures.energy > 0.2             // Có một chút năng lượng
    ) {
      addGenreIfExists('hip-hop', genreMap, selectedGenres);
      addGenreIfExists('rap', genreMap, selectedGenres);
      // Có thể thêm R&B hoặc Alternative nếu còn chỗ và phù hợp mood
      if (reccoFeatures.valence < 0.4 && selectedGenres.length < 3) {
        addGenreIfExists('alternative', genreMap, selectedGenres);
      }
    }
    // 2.1 Phân loại dựa trên instrumentalness cao (nếu không phải Hip-Hop đã được chọn)
    else if (reccoFeatures.instrumentalness > 0.7) {
      addGenreIfExists('instrumental', genreMap, selectedGenres);
      if (reccoFeatures.acousticness > 0.7 && selectedGenres.length < 3) {
        addGenreIfExists('acoustic', genreMap, selectedGenres);
      } else if (reccoFeatures.energy < 0.4 && selectedGenres.length < 3) {
        addGenreIfExists('ambient', genreMap, selectedGenres);
      } else if (reccoFeatures.energy > 0.7 && selectedGenres.length < 3) {
        addGenreIfExists('electronic', genreMap, selectedGenres);
      }
    }
    // 2.2 Phân loại dựa trên acousticness cao
    else if (reccoFeatures.acousticness > 0.7) {
      addGenreIfExists('acoustic', genreMap, selectedGenres);
      if (reccoFeatures.energy < 0.4 && selectedGenres.length < 3) {
        addGenreIfExists('folk', genreMap, selectedGenres);
      } else if (selectedGenres.length < 3){
        addGenreIfExists('indie', genreMap, selectedGenres);
      }
    }
    // 2.3 Phân loại dựa trên danceability và energy
    else if (reccoFeatures.danceability > 0.7) {
      if (reccoFeatures.energy > 0.7) {
        addGenreIfExists('dance', genreMap, selectedGenres);
        if (isRemix && selectedGenres.length < 3) {
          addGenreIfExists('house', genreMap, selectedGenres);
        } else if (selectedGenres.length < 3){
          addGenreIfExists('pop', genreMap, selectedGenres);
        }
      } else if (selectedGenres.length < 3){
        addGenreIfExists('funk', genreMap, selectedGenres);
        if (selectedGenres.length < 3) addGenreIfExists('pop', genreMap, selectedGenres);
      }
    }
    // 2.4 Phân loại dựa trên energy cao
    else if (reccoFeatures.energy > 0.8) {
      if (reccoFeatures.tempo > 125) {
        addGenreIfExists('rock', genreMap, selectedGenres);
      } else if (selectedGenres.length < 3){
        addGenreIfExists('pop', genreMap, selectedGenres);
        if (selectedGenres.length < 3) addGenreIfExists('rock', genreMap, selectedGenres);
      }
    }
    // 2.5 Phân loại dựa trên tempo (nếu chưa có gì phù hợp hơn)
    else if (reccoFeatures.tempo > 120 && selectedGenres.length < 1) { // Chỉ thêm Pop nếu chưa có genre nào
      addGenreIfExists('pop', genreMap, selectedGenres);
    }
    else if (reccoFeatures.tempo < 85 && selectedGenres.length < 2) {
      if (reccoFeatures.valence < 0.4) {
        addGenreIfExists('alternative', genreMap, selectedGenres);
      } else {
        addGenreIfExists('soul', genreMap, selectedGenres);
      }
    }
  }
  
  if (selectedGenres.length === 0) {
    addGenreIfExists('pop', genreMap, selectedGenres);
  }
  
  return selectedGenres.slice(0, 3);
}

/**
 * Thêm thể loại vào danh sách nếu nó tồn tại trong hệ thống
 */
function addGenreIfExists(
  genreName: string,
  genreMap: Map<string, string>,
  selectedGenres: string[]
) {
  const id = genreMap.get(genreName.toLowerCase());
  if (id && !selectedGenres.includes(id)) {
    selectedGenres.push(id);
  }
}
