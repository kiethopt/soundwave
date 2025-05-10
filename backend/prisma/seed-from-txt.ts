// @ts-nocheck
// This script is intended to be run with tsx or after compiling to JS.
// Make sure to install @types/node for type support: npm i --save-dev @types/node
// Install csv-parse for robust TSV parsing: npm i csv-parse
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Utility to parse a TXT (TSV) file into an array of objects using csv-parse
function parseTxtFile(filePath: string): any[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    delimiter: '\t',
    columns: true,
    skip_empty_lines: true,
    trim: true,
    quote: ''
  });
}

// Placeholder: Map parsed Artist.txt data to ArtistData structure
function mapArtistData(raw: any[]): any[] {
  return raw.filter(r => r['User Email'] && r['User Username'] && r['User Name']).map(r => {
    let socialMediaLinks = {};
    if (r['Social Media Links']) {
      try {
        socialMediaLinks = JSON.parse(r['Social Media Links']);
      } catch (e) {
        console.warn('Warning: Failed to parse Social Media Links for', r['Name'] || r['User Name'], 'Value:', r['Social Media Links']);
        socialMediaLinks = {};
      }
    }
    return {
      user: {
        email: r['User Email'],
        username: r['User Username'],
        name: r['User Name'],
      },
      profile: {
        artistName: r['Name'],
        bio: r['Bio'],
        avatar: r['Avatar'],
        socialMediaLinks,
      },
    };
  });
}

// Placeholder: Map parsed Album.txt data to AlbumData structure
function mapAlbumData(raw: any[], allTracks: any[]): any[] {
  // Group tracks by album title
  const tracksByAlbum: Record<string, any[]> = {};
  allTracks.forEach(track => {
    if (track['Album'] && track['Album Type'] && track['Album Type'] !== 'SINGLE') {
      if (!tracksByAlbum[track['Album']]) tracksByAlbum[track['Album']] = [];
      tracksByAlbum[track['Album']].push(track);
    }
  });
  return raw.filter(r => r['Title'] && r['Artist']).map(r => ({
    artistName: r['Artist'],
    title: r['Title'],
    coverUrl: r['Cover URL'],
    type: r['Album Type'] === 'EP' ? 'AlbumType.EP' : 'AlbumType.ALBUM',
    labelName: r['Label'] || null,
    genreNames: r['Genres'] ? r['Genres'].split(',').map((g: string) => g.trim()).filter(Boolean) : [],
    releaseDate: r['Release Date'] ? `new Date('${r['Release Date']}')` : undefined,
    tracks: (tracksByAlbum[r['Title']] || []).map((t, idx) => ({
      title: t['Title'],
      audioUrl: t['Audio URL'],
      trackNumber: t['Track Number'] ? Number(t['Track Number']) : idx + 1,
      featuredArtists: t['Featured Artist Names'] ? t['Featured Artist Names'].split(',').map((n) => n.trim()).filter(Boolean) : [],
      coverUrl: t['Cover URL'] || undefined,
      tempo: t['Tempo'] ? Number(t['Tempo']) : undefined,
      mood: t['Mood'] || undefined,
      key: t['Key'] || undefined,
      scale: t['Scale'] || undefined,
      danceability: t['Danceability'] ? Number(t['Danceability']) : undefined,
      energy: t['Energy'] ? Number(t['Energy']) : undefined,
    })),
    featuredArtistNames: [], // Not in txt
  }));
}

// Placeholder: Map parsed Track.txt data to TrackData structure
function mapTrackData(raw: any[]): any[] {
  // Only include tracks that are singles
  return raw.filter(r => r['Title'] && r['Artist'] && (r['Album Type'] === 'SINGLE' || !r['Album Type'])).map(r => ({
    artistName: r['Artist'],
    title: r['Title'],
    coverUrl: r['Cover URL'],
    audioUrl: r['Audio URL'],
    genreNames: r['Genres'] ? r['Genres'].split(',').map((g: string) => g.trim()).filter(Boolean) : [],
    labelName: r['Label Name'] || null,
    featuredArtistNames: r['Featured Artist Names'] ? r['Featured Artist Names'].split(',').map((n: string) => n.trim()).filter(Boolean) : [],
    playCount: r['Play Count'] ? Number(r['Play Count']) : undefined,
    releaseDate: r['Release Date'] ? `new Date('${r['Release Date']}')` : undefined,
    tempo: r['Tempo'] ? Number(r['Tempo']) : undefined,
    mood: r['Mood'] || undefined,
    key: r['Key'] || undefined,
    scale: r['Scale'] || undefined,
    danceability: r['Danceability'] ? Number(r['Danceability']) : undefined,
    energy: r['Energy'] ? Number(r['Energy']) : undefined,
  }));
}

