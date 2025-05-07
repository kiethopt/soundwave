import acrcloud from 'acrcloud';

const ACRCLOUD_HOST = process.env.ACRCLOUD_HOST;
const ACRCLOUD_ACCESS_KEY = process.env.ACRCLOUD_ACCESS_KEY;
const ACRCLOUD_ACCESS_SECRET = process.env.ACRCLOUD_ACCESS_SECRET;

// Initialize ACRCloud client
let acrClient: any = null;
if (ACRCLOUD_HOST && ACRCLOUD_ACCESS_KEY && ACRCLOUD_ACCESS_SECRET) {
  acrClient = new acrcloud({
    host: ACRCLOUD_HOST,
    access_key: ACRCLOUD_ACCESS_KEY,
    access_secret: ACRCLOUD_ACCESS_SECRET,
    data_type: 'audio',
  });
  console.log('[ACRCloud Service] SDK initialized.');
} else {
  console.warn('[ACRCloud Service] Credentials not found. SDK not initialized.');
}

interface ACRCloudSDKMusicEntry {
  external_ids?: {
    isrc?: string;
    upc?: string;
  };
  sample_begin_time_offset_ms?: string;
  label?: string;
  play_offset_ms?: number;
  artists?: {
    name: string;
  }[];
  release_date?: string;
  title?: string;
  db_end_time_offset_ms?: string;
  duration_ms?: number;
  album?: {
    name: string;
  };
  acrid?: string;
  result_from?: number;
  db_begin_time_offset_ms?: string;
  score?: number;
}

interface ACRCloudSDKResponse {
  status: {
    msg: string;
    code: number;
    version: string;
  };
  metadata?: {
    played_duration?: number;
    music?: ACRCloudSDKMusicEntry[];
    timestamp_utc?: string;
  };
  result_type?: number;
  sample_end_time_offset_ms?: string;
}


export interface ACRCloudMusicEntry { // Keeping our existing interface for consistency
  title: string;
  artists: Array<{ name: string; [key: string]: any; }>;
  album: { name: string; [key: string]: any; };
  release_date?: string;
  label?: string;
  duration_ms?: number;
  score?: number;
  play_offset_ms?: number;
  external_ids?: {
    isrc?: string;
    upc?: string;
  };
  external_metadata?: { // This might need adjustment based on SDK's actual output
    spotify?: {
      track?: { id: string; name: string; href?: string };
      artists?: Array<{ id: string; name: string; href?: string }>;
      album?: { id: string; name: string; href?: string };
    };
    youtube?: { vid: string };
    deezer?: any;
  };
  acrid?: string;
}

// buildSignature is no longer needed as SDK handles it.

export const recognizeAudioWithACRCloud = async (
  audioBuffer: Buffer,
  originalFileName?: string,
  trackTitleForLog?: string
): Promise<{ isMatched: boolean; match?: ACRCloudMusicEntry; error?: boolean; errorMessage?: string, errorCode?: number }> => {
  if (!acrClient) {
    console.warn('[ACRCloud Service] SDK not initialized. Copyright check skipped.');
    return { isMatched: false, error: true, errorMessage: 'ACRCloud SDK not initialized.' };
  }

  const logContext = trackTitleForLog ? ` for track "${trackTitleForLog}"` : '';
  console.log(`[ACRCloud Service] Identifying audio via SDK${logContext} (File: ${originalFileName || 'N/A'})`);

  try {
    const result: ACRCloudSDKResponse = await acrClient.identify(audioBuffer);
    // console.log('[ACRCloud Service] SDK API Response:', JSON.stringify(result, null, 2));

    if (result.status && result.status.code === 0) {
      if (result.metadata && result.metadata.music && result.metadata.music.length > 0) {
        const sdkMatch = result.metadata.music[0];
        
        // Map SDK response to our ACRCloudMusicEntry
        const mappedMatch: ACRCloudMusicEntry = {
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
          // external_metadata might not be directly available or structured the same way.
                          // The SDK type (Music) doesn't list external_metadata.
                          // If ACRCloud returns Spotify/YouTube IDs, they are often at the top level of `sdkMatch`
                          // or within `sdkMatch.external_ids`. For now, we initialize it as potentially empty.
                          // Actual testing will reveal where these IDs are located in the SDK response.
          external_metadata: { 
            // Example: if sdkMatch has spotify_track_id, map it here
            // spotify: sdkMatch.spotify ? { track: { id: sdkMatch.spotify.track_id, name: sdkMatch.spotify.track_name } ... } : undefined
          }
        };
        
        // If Spotify/YouTube info is directly on sdkMatch or external_ids, adapt here:
        // For example, if the SDK returns a `spotify` object directly in `sdkMatch.external_metadata` (unlikely based on its type def)
        // or if `sdkMatch.external_ids.spotify_id` exists.
        // For now, we assume the basic fields are covered.
        // You will need to inspect the actual `result` from the SDK to correctly map `external_metadata`
        // if Spotify/YouTube/Deezer IDs are crucial and present.

        console.log(`[ACRCloud Service] SDK Match found: "${mappedMatch.title}" by ${mappedMatch.artists.map(a=>a.name).join(', ')}`);
        return {
          isMatched: true,
          match: mappedMatch,
        };
      } else {
        console.log(`[ACRCloud Service] SDK: No music match found${logContext} (File: ${originalFileName || 'N/A'})`);
        return { isMatched: false };
      }
    } else {
      const errorCode = result.status?.code || 500; // Default to 500 if no code
      const errorMessage = result.status?.msg || 'ACRCloud SDK returned an error';
      console.error(`[ACRCloud Service] SDK API Error (Code: ${errorCode}): ${errorMessage}${logContext} (File: ${originalFileName || 'N/A'})`);
      return { isMatched: false, error: true, errorMessage, errorCode };
    }
  } catch (err: any) {
    console.error(`[ACRCloud Service] SDK identify() error${logContext} (File: ${originalFileName || 'N/A'}):`, err);
    // Check if error has a specific structure from the SDK, e.g. err.message or err.code
    const errorMessage = err.message || 'Error during ACRCloud SDK recognition';
    const errorCode = err.code || undefined; // If the error object has a code
    return { isMatched: false, error: true, errorMessage, errorCode };
  }
}; 