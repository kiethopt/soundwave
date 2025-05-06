import { AlbumType } from '@prisma/client';

// Track data structure for use within albums
export interface TrackData {
  title: string;
  audioUrl: string;
  trackNumber: number;
  featuredArtists?: string[];
  coverUrl?: string;
  tempo?: number;
  mood?: string;
  key?: string;
  scale?: string;
  danceability?: number;
  energy?: number;
}

// Album data structure
export interface AlbumData {
  artistName: string;
  title: string;
  coverUrl: string;
  type: AlbumType;
  labelName: string | null;
  genreNames: string[];
  releaseDate?: Date;
  tracks: TrackData[];
  featuredArtistNames?: string[];
}

// Export the album data
export const albums: AlbumData[] = [
  // AMEE - "MỘNGMEE" EP
  {
    artistName: 'AMEE',
    title: 'MỘNGMEE',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278911/unnamed_w32pik.jpg',
    type: AlbumType.EP,
    labelName: 'Yin Yang Media',
    genreNames: ['V-Pop', 'Pop', 'R&B'],
    releaseDate: new Date('2024-08-02'),
    tracks: [
      {
        title: 'MỘNG YU',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278900/M%E1%BB%98NG_YU_hdzoip.mp3',
        trackNumber: 1,
        featuredArtists: ['RPT MCK'],
        tempo: 105,
        mood: 'Dreamy',
        key: 'D',
        scale: 'minor',
        danceability: 0.75,
        energy: 0.68
      },
      {
        title: 'Cuộc gọi lúc nửa đêm',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278902/Cu%E1%BB%99c_g%E1%BB%8Di_l%C3%BAc_n%E1%BB%ADa_%C4%91%C3%AAm_poavd2.mp3',
        trackNumber: 2,
        tempo: 92,
        mood: 'Melancholic',
        key: 'F',
        scale: 'minor',
        danceability: 0.62,
        energy: 0.55
      },
      {
        title: 'Beautiful nightmare (interlude)',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278901/Beautiful_nightmare_interlude_l5mgzv.mp3',
        trackNumber: 3,
        tempo: 80,
        mood: 'Atmospheric',
        key: 'Bb',
        scale: 'minor',
        danceability: 0.40,
        energy: 0.35
      },
      {
        title: 'Miền Mộng Mị',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278903/Mi%E1%BB%81n_M%E1%BB%99ng_M%E1%BB%8B_ytlbc6.mp3',
        trackNumber: 4,
        tempo: 98,
        mood: 'Ethereal',
        key: 'G',
        scale: 'minor',
        danceability: 0.70,
        energy: 0.60
      },
      {
        title: '2000 câu hỏi vì sao',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278906/2000_c%C3%A2u_h%E1%BB%8Fi_v%C3%AC_sao_kjuj2s.mp3',
        trackNumber: 5,
        tempo: 110,
        mood: 'Curious',
        key: 'A',
        scale: 'major',
        danceability: 0.78,
        energy: 0.70
      }
    ]
  },
  
  // Vũ. - "Bảo Tàng Của Nuối Tiếc" album
  {
    artistName: 'Vũ.',
    title: 'Bảo Tàng Của Nuối Tiếc',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp',
    type: AlbumType.ALBUM,
    labelName: 'Warner Music Vietnam',
    genreNames: ['V-Pop', 'Ballad', 'Singer-Songwriter'],
    releaseDate: new Date('2024-09-27'),
    tracks: [
      {
        title: 'Nếu Những Tiếc Nuối',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279173/N%E1%BA%BFu_Nh%E1%BB%AFng_Ti%E1%BA%BFc_Nu%E1%BB%91i_pm4vid.mp3',
        trackNumber: 1,
        tempo: 75,
        mood: 'Nostalgic',
        key: 'C',
        scale: 'minor',
        danceability: 0.45,
        energy: 0.40
      },
      {
        title: 'Mùa Mưa Ấy',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279230/M%C3%B9a_M%C6%B0a_%E1%BA%A4y_oqmyir.mp3',
        trackNumber: 2,
        tempo: 80,
        mood: 'Melancholic',
        key: 'D',
        scale: 'minor',
        danceability: 0.50,
        energy: 0.42
      },
      {
        title: 'Ngồi Chờ Trong Vấn Vương',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279232/Ng%E1%BB%93i_Ch%E1%BB%9D_Trong_V%E1%BA%A5n_V%C6%B0%C6%A1ng_u5yxxf.mp3',
        trackNumber: 3,
        tempo: 85,
        mood: 'Longing',
        key: 'F',
        scale: 'major',
        danceability: 0.55,
        energy: 0.48
      },
      {
        title: 'Dành Hết Xuân Thì Để Chờ Nhau',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279245/D%C3%A0nh_H%E1%BA%BFt_Xu%C3%A2n_Th%C3%AC_%C4%90%E1%BB%83_Ch%E1%BB%9D_Nhau_w7qpyu.mp3',
        trackNumber: 4, 
        tempo: 72,
        mood: 'Romantic',
        key: 'A',
        scale: 'minor',
        danceability: 0.48,
        energy: 0.45
      },
      {
        title: 'Và Em Sẽ Luôn Là Người Tôi Yêu Nhất',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279246/V%C3%A0_Em_S%E1%BA%BD_Lu%C3%B4n_L%C3%A0_Ng%C6%B0%E1%BB%9Di_T%C3%B4i_Y%C3%AAu_Nh%E1%BA%A5t_uytipi.mp3',
        trackNumber: 5,
        tempo: 78,
        mood: 'Emotional',
        key: 'E',
        scale: 'minor',
        danceability: 0.52,
        energy: 0.50
      },
      {
        title: 'Những Chuyến Bay',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279235/Nh%E1%BB%AFng_Chuy%E1%BA%BFn_Bay_ocwwlh.mp3',
        trackNumber: 6,
        tempo: 95,
        mood: 'Contemplative',
        key: 'G',
        scale: 'major',
        danceability: 0.60,
        energy: 0.55
      },
      {
        title: 'Mây Khóc Vì Điều Gì',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279237/M%C3%A2y_Kh%C3%B3c_V%C3%AC_%C4%90i%E1%BB%81u_G%C3%AC_nwjsrz.mp3',
        trackNumber: 7,
        tempo: 70,
        mood: 'Sad',
        key: 'D',
        scale: 'minor',
        danceability: 0.45,
        energy: 0.40
      },
      {
        title: 'Những Lời Hứa Bỏ Quên',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279239/Nh%E1%BB%AFng_L%E1%BB%9Di_H%E1%BB%A9a_B%E1%BB%8F_Qu%C3%AAn_l7e4sr.mp3',
        trackNumber: 8,
        tempo: 82,
        mood: 'Regretful',
        key: 'Bb',
        scale: 'minor',
        danceability: 0.50,
        energy: 0.45
      },
      {
        title: 'Không Yêu Em Thì Yêu Ai',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279239/Kh%C3%B4ng_Y%C3%AAu_Em_Th%C3%AC_Y%C3%AAu_Ai_y1zpmr.mp3',
        trackNumber: 9,
        tempo: 88,
        mood: 'Passionate',
        key: 'C',
        scale: 'major',
        danceability: 0.58,
        energy: 0.62
      },
      {
        title: 'bình yên',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279240/b%C3%ACnh_y%C3%AAn_emdk2s.mp3',
        trackNumber: 10,
        tempo: 68,
        mood: 'Peaceful',
        key: 'G',
        scale: 'major',
        danceability: 0.40,
        energy: 0.35
      },
    ],
  },
  
  // Shiki - "Lặng" album
  {
    artistName: 'Shiki',
    title: 'Lặng',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg',
    type: AlbumType.ALBUM,
    labelName: 'CDSL',
    genreNames: ['V-Pop', 'Lo-fi', 'Indie'],
    releaseDate: new Date('2024-06-27'),
    tracks: [
      {
        title: '1000 Ánh Mắt',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278547/1000_%C3%81nh_M%E1%BA%AFt_kur2fn.mp3',
        trackNumber: 1,
        tempo: 85,
        mood: 'Dreamy',
        key: 'F#',
        scale: 'minor',
        danceability: 0.60,
        energy: 0.45
      },
      {
        title: 'Anh Vẫn Đợi',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278547/Anh_V%E1%BA%ABn_%C4%90%E1%BB%A3i_fesftl.mp3',
        trackNumber: 2,
        tempo: 75,
        mood: 'Patient',
        key: 'C',
        scale: 'minor',
        danceability: 0.48,
        energy: 0.40
      },
      {
        title: 'Có Đôi Điều',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278553/C%C3%B3_%C4%90%C3%B4i_%C4%90i%E1%BB%81u_sujo0g.mp3',
        trackNumber: 3,
        tempo: 90,
        mood: 'Contemplative',
        key: 'A',
        scale: 'minor',
        danceability: 0.55,
        energy: 0.48
      },
      {
        title: 'Lặng',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278549/L%E1%BA%B7ng_cjpemv.mp3',
        trackNumber: 4,
        tempo: 70,
        mood: 'Quiet',
        key: 'D',
        scale: 'minor',
        danceability: 0.42,
        energy: 0.30
      },
      {
        title: 'Night Time',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278550/Night_Time_r292qy.mp3',
        trackNumber: 5,
        tempo: 80,
        mood: 'Ambient',
        key: 'E',
        scale: 'minor',
        danceability: 0.58,
        energy: 0.40
      },
      {
        title: 'Perfect',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278551/Perfect_yhyrok.mp3',
        trackNumber: 6,
        tempo: 95,
        mood: 'Serene',
        key: 'G',
        scale: 'major',
        danceability: 0.65,
        energy: 0.50
      }, 
      {
        title: 'Take Off Your Hands',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278552/Take_Off_Your_Hands_n9hon1.mp3',
        trackNumber: 7,
        tempo: 88,
        mood: 'Melancholic',
        key: 'B',
        scale: 'minor',
        danceability: 0.62,
        energy: 0.45
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
    releaseDate: new Date('2024-09-18'),
    featuredArtistNames: ['tlinh'],
    tracks: [
      {
        title: 'DÂU TẰM',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437229/testAlbum/tlinh%2C%20Low%20G/FLVR/bgsotddidlfj6zrzbtyn.mp3',
        trackNumber: 1,
        tempo: 130,
        mood: 'Energetic',
        key: 'C',
        scale: 'minor',
        danceability: 0.85,
        energy: 0.80
      },
      {
        title: 'NGÂN',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437334/testAlbum/tlinh%2C%20Low%20G/FLVR/ntlvaidfotjbmw9rxg3z.mp3',
        trackNumber: 2,
        tempo: 125,
        mood: 'Smooth',
        key: 'F#',
        scale: 'minor',
        danceability: 0.80,
        energy: 0.75
      },
      {
        title: 'HOP ON DA SHOW',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437358/testAlbum/tlinh%2C%20Low%20G/FLVR/pgdrfb8oux5ub958hrvf.mp3',
        trackNumber: 3,
        tempo: 140,
        mood: 'Confident',
        key: 'G',
        scale: 'minor',
        danceability: 0.88,
        energy: 0.90
      },
      {
        title: 'PHÓNG ZÌN ZÌN',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437384/testAlbum/tlinh%2C%20Low%20G/FLVR/vqv3bigkrhgob2diijnu.mp3',
        trackNumber: 4,
        tempo: 135,
        mood: 'Intense',
        key: 'D',
        scale: 'minor',
        danceability: 0.90,
        energy: 0.92
      },
    ],
  },
  
  // Shayda - "FOUR" album
  {
    artistName: 'Shayda',
    title: 'FOUR',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp',
    type: AlbumType.ALBUM,
    labelName: 'QP hype',
    genreNames: ['Pop', 'R&B'],
    releaseDate: new Date('2025-02-28'),
    tracks: [
      { 
        title: 'Get Closer', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279871/Get_Closer_tg61oi.mp3', 
        trackNumber: 1,
        tempo: 110,
        mood: 'Intimate',
        key: 'D',
        scale: 'major',
        danceability: 0.78,
        energy: 0.72
      },
      { 
        title: 'Deep', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279872/Deep_efc5xm.mp3', 
        trackNumber: 2,
        tempo: 95,
        mood: 'Introspective',
        key: 'F',
        scale: 'minor',
        danceability: 0.65,
        energy: 0.60
      },
      { 
        title: 'Fight', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279873/Fight_fpnp4q.mp3', 
        trackNumber: 3,
        tempo: 128,
        mood: 'Fierce',
        key: 'G',
        scale: 'minor',
        danceability: 0.80,
        energy: 0.85
      },
      { 
        title: 'Myself', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279875/Myself_mtvhug.mp3', 
        trackNumber: 4,
        tempo: 90,
        mood: 'Reflective',
        key: 'C',
        scale: 'major',
        danceability: 0.62,
        energy: 0.58
      },
      { 
        title: 'Heaven-Sent', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279878/Heaven-Sent_rbml79.mp3', 
        trackNumber: 5,
        tempo: 100,
        mood: 'Ethereal',
        key: 'E',
        scale: 'major',
        danceability: 0.70,
        energy: 0.65
      },
      { 
        title: 'BADAK', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279879/BADAK_nbwxcx.mp3', 
        trackNumber: 6,
        tempo: 135,
        mood: 'Aggressive',
        key: 'A',
        scale: 'minor',
        danceability: 0.85,
        energy: 0.90
      },
      { 
        title: 'Fuck Off', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279882/Fuck_Off_bwlkgg.mp3', 
        trackNumber: 7,
        tempo: 125,
        mood: 'Defiant',
        key: 'F#',
        scale: 'minor',
        danceability: 0.82,
        energy: 0.88
      },
      { 
        title: 'Kill Me', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279925/Kill_Me_d81ifb.mp3', 
        trackNumber: 8,
        tempo: 115,
        mood: 'Dark',
        key: 'B',
        scale: 'minor',
        danceability: 0.75,
        energy: 0.82
      },
      { 
        title: 'Her', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279926/Her_ihixgz.mp3', 
        trackNumber: 9,
        tempo: 88,
        mood: 'Tender',
        key: 'D',
        scale: 'major',
        danceability: 0.60,
        energy: 0.55
      },
      { 
        title: 'How Come ?', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279930/How_Come_giwyhd.mp3', 
        trackNumber: 10,
        tempo: 95,
        mood: 'Questioning',
        key: 'G',
        scale: 'minor',
        danceability: 0.68,
        energy: 0.62
      },
      { 
        title: 'Change', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279930/Change_wodzpx.mp3', 
        trackNumber: 11,
        tempo: 105,
        mood: 'Transformative',
        key: 'A',
        scale: 'major',
        danceability: 0.75,
        energy: 0.70
      },
      { 
        title: 'Face Out', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279932/Face_Out_tuzx6i.mp3', 
        trackNumber: 12,
        tempo: 120,
        mood: 'Assertive',
        key: 'E',
        scale: 'minor',
        danceability: 0.78,
        energy: 0.75
      },
      { 
        title: 'Love Yaaa', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279933/Love_Yaaa_n9uy5o.mp3', 
        trackNumber: 13,
        tempo: 98,
        mood: 'Affectionate',
        key: 'C',
        scale: 'major',
        danceability: 0.72,
        energy: 0.65
      },
      { 
        title: 'Tease My Lover', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279939/Tease_My_Lover_tq6lcq.mp3', 
        trackNumber: 14,
        tempo: 115,
        mood: 'Flirtatious',
        key: 'F',
        scale: 'major',
        danceability: 0.85,
        energy: 0.75
      },
      { 
        title: 'Grateful To Us', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279945/Grateful_To_Us_dr2lov.mp3', 
        trackNumber: 15,
        tempo: 85,
        mood: 'Thankful',
        key: 'D',
        scale: 'major',
        danceability: 0.65,
        energy: 0.60
      }
    ]
  },
  
  // Wren Evans - "LOI CHOI: The Neo Pop Punk" album
  {
    artistName: 'Wren Evans',
    title: 'LOI CHOI: The Neo Pop Punk',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp',
    type: AlbumType.ALBUM,
    labelName: 'Universal Music Vietnam',
    genreNames: ['V-Pop', 'Pop Punk', 'Alternative'],
    releaseDate: new Date('2023-09-17'),
    featuredArtistNames: ['itsnk'],
    tracks: [
      { 
        title: 'Phóng Đổ Tim Em', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276623/Ph%C3%B3ng_%C4%90%E1%BB%95_Tim_Em_hhkpr8.mp3', 
        trackNumber: 1, 
        featuredArtists: ['itsnk'],
        tempo: 145,
        mood: 'Energetic',
        key: 'E',
        scale: 'major',
        danceability: 0.88,
        energy: 0.92
      },
      { 
        title: 'Call Me', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276616/Call_Me_id3iie.mp3', 
        trackNumber: 2, 
        featuredArtists: ['itsnk'],
        tempo: 140,
        mood: 'Upbeat',
        key: 'A',
        scale: 'minor',
        danceability: 0.85,
        energy: 0.90
      },
      { 
        title: 'Cầu Vĩnh Tuy', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276616/C%E1%BA%A7u_V%C4%A9nh_Tuy_cxas2h.mp3', 
        trackNumber: 3, 
        featuredArtists: ['itsnk'],
        tempo: 130,
        mood: 'Nostalgic',
        key: 'D',
        scale: 'major',
        danceability: 0.80,
        energy: 0.85
      },
      { 
        title: 'Từng Quen', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276618/T%E1%BB%ABng_Quen_gn45g4.mp3', 
        trackNumber: 4, 
        featuredArtists: ['itsnk'],
        tempo: 150,
        mood: 'Energetic',
        key: 'C',
        scale: 'major',
        danceability: 0.81,
        energy: 0.88
      },
      { 
        title: 'bé ơi từ từ', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276619/b%C3%A9_%C6%A1i_t%E1%BB%AB_t%E1%BB%AB_o8tl7q.mp3', 
        trackNumber: 5, 
        featuredArtists: ['itsnk'],
        tempo: 120,
        mood: 'Playful',
        key: 'F',
        scale: 'major',
        danceability: 0.78,
        energy: 0.75
      },
      { 
        title: 'Lối Chơi (Interlude)', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276623/L%E1%BB%91i_Ch%C6%A1i_Interlude_wifhgb.mp3', 
        trackNumber: 6, 
        featuredArtists: ['itsnk'],
        tempo: 110,
        mood: 'Atmospheric',
        key: 'G',
        scale: 'minor',
        danceability: 0.60,
        energy: 0.55
      },
      { 
        title: 'Tình Yêu Vĩ Mô', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276617/T%C3%ACnh_Y%C3%AAu_V%C4%A9_M%C3%B4_ilxt4k.mp3', 
        trackNumber: 7, 
        featuredArtists: ['itsnk'],
        tempo: 125,
        mood: 'Romantic',
        key: 'B',
        scale: 'major',
        danceability: 0.75,
        energy: 0.80
      },
      { 
        title: 'Việt Kiều', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276617/Vi%E1%BB%87t_Ki%E1%BB%81u_mfa6i7.mp3', 
        trackNumber: 8, 
        featuredArtists: ['itsnk'],
        tempo: 135,
        mood: 'Bold',
        key: 'D',
        scale: 'minor',
        danceability: 0.82,
        energy: 0.85
      },
      { 
        title: 'ĐĐĐ', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276621/%C4%90%C4%90%C4%90_fhp5py.mp3', 
        trackNumber: 9, 
        featuredArtists: ['itsnk'],
        tempo: 140,
        mood: 'Intense',
        key: 'F#',
        scale: 'minor',
        danceability: 0.85,
        energy: 0.90
      },
      { 
        title: 'Quyền Anh', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276621/Quy%E1%BB%81n_Anh_oshath.mp3', 
        trackNumber: 10, 
        featuredArtists: ['itsnk'],
        tempo: 130,
        mood: 'Powerful',
        key: 'G',
        scale: 'minor',
        danceability: 0.80,
        energy: 0.88
      },
      { 
        title: 'Tò Te Tí', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276623/T%C3%B2_Te_T%C3%AD_aqvkxg.mp3', 
        trackNumber: 11, 
        featuredArtists: ['itsnk'],
        tempo: 125,
        mood: 'Playful',
        key: 'C',
        scale: 'major',
        danceability: 0.85,
        energy: 0.82
      }
    ]
  },

  // Wren Evans - "Chiều Hôm Ấy Anh Thấy Màu Đỏ" album (Long)
  {
    artistName: 'Wren Evans',
    title: 'Chiều Hôm Ấy Anh Thấy Màu Đỏ',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg',
    type: AlbumType.ALBUM,
    labelName: 'Universal Music Vietnam',
    genreNames: ['V-Pop', 'Pop Punk', 'Alternative'],
    releaseDate: new Date('2023-09-17'),
    tracks: [
      {
        title: 'Chiều Hôm Ấy (Intro)',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745729627/Chi%E1%BB%81u_H%C3%B4m_%E1%BA%A4y_Intro_xzzfkh.mp3',
        trackNumber: 1,
        tempo: 85,
        mood: 'Atmospheric',
        key: 'G',
        scale: 'minor',
        danceability: 0.45,
        energy: 0.40
      },
      {
        title: 'Cơn Đau',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745728507/C%C6%A1n_%C4%90au_bvpv0s.mp3',
        trackNumber: 2,
        tempo: 125,
        mood: 'Intense',
        key: 'D',
        scale: 'minor',
        danceability: 0.78,
        energy: 0.85
      },
      {
        title: 'Anh Thấy (Interlude)',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745729621/Anh_Th%E1%BA%A5y_Interlude_e4ac0g.mp3',
        trackNumber: 3,
        tempo: 90,
        mood: 'Reflective',
        key: 'A',
        scale: 'minor',
        danceability: 0.55,
        energy: 0.48
      },
      {
        title: 'Gặp May',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745728522/G%E1%BA%B7p_May_zwzesf.mp3',
        trackNumber: 4,
        tempo: 120,
        mood: 'Hopeful',
        key: 'C',
        scale: 'major',
        danceability: 0.80,
        energy: 0.75
      },
      {
        title: 'Thích Em Hơi Nhiều',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745728522/Th%C3%ADch_Em_H%C6%A1i_Nhi%E1%BB%81u_cfj6yh.mp3',
        trackNumber: 5,
        tempo: 110,
        mood: 'Romantic',
        key: 'G',
        scale: 'major',
        danceability: 0.76,
        energy: 0.68
      },
      {
        title: 'Trao',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745728523/Trao_hkvjpz.mp3',
        trackNumber: 6,
        tempo: 105,
        mood: 'Gentle',
        key: 'F',
        scale: 'major',
        danceability: 0.70,
        energy: 0.65
      },
      {
        title: 'Màu Đỏ (Interlude)',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745728506/M%C3%A0u_%C4%90%E1%BB%8F_Interlude_vqifhe.mp3',
        trackNumber: 7,
        tempo: 88,
        mood: 'Mysterious',
        key: 'E',
        scale: 'minor',
        danceability: 0.50,
        energy: 0.45
      },
      {
        title: 'Mấy Khi',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745728507/M%E1%BA%A5y_Khi_jgc28s.mp3',
        trackNumber: 8,
        tempo: 115,
        mood: 'Wistful',
        key: 'Bb',
        scale: 'major',
        danceability: 0.75,
        energy: 0.70
      },
    ]
  },
  
  // SOOBIN - 'The Playah' EP
  {
    artistName: 'SOOBIN',
    title: 'The Playah',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745730233/theplayah_bsvorq.jpg',
    type: AlbumType.EP,
    labelName: 'SPACESPEAKERS LABEL',
    genreNames: ['V-Pop', 'Pop', 'R&B'],
    releaseDate: new Date('2024-06-25'),
    tracks: [
      {
        title: 'Trò Chơi',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745729932/Tr%C3%B2_Ch%C6%A1i_uv2orf.mp3',
        trackNumber: 1,
        featuredArtists: [],
        tempo: 115,
        mood: 'Playful',
        key: 'F',
        scale: 'minor',
        danceability: 0.85,
        energy: 0.80
      },
      {
        title: 'BLACKJACK',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745729921/BLACKJACK_cpv6nz.mp3',
        trackNumber: 2,
        featuredArtists: ['Binz'],
        tempo: 130,
        mood: 'Confident',
        key: 'G',
        scale: 'minor',
        danceability: 0.90,
        energy: 0.85
      },
      {
        title: 'Tháng Năm',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745729929/Th%C3%A1ng_N%C4%83m_pjozzp.mp3',
        trackNumber: 3,
        featuredArtists: [],
        tempo: 95,
        mood: 'Nostalgic',
        key: 'D',
        scale: 'major',
        danceability: 0.70,
        energy: 0.65
      },
    ]
  },

  // SOOBIN - "BẬT NÓ LÊN" album
  {
    artistName: 'SOOBIN',
    title: 'BẬT NÓ LÊN',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg',
    type: AlbumType.ALBUM,
    labelName: 'SPACESPEAKERS LABEL',
    genreNames: ['V-Pop', 'Pop'],
    releaseDate: new Date('2024-06-25'),
    tracks: [
      { 
        title: 'Intro', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277346/Intro_ywaskk.mp3', 
        trackNumber: 1,
        tempo: 90,
        mood: 'Atmospheric',
        key: 'C',
        scale: 'minor',
        danceability: 0.50,
        energy: 0.55
      },
      { 
        title: 'DANCING IN THE DARK', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277346/DANCING_IN_THE_DARK_ttd4m7.mp3', 
        trackNumber: 2,
        tempo: 125,
        mood: 'Mysterious',
        key: 'G',
        scale: 'minor',
        danceability: 0.88,
        energy: 0.80
      },
      { 
        title: 'Sunset In the City - Deluxe Version', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277347/Sunset_In_The_City_-_Deluxe_Version_iuzgxj.mp3', 
        trackNumber: 3,
        tempo: 110,
        mood: 'Chill',
        key: 'D',
        scale: 'major',
        danceability: 0.75,
        energy: 0.70
      },
      { 
        title: 'Sẽ Quên Em Nhanh Thôi', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277346/S%E1%BA%BD_Qu%C3%AAn_Em_Nhanh_Th%C3%B4i_lonmak.mp3', 
        trackNumber: 4,
        tempo: 95,
        mood: 'Resolute',
        key: 'A',
        scale: 'minor',
        danceability: 0.65,
        energy: 0.62
      },
      { 
        title: 'giá như', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277349/gi%C3%A1_nh%C6%B0_yni3lm.mp3', 
        trackNumber: 5,
        tempo: 80,
        mood: 'Melancholic',
        key: 'F',
        scale: 'minor',
        danceability: 0.55,
        energy: 0.48
      },
      { 
        title: 'Ai Mà Biết Được', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277347/Ai_M%C3%A0_Bi%E1%BA%BFt_%C4%90%C6%B0%E1%BB%A3c_feat._tlinh_zpz4la.mp3',
        trackNumber: 6, 
        featuredArtists: ['tlinh'],
        tempo: 115,
        mood: 'Curious',
        key: 'E',
        scale: 'minor',
        danceability: 0.82,
        energy: 0.75
      },
      { 
        title: 'Bật Nó Lên', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277348/B%E1%BA%ADt_N%C3%B3_L%C3%AAn_vrlrla.mp3', 
        trackNumber: 7,
        tempo: 128,
        mood: 'Energetic',
        key: 'C',
        scale: 'major',
        danceability: 0.90,
        energy: 0.85
      },
      { 
        title: 'Heyyy', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277350/Heyyy_tafehi.mp3', 
        trackNumber: 8,
        tempo: 118,
        mood: 'Flirtatious',
        key: 'Bb',
        scale: 'major',
        danceability: 0.85,
        energy: 0.78
      },
      { 
        title: 'Luật Anh', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277350/Lu%E1%BA%ADt_Anh_feat._Andree_Right_Hand_aafw1m.mp3', 
        trackNumber: 9, 
        featuredArtists: ['Andree Right Hand'],
        tempo: 130,
        mood: 'Confident',
        key: 'D',
        scale: 'minor',
        danceability: 0.88,
        energy: 0.85
      },
      { 
        title: 'Lu Mờ', 
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277351/Lu_M%E1%BB%9D_feat._Kris_V_d3gohk.mp3', 
        trackNumber: 10, 
        featuredArtists: ['Kris V'],
        tempo: 110,
        mood: 'Hazy',
        key: 'G',
        scale: 'minor',
        danceability: 0.80,
        energy: 0.72
      }
    ]
  },

  // MONO - ĐẸP EP
  {
    artistName: 'MONO',
    title: 'ĐẸP',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277957/s9htcpunfrmtv4rks2op_dbwgb7.jpg',
    type: AlbumType.EP,
    labelName: 'M Music Records',
    genreNames: ['V-Pop', 'Pop'],
    releaseDate: new Date('2023-11-30'),
    tracks: [
      {
        title: 'Intro',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277976/Intro_ofgkdq.mp3',
        trackNumber: 1,
        featuredArtists: [],
        tempo: 80,
        mood: 'Atmospheric',
        key: 'F',
        scale: 'major',
        danceability: 0.45,
        energy: 0.40
      },
      {
        title: 'Cười Lên',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277973/C%C6%B0%E1%BB%9Di_L%C3%AAn_yx80yr.mp3',
        trackNumber: 2,
        featuredArtists: [],
        tempo: 115,
        mood: 'Uplifting',
        key: 'G',
        scale: 'major',
        danceability: 0.80,
        energy: 0.75
      },
      {
        title: 'Em Xinh',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277973/Em_Xinh_e56kir.mp3',
        trackNumber: 3,
        featuredArtists: ['Onionn'],
        tempo: 105,
        mood: 'Admiring',
        key: 'C',
        scale: 'major',
        danceability: 0.75,
        energy: 0.70
      },
      {
        title: 'Young',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277974/Young_wcisev.mp3',
        trackNumber: 4,
        featuredArtists: [],
        tempo: 120,
        mood: 'Youthful',
        key: 'D',
        scale: 'major',
        danceability: 0.85,
        energy: 0.80
      },
      {
        title: 'Open Your Eyes',
        audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277976/Open_Your_Eyes_svtz3v.mp3',
        trackNumber: 5,
        featuredArtists: ['Onionn'],
        tempo: 110,
        mood: 'Inspirational',
        key: 'A',
        scale: 'major',
        danceability: 0.78,
        energy: 0.75
      }
    ],
    featuredArtistNames: []
  },

  // MTP - SKY DECADE EP (Long)
  {
    artistName: 'Sơn Tùng M-TP',
    title: 'SKY DECADE',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg',
    type: AlbumType.EP,
    labelName: 'M-TP Entertainment',
    genreNames: ['V-Pop', 'Pop'],
    releaseDate: new Date('2023-12-01'),
    tracks: [
      {
        title: 'Intro 2022',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745720915/Intro_2022_fiw56y.mp3',
        trackNumber: 1,
        featuredArtists: [],
        tempo: 90,
        mood: 'Cinematic',
        key: 'C',
        scale: 'minor',
        danceability: 0.40,
        energy: 0.45
      },
      {
        title: 'Cơn Mưa Xa Dần',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745720920/C%C6%A1n_M%C6%B0a_Xa_D%E1%BA%A7n_ybhkn5.mp3',
        trackNumber: 2,
        featuredArtists: [],
        tempo: 110,
        mood: 'Nostalgic',
        key: 'G',
        scale: 'major',
        danceability: 0.75,
        energy: 0.70
      },
      {
        title: 'Nắng Ấm Ngang Qua',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745720932/N%E1%BA%AFng_%E1%BA%A4m_Ngang_Qua_k4pttn.mp3',
        trackNumber: 3,
        featuredArtists: [],
        tempo: 125,
        mood: 'Bright',
        key: 'E',
        scale: 'major',
        danceability: 0.85,
        energy: 0.80
      },
      {
        title: 'Special Thanks',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745720924/Special_Thanks_piuhdr.mp3',
        trackNumber: 4,
        featuredArtists: [],
        tempo: 95,
        mood: 'Grateful',
        key: 'D',
        scale: 'major',
        danceability: 0.60,
        energy: 0.55
      },
    ],
    featuredArtistNames: [] // No featured artists for the whole EP
  },

  // MTP - m-tp M-TP album (Long)
  {
    artistName: 'Sơn Tùng M-TP',
    title: 'SKY DECADE',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg',
    type: AlbumType.EP,
    labelName: 'M-TP Entertainment',
    genreNames: ['V-Pop', 'Pop'],
    releaseDate: new Date('2023-12-01'),
    tracks: [
      {
        title: 'Cơn Mưa Ngang Qua',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721272/C%C6%A1n_M%C6%B0a_Ngang_Qua_j6fwmt.mp3',
        trackNumber: 1,
        featuredArtists: []
      },
      {
        title: 'Anh Sai Rồi',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721282/Anh_Sai_R%E1%BB%93i_drr2vl.mp3',
        trackNumber: 2,
        featuredArtists: []
      },
      {
        title: 'Nắng Ấm Xa Dần',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/N%E1%BA%AFng_%E1%BA%A4m_Xa_D%E1%BA%A7n_formje.mp3',
        trackNumber: 3,
        featuredArtists: []
      },
      {
        title: 'Em Của Ngày Hôm Qua',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721273/Em_C%E1%BB%A7a_Ng%C3%A0y_H%C3%B4m_Qua_awezus.mp3',
        trackNumber: 4,
        featuredArtists: []
      },
      {
        title: 'Chắc Ai Đó Sẽ Về',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721273/Ch%E1%BA%AFc_Ai_%C4%90%C3%B3_S%E1%BA%BD_V%E1%BB%81_ygjdiq.mp3',
        trackNumber: 5,
        featuredArtists: []
      },
      {
        title: 'Không Phải Dạng Vừa Đâu',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721272/Kh%C3%B4ng_Ph%E1%BA%A3i_D%E1%BA%A1ng_V%E1%BB%ABa_%C4%90%C3%A2u_cygu7r.mp3',
        trackNumber: 6,
        featuredArtists: []
      },
      {
        title: 'Thái Bình Mồ Hôi Rơi',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721283/Th%C3%A1i_B%C3%ACnh_M%E1%BB%93_H%C3%B4i_R%C6%A1i_pxt49y.mp3',
        trackNumber: 7,
        featuredArtists: []
      },

      {
        title: 'Khuôn Mặt Đáng Thương',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Khu%C3%B4n_M%E1%BA%B7t_%C4%90%C3%A1ng_Th%C6%B0%C6%A1ng_ulstlp.mp3',
        trackNumber: 8,
        featuredArtists: []
      },
      {
        title: 'Tiến Lên Việt Nam Ơi',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Ti%E1%BA%BFn_L%C3%AAn_Vi%E1%BB%87t_Nam_%C6%A0i_eojbzk.mp3',
        trackNumber: 9,
        featuredArtists: []
      },
      {
        title: 'Ấn Nút Nhớ... Thả Giấc Mơ',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721272/%E1%BA%A4n_N%C3%BAt_Nh%E1%BB%9B..._Th%E1%BA%A3_Gi%E1%BA%A5c_M%C6%A1_xdffps.mp3',
        trackNumber: 10,
        featuredArtists: []
      },
      {
        title: 'Âm Thầm Bên Em',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721273/%C3%82m_Th%E1%BA%A7m_B%C3%AAn_Em_irif9v.mp3',
        trackNumber: 11,
        featuredArtists: []
      },
      {
        title: 'Buông Đôi Tay Nhau Ra',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Bu%C3%B4ng_%C4%90%C3%B4i_Tay_Nhau_Ra_sjwdvv.mp3',
        trackNumber: 12,
        featuredArtists: []
      },
      {
        title: 'Như Ngày Hôm Qua',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Nh%C6%B0_Ng%C3%A0y_H%C3%B4m_Qua_vytwoj.mp3',
        trackNumber: 13,
        featuredArtists: []
      },
      {
        title: 'Remember Me - SlimV Remix',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/Remember_Me_-_SlimV_Remix_g1xgkr.mp3',
        trackNumber: 14,
        featuredArtists: ['SlimV']
      },
      {
        title: 'Một Năm Mới Bình An',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/M%E1%BB%99t_N%C4%83m_M%E1%BB%9Bi_B%C3%ACnh_An_flycac.mp3',
        trackNumber: 15,
        featuredArtists: []
      },
      {
        title: 'Chúng Ta Không Thuộc Về Nhau',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/Ch%C3%BAng_Ta_Kh%C3%B4ng_Thu%E1%BB%99c_V%E1%BB%81_Nhau_z9tbg2.mp3',
        trackNumber: 16,
        featuredArtists: []
      },
      {
        title: 'Lạc Trôi',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/L%E1%BA%A1c_Tr%C3%B4i_drsopi.mp3',
        trackNumber: 17,
        featuredArtists: []
      },
      {
        title: 'Nơi Này Có Anh',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/N%C6%A1i_N%C3%A0y_C%C3%B3_Anh_frmpnq.mp3',
        trackNumber: 18,
        featuredArtists: []
      },
    ],
  },

  // Dương Domic - Dữ Liệu Quý EP (Long)
  {
    artistName: 'Dương Domic',
    title: 'Dữ Liệu Quý',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745731266/dulieuquy_kd0c8v.jpg',
    type: AlbumType.EP,
    labelName: 'DAO Entertainment',
    genreNames: ['V-Pop', 'Pop', 'R&B', 'Indie'],
    releaseDate: new Date('2023-12-01'),
    tracks: [
      {
        title: 'Chập Chờn',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745731353/Ch%E1%BA%ADp_Ch%E1%BB%9Dn_akpg6s.mp3',
        trackNumber: 1,
        featuredArtists: [],
        tempo: 90,
        mood: 'Dreamy',
        key: 'F',
        scale: 'minor',
        danceability: 0.65,
        energy: 0.55
      },
      {
        title: 'Tràn Bộ Nhớ',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745731355/Tr%C3%A0n_B%E1%BB%99_Nh%E1%BB%9B_ry2ikr.mp3',
        trackNumber: 2,
        featuredArtists: [],
        tempo: 105,
        mood: 'Overwhelmed',
        key: 'D',
        scale: 'minor',
        danceability: 0.72,
        energy: 0.65
      },
      {
        title: 'Pin Dự Phòng',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745731355/Pin_D%E1%BB%B1_Ph%C3%B2ng_w6wafm.mp3',
        trackNumber: 3,
        featuredArtists: [],
        tempo: 95,
        mood: 'Reflective',
        key: 'G',
        scale: 'major',
        danceability: 0.68,
        energy: 0.60
      },
      {
        title: 'Mất Kết Nối',
        audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745731355/M%E1%BA%A5t_K%E1%BA%BFt_N%E1%BB%91i_qcxd1j.mp3',
        trackNumber: 4,
        featuredArtists: [],
        tempo: 85,
        mood: 'Disconnected',
        key: 'C',
        scale: 'minor',
        danceability: 0.60,
        energy: 0.52
      },
    ],
  },


];

// Function to get album by title (useful for references)
export function getAlbumByTitle(title: string): AlbumData | undefined {
  return albums.find(album => album.title === title);
} 