// Placeholder: Serialize array as TypeScript export
function serializeToTS(array: any[], typeName: string, exportName: string): string {
  // Custom replacer for Date and enums
  function replacer(key: string, value: any) {
    if (typeof value === 'string' && value.startsWith('new Date(')) return value;
    if (value === 'AlbumType.EP' || value === 'AlbumType.ALBUM') return value;
    return value;
  }
  let json = JSON.stringify(array, replacer, 2)
    .replace(/"(new Date\([^)]+\))"/g, '$1')
    .replace(/"(AlbumType\.[A-Z]+)"/g, '$1');
  return `export const ${exportName}: ${typeName}[] = ${json};\n`;
}

// Placeholder: Write to file
function writeToFile(filePath: string, content: string) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Utility to normalize Windows paths from file URLs
function normalizePath(p: string): string {
  if (process.platform === 'win32' && p.startsWith('/') && /^[a-zA-Z]:/.test(p.slice(1, 3))) {
    return p.slice(1);
  }
  return p;
}

console.log('DEBUG: import.meta.url =', import.meta.url, 'process.argv[1] =', process.argv[1]);

// Main script logic (to be implemented)
function main() {
  console.log('DEBUG: main() function is running');
  // Paths
  const scriptDir = normalizePath(path.dirname(new URL(import.meta.url).pathname));
  const dataDir = path.join(scriptDir, 'data');
  const artistTxt = path.join(dataDir, 'Artist.txt');
  const albumTxt = path.join(dataDir, 'Album.txt');
  const trackTxt = path.join(dataDir, 'Track.txt');
  const artistsTs = path.join(dataDir, 'artists.ts');
  const albumsTs = path.join(dataDir, 'albums.ts');
  const tracksTs = path.join(dataDir, 'tracks.ts');

  // Parse and map
  const artistsRaw = parseTxtFile(artistTxt);
  const albumsRaw = parseTxtFile(albumTxt);
  const tracksRaw = parseTxtFile(trackTxt);
  const artists = mapArtistData(artistsRaw);
  const albums = mapAlbumData(albumsRaw, tracksRaw);
  const tracks = mapTrackData(tracksRaw);

  // Serialize
  const artistsExport = `import { Role } from '@prisma/client';\n\nexport interface ArtistData {\n  user: { email: string; username: string; name: string; };\n  profile: { artistName: string; bio: string; avatar: string; socialMediaLinks?: { facebook?: string; instagram?: string; }; };\n}\n\n` + serializeToTS(artists, 'ArtistData', 'artists');
  const albumsExport = `import { AlbumType } from '@prisma/client';\n\nexport interface TrackData {\n  title: string; audioUrl: string; trackNumber: number; featuredArtists?: string[]; coverUrl?: string; tempo?: number; mood?: string; key?: string; scale?: string; danceability?: number; energy?: number;\n}\n\nexport interface AlbumData {\n  artistName: string; title: string; coverUrl: string; type: AlbumType; labelName: string | null; genreNames: string[]; releaseDate?: Date; tracks: TrackData[]; featuredArtistNames?: string[];\n}\n\n` + serializeToTS(albums, 'AlbumData', 'albums');
  const tracksExport = `import { AlbumType } from '@prisma/client';\n\nexport interface SingleTrackData {\n  artistName: string; title: string; coverUrl: string; audioUrl: string; genreNames: string[]; labelName: string | null; featuredArtistNames: string[]; playCount?: number; releaseDate?: Date; tempo?: number; mood?: string; key?: string; scale?: string; danceability?: number; energy?: number;\n}\n\n` + serializeToTS(tracks, 'SingleTrackData', 'singles');

  // Write
  writeToFile(artistsTs, artistsExport);
  writeToFile(albumsTs, albumsExport);
  writeToFile(tracksTs, tracksExport);

  console.log('Seed files generated from TXT data.');
}

// Always run main() when this script is executed directly (for tsx/ESM compatibility)
main(); 