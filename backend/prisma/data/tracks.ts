import { AlbumType } from '@prisma/client';

// Track data structure for standalone singles
export interface SingleTrackData {
  artistName: string;
  title: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  genreNames: string[];
  labelName: string | null;
  featuredArtistNames: string[];
  playCount?: number;
  releaseDate?: Date;
}

// Export the singles data
export const singles: SingleTrackData[] = [
  // Vũ.'s Single
  {
    artistName: 'Vũ.',
    title: 'Vì Anh Đâu Có Biết',
    duration: 241, // 4:01
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442415/testAlbum/V%C5%A9/V%C3%AC%20Anh%20%C4%90%C3%A2u%20C%C3%B3%20Bi%E1%BA%BFt/frou2hv5xqhghbnlervy.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442420/testAlbum/V%C5%A9/V%C3%AC%20Anh%20%C4%90%C3%A2u%20C%C3%B3%20Bi%E1%BA%BFt/w6t3yuq960odthomqphq.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 100
  },
  
  // Wren Evans' Singles
  {
    artistName: 'Wren Evans',
    title: 'Từng Quen',
    duration: 174, // 2:54
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442570/testAlbum/Wren%20Evans/T%E1%BB%ABng%20Quen/wzrdd9fi2qihaqihoiro.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442574/testAlbum/Wren%20Evans/T%E1%BB%ABng%20Quen/c603qnanwdwodfrrc5xr.mp3',
    genreNames: ['V-Pop', 'Hip-Hop'],
    labelName: 'SPACESPEAKERS LABEL',
    featuredArtistNames: ['itsnk'],
    playCount: 80
  },
  {
    artistName: 'Wren Evans',
    title: 'Để Ý',
    duration: 159, // 2:39
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442569/testAlbum/Wren%20Evans/%C4%90%E1%BB%83%20%C3%9D/dkziecvuunuibpmipxfs.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442576/testAlbum/Wren%20Evans/%C4%90%E1%BB%83%20%C3%9D/cdiz4wskknjr4hxtdpn6.mp3',
    genreNames: ['V-Pop', 'R&B'],
    labelName: 'SPACESPEAKERS LABEL',
    featuredArtistNames: [],
    playCount: 75
  },
  
  // Phan Đinh Tùng's Single
  {
    artistName: 'Phan Đinh Tùng',
    title: 'Khúc Hát Mừng Sinh Nhật',
    duration: 209, // 3:29
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442756/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/tomj0zyas6grk3zft230.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442668/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/qrm9ovig9ezxdpsysdwj.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'Đông Tây Promotion',
    featuredArtistNames: [],
    playCount: 90
  }
];

// Function to get single by title and artist (useful for references)
export function getSingleByTitleAndArtist(title: string, artistName: string): SingleTrackData | undefined {
  return singles.find(single => single.title === title && single.artistName === artistName);
} 