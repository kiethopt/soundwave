import { AlbumType } from '@prisma/client';

// Track data structure for use within albums
export interface TrackData {
  title: string;
  audioUrl: string;
  trackNumber: number;
  duration: number; // in seconds
  featuredArtists?: string[]; // Names of featured artists
  coverUrl?: string; // For singles or tracks with distinct cover art
}

// Album data structure
export interface AlbumData {
  artistName: string; // Name of the main artist
  title: string;
  coverUrl: string;
  type: AlbumType;
  labelName: string | null;
  genreNames: string[];
  releaseDate?: Date; // Optional, can default to current date in seed script
  tracks: TrackData[];
  featuredArtistNames?: string[]; // Names of featured artists for entire album
}

// Export the album data
export const albums: AlbumData[] = [
  // Obito - "Đánh Đổi" album
  {
    artistName: 'Obito',
    title: 'Đánh Đổi',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743859847/DanhDoi_j5xynv.jpg',
    type: AlbumType.ALBUM,
    labelName: 'CIRCLE R',
    genreNames: ['V-Pop', 'Hip-Hop', 'Rap'],
    tracks: [
      {
        title: 'Intro',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859179/Intro_hdgyvj.mp3',
        trackNumber: 1,
        duration: 120, // Estimated duration in seconds
        featuredArtists: ['Shiki']
      },
      {
        title: 'Xuất Phát Điểm',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859201/Xu%E1%BA%A5t_Ph%C3%A1t_%C4%90i%E1%BB%83m_hix0i2.mp3',
        trackNumber: 2,
        duration: 240,
        featuredArtists: ['Shiki']
      },
      {
        title: 'CL5 (interlude)',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859173/CL5_interlude_weh1oq.mp3',
        trackNumber: 3,
        duration: 90,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Đầu Đường Xó Chợ',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859196/%C4%90%E1%BA%A7u_%C4%90%C6%B0%E1%BB%9Dng_X%C3%B3_Ch%E1%BB%A3_oc3l9v.mp3',
        trackNumber: 4,
        duration: 210,
        featuredArtists: ['Shiki', 'Lăng LD']
      },
      {
        title: 'Biên Giới Long Bình',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859189/Bi%C3%AAn_Gi%E1%BB%9Bi_Long_B%C3%ACnh_auvhuj.mp3',
        trackNumber: 5,
        duration: 180,
        featuredArtists: ['Shiki']
      },
      {
        title: '16',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859189/Bi%C3%AAn_Gi%E1%BB%9Bi_Long_B%C3%ACnh_auvhuj.mp3',
        trackNumber: 6,
        duration: 183,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Sài Gòn Ơi',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859190/S%C3%A0i_G%C3%B2n_%C6%A1i_nfhauv.mp3',
        trackNumber: 7,
        duration: 195,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Trốn chạy',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859199/Tr%E1%BB%91n_Ch%E1%BA%A1y_tzewqe.mp3',
        trackNumber: 8,
        duration: 215,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Cất cánh',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859178/C%E1%BA%A5t_c%C3%A1nh_interlude_gkahis.mp3',
        trackNumber: 9,
        duration: 100,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Hà Nội',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859182/H%C3%A0_N%E1%BB%99i_kwfdua.mp3',
        trackNumber: 10,
        duration: 187,
        featuredArtists: ['Shiki', 'VSTRA']
      },
      {
        title: 'Vô Điều Kiện',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859182/H%C3%A0_N%E1%BB%99i_kwfdua.mp3',
        trackNumber: 11,
        duration: 220,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Đánh Đổi',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859197/%C4%90%C3%A1nh_%C4%90%E1%BB%95i_r3panr.mp3',
        trackNumber: 12,
        duration: 240,
        featuredArtists: ['Shiki', 'RPT MCK']
      },
      {
        title: 'Backstage Freestyle',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859175/Backstage_Freestyle_gnpfyw.mp3',
        trackNumber: 13,
        duration: 180,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Tell the kids i love them',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859192/Tell_the_kids_i_love_them_pwqmbw.mp3',
        trackNumber: 14,
        duration: 175,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Ước mơ của Mẹ (interlude)',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859202/%C6%AF%E1%BB%9Bc_m%C6%A1_c%E1%BB%A7a_M%E1%BA%B9_interlude_tyntaq.mp3',
        trackNumber: 15,
        duration: 90,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Con kể Ba nghe',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859181/Con_k%E1%BB%83_Ba_nghe_scl0nl.mp3',
        trackNumber: 16,
        duration: 198,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Champion',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859186/Champion_czjzsv.mp3',
        trackNumber: 17,
        duration: 210,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Chưa Xong',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859178/Ch%C6%B0a_Xong_xx7qeu.mp3',
        trackNumber: 18,
        duration: 195,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Tự Sự',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859190/T%E1%BB%B1_S%E1%BB%B1_ydp8j3.mp3',
        trackNumber: 19,
        duration: 205,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Outro',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859177/Outro_rownnb.mp3',
        trackNumber: 20,
        duration: 85,
        featuredArtists: ['Shiki']
      }
    ]
  },
  
  // AMEE - "MỘNGMEE" EP
  {
    artistName: 'AMEE',
    title: 'MỘNGMEE',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860146/MongMee_y2wzve.jpg',
    type: AlbumType.EP,
    labelName: 'Yin Yang Media',
    genreNames: ['V-Pop', 'Pop', 'R&B'],
    tracks: [
      {
        title: 'MỘNG YU',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860161/M%E1%BB%98NG_YU_lt0z7a.mp3',
        trackNumber: 1,
        duration: 195,
        featuredArtists: ['RPT MCK']
      },
      {
        title: 'Cuộc gọi lúc nửa đêm',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860154/Cu%E1%BB%99c_g%E1%BB%8Di_l%C3%BAc_n%E1%BB%ADa_%C4%91%C3%AAm_cr875y.mp3',
        trackNumber: 2,
        duration: 210
      },
      {
        title: 'Beautiful nightmare (interlude)',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860150/Beautiful_nightmare_interlude_v31pfv.mp3',
        trackNumber: 3,
        duration: 90
      },
      {
        title: 'Miền Mộng Mị',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860154/Mi%E1%BB%81n_M%E1%BB%99ng_M%E1%BB%8B_zuoo0s.mp3',
        trackNumber: 4,
        duration: 205
      },
      {
        title: '2000 câu hỏi vì sao',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860151/2000_c%C3%A2u_h%E1%BB%8Fi_v%C3%AC_sao_vy4g9r.mp3',
        trackNumber: 5,
        duration: 180
      }
    ]
  },
  
  // Vũ. - "Bảo Tàng Của Nuối Tiếc" album
  {
    artistName: 'Vũ.',
    title: 'Bảo Tàng Của Nuối Tiếc',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743434878/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/elnrlzd5dgkcl4euioqe.jpg',
    type: AlbumType.ALBUM,
    labelName: 'Warner Music Vietnam',
    genreNames: ['V-Pop', 'Ballad', 'Singer-Songwriter'],
    tracks: [
      {
        title: 'Nếu Những Tiếc Nuối',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434824/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/dfiktyddtxdxvfgj4dyg.mp3',
        trackNumber: 1,
        duration: 260, // 4:20
      },
      {
        title: 'Mùa Mưa Ấy',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434777/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/qtkjlfyq2qxj6yr0enn3.mp3',
        trackNumber: 2,
        duration: 228, // 3:48
      },
      {
        title: 'Ngồi Chờ Trong Vấn Vương',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434754/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/axxycictkwiapoqlbgwv.mp3',
        trackNumber: 3,
        duration: 201, // 3:21
      },
      {
        title: 'Dành Hết Xuân Thì Để Chờ Nhau',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434845/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/rnqmok8sosnkawwdxz0d.mp3',
        trackNumber: 4, 
        duration: 288, // 4:48
      },
      {
        title: 'Và Em Sẽ Luôn Là Người Tôi Yêu Nhất',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434797/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/zy6xfmqzhjwirntwaaae.mp3',
        trackNumber: 5,
        duration: 257, // 4:17
      },
      {
        title: 'Những Chuyến Bay',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434861/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/lonb3cmtqmeugwzfcwtn.mp3',
        trackNumber: 6,
        duration: 273, // 4:33
      },
      {
        title: 'Mây Khóc Vì Điều Gì',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434787/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/oqqbltgfg82lhtqqhz9o.mp3',
        trackNumber: 7,
        duration: 214, // 3:34
      },
      {
        title: 'Những Lời Hứa Bỏ Quên',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434756/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/auuktbf2dboi0i1kjlzl.mp3',
        trackNumber: 8,
        duration: 236, // 3:56
      },
      {
        title: 'Không Yêu Em Thì Yêu Ai',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434791/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/glvb7rydfc9xmsoehnwq.mp3',
        trackNumber: 9,
        duration: 232, // 3:52
      },
      {
        title: 'bình yên',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434776/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/myyqqjyhofy8pzetplpc.mp3',
        trackNumber: 10,
        duration: 201, // 3:21
      },
    ],
  },
  
  // Shiki - "Lặng" album
  {
    artistName: 'Shiki',
    title: 'Lặng',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743436315/testAlbum/Shiki/L%E1%BA%B7ng/c4n2z5lw7j38cevdcjwn.jpg',
    type: AlbumType.ALBUM,
    labelName: 'CDSL',
    genreNames: ['V-Pop', 'Lo-fi', 'Indie'],
    tracks: [
      {
        title: '1000 Ánh Mắt',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436373/testAlbum/Shiki/L%E1%BA%B7ng/rigndjyu6sha8qudao4d.mp3',
        trackNumber: 1,
        duration: 152, // 2:32
      },
      {
        title: 'Anh Vẫn Đợi',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436465/testAlbum/Shiki/L%E1%BA%B7ng/i6hmq7l3hdqvbxu5e28r.mp3',
        trackNumber: 2,
        duration: 152, // 2:32
      },
      {
        title: 'Có Đôi Điều',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436588/testAlbum/Shiki/L%E1%BA%B7ng/qxklb5cw51whc4isrc0q.mp3',
        trackNumber: 3,
        duration: 174, // 2:54
      },
      {
        title: 'Lặng',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436725/testAlbum/Shiki/L%E1%BA%B7ng/sgvcaztihnxys4q8jiwf.mp3',
        trackNumber: 4,
        duration: 196, // 3:16
      },
      {
        title: 'Night Time',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436782/testAlbum/Shiki/L%E1%BA%B7ng/zqwu8zxop4btjefhmegl.mp3',
        trackNumber: 5,
        duration: 228, // 3:48
      },
      {
        title: 'Perfect',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436825/testAlbum/Shiki/L%E1%BA%B7ng/odtql92weapv0vu7cwch.mp3',
        trackNumber: 6,
        duration: 188, // 3:08
      }, 
      {
        title: 'Take Off Your Hands',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436987/testAlbum/Shiki/L%E1%BA%B7ng/wxsbjznbjgpkgbma1rhr.mp3',
        trackNumber: 7,
        duration: 204, // 3:24
      },
    ],
  },
  
  // Low G - "FLVR" EP (featuring tlinh)
  {
    artistName: 'Low G',
    title: 'FLVR',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743437224/testAlbum/tlinh%2C%20Low%20G/FLVR/oxz6tyeukjvo9lkcfw51.jpg',
    type: AlbumType.EP,
    labelName: 'SPACESPEAKERS LABEL',
    genreNames: ['V-Pop', 'Hip-Hop', 'Rap'],
    featuredArtistNames: ['tlinh'], // tlinh is the featured artist for the whole EP
    tracks: [
      {
        title: 'DÂU TẰM',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437229/testAlbum/tlinh%2C%20Low%20G/FLVR/bgsotddidlfj6zrzbtyn.mp3',
        trackNumber: 1,
        duration: 160, // 2:40
      },
      {
        title: 'NGÂN',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437334/testAlbum/tlinh%2C%20Low%20G/FLVR/ntlvaidfotjbmw9rxg3z.mp3',
        trackNumber: 2,
        duration: 158, // 2:38
      },
      {
        title: 'HOP ON DA SHOW',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437358/testAlbum/tlinh%2C%20Low%20G/FLVR/pgdrfb8oux5ub958hrvf.mp3',
        trackNumber: 3,
        duration: 175, // 2:55
      },
      {
        title: 'PHÓNG ZÌN ZÌN',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437384/testAlbum/tlinh%2C%20Low%20G/FLVR/vqv3bigkrhgob2diijnu.mp3',
        trackNumber: 4,
        duration: 203, // 3:23
      },
    ],
  },
];

// Function to get album by title (useful for references)
export function getAlbumByTitle(title: string): AlbumData | undefined {
  return albums.find(album => album.title === title);
} 