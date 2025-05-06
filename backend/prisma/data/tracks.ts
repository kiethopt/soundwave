import { AlbumType } from '@prisma/client';

// Track data structure for standalone singles
export interface SingleTrackData {
  artistName: string;
  title: string;
  coverUrl: string;
  audioUrl: string;
  genreNames: string[];
  labelName: string | null;
  featuredArtistNames: string[];
  playCount?: number;
  releaseDate?: Date;
  tempo?: number;
  mood?: string;
  key?: string;
  scale?: string;
  danceability?: number;
  energy?: number;
}

// Export the singles data
export const singles: SingleTrackData[] = [
  // Vũ.'s Single
  {
    artistName: 'Vũ.',
    title: 'Vì Anh Đâu Có Biết',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746280308/frou2hv5xqhghbnlervy_cbhi9q.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746280279/V%C3%AC_Anh_%C4%90%C3%A2u_C%C3%B3_Bi%E1%BA%BFt_zfawia.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 100,
    tempo: 117,
    mood: 'Energetic',
    key: 'Eb',
    scale: 'minor',
    danceability: 0.98,
    energy: 0.82
  },
  {
    artistName: 'Vũ.',
    title: 'Lạ Lùng',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746280313/lalung_jspxir_pthcam.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746280265/L%E1%BA%A1_L%C3%B9ng_jmt6ay.mp3',
    genreNames: ['V-Pop', 'Indie'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 90,
    tempo: 73,
    mood: 'Melancholic',
    key: 'C#',
    scale: 'major',
    danceability: 0.72,
    energy: 0.40
  },
  {
    artistName: 'Vũ.',
    title: 'Đông Kiếm Em',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746280306/dongkiemem_nstwin_tuqq71.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746280251/%C4%90%C3%B4ng_Ki%E1%BA%BFm_Em_knvcpg.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 80,
    tempo: 101,
    mood: 'Chill',
    key: 'E',
    scale: 'minor',
    danceability: 0.65,
    energy: 0.35
  },
  
  // Wren Evans' Singles
  {
    artistName: 'Wren Evans',
    title: 'Từng Quen',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746282419/tungquen_tjrtqe.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746281549/T%E1%BB%ABng_Quen_hyfhiq.mp3',
    genreNames: ['V-Pop', 'Hip-Hop'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: ['itsnk'],
    playCount: 80,
    tempo: 150,
    mood: 'Energetic',
    key: 'C',
    scale: 'major',
    danceability: 0.81,
    energy: 0.88
  },
  {
    artistName: 'Wren Evans',
    title: 'Để Ý',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746282404/dey_jognc1.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746282342/%C4%90%E1%BB%83_%C3%9D_qrwsbs.mp3',
    genreNames: ['V-Pop', 'R&B'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: [],
    playCount: 75,
    tempo: 95,
    mood: 'Smooth',
    key: 'F',
    scale: 'minor',
    danceability: 0.78,
    energy: 0.65
  },
  {
    artistName: 'Wren Evans',
    title: 'Thích Em Hơi Nhiều',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745433944/thichemhoinhieu_n1befr.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745433941/Th%C3%ADch_Em_H%C6%A1i_Nhi%E1%BB%81u_-_The_Goodboi_Flip_jhiypj.mp3',
    genreNames: ['V-Pop'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: [],
    playCount: 70,
    tempo: 110,
    mood: 'Romantic',
    key: 'G',
    scale: 'major',
    danceability: 0.76,
    energy: 0.68
  },
  {
    artistName: 'Wren Evans',
    title: 'Cứu Lấy Âm Nhạc',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745434174/cuulayamnhac_lic7qy.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745434167/C%E1%BB%A9u_L%E1%BA%A5y_%C3%82m_Nh%E1%BA%A1c_f0y2xf.mp3',
    genreNames: ['V-Pop', 'Hip-Hop'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: ['itsnk'],
    playCount: 70,
    tempo: 135,
    mood: 'Energetic',
    key: 'A',
    scale: 'minor',
    danceability: 0.85,
    energy: 0.80
  },
  
  // Phan Đinh Tùng's Single
  {
    artistName: 'Phan Đinh Tùng',
    title: 'Khúc Hát Mừng Sinh Nhật',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746284252/khuchatmungsinhnhat_kxetsa.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746284266/Kh%C3%BAc_H%C3%A1t_M%E1%BB%ABng_Sinh_Nh%E1%BA%ADt_wfpthb.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'Đông Tây Promotion',
    featuredArtistNames: [],
    playCount: 90,
    tempo: 120,
    mood: 'Happy',
    key: 'C',
    scale: 'major',
    danceability: 0.85,
    energy: 0.75
  },

  // MONO - Ôm Em Thật Lâu
  {
    artistName: 'MONO',
    title: 'Ôm Em Thật Lâu',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746284604/OmEmThatLau_itnwlk.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746284606/%C3%94m_Em_Th%E1%BA%ADt_L%C3%A2u_h02ka9.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'M Music Records',
    featuredArtistNames: [],
    playCount: 0,
    releaseDate: new Date('2025-04-03'),
    tempo: 98,
    mood: 'Romantic',
    key: 'D',
    scale: 'major',
    danceability: 0.70,
    energy: 0.65
  },

  // MONO - Chăm Hoa
  {
    artistName: 'MONO',
    title: 'Chăm Hoa',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746284998/ChamHoa_d3cygc.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746285002/Ch%C4%83m_Hoa_t6qo04.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'M Music Records',
    featuredArtistNames: [],
    playCount: 0,
    releaseDate: new Date('2024-10-22'),
    tempo: 105,
    mood: 'Upbeat',
    key: 'F',
    scale: 'major',
    danceability: 0.75,
    energy: 0.70
  },

  // Đen - Dưới Hiên Nhà
  {
    artistName: 'Đen',
    title: 'Dưới Hiên Nhà',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746285393/DuoiHienNha_ppt0cy.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746285398/D%C6%B0%E1%BB%9Bi_Hi%C3%AAn_Nh%C3%A0_dxqiwq.mp3',
    genreNames: ['Hip-Hop', 'Rap'],
    labelName: 'Đen',
    featuredArtistNames: ['Emcee L (Da LAB)', 'JGKiD (Da LAB)'],
    playCount: 0,
    releaseDate: new Date('2016-08-06'),
    tempo: 92,
    mood: 'Chill',
    key: 'G',
    scale: 'minor',
    danceability: 0.65,
    energy: 0.60
  },

  // Đen - Đi Theo Bóng Mặt Trời
  {
    artistName: 'Đen',
    title: 'Đi Theo Bóng Mặt Trời',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746287006/DiTheoBongMatTroi_flz7ba.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746287010/%C4%90i_Theo_B%C3%B3ng_M%E1%BA%B7t_Tr%E1%BB%9Di_vxabn1.mp3',
    genreNames: ['Hip-Hop', 'Rap'],
    labelName: 'Đen',
    featuredArtistNames: ['Giang Nguyễn'],
    playCount: 0,
    releaseDate: new Date('2017-05-13'),
    tempo: 95,
    mood: 'Reflective',
    key: 'Bb',
    scale: 'minor',
    danceability: 0.68,
    energy: 0.62
  },

  // Đen - Ta Cứ Đi Cùng Nhau
  {
    artistName: 'Đen',
    title: 'Ta Cứ Đi Cùng Nhau',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746287181/TaCuDiCungNhau_mr0xxr.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746287186/Ta_C%E1%BB%A9_%C4%90i_C%C3%B9ng_Nhau_xnn9yy.mp3',
    genreNames: ['Hip-Hop', 'Rap', 'Pop'],
    labelName: 'Đen',
    featuredArtistNames: ['Linh Cáo'],
    playCount: 0,
    releaseDate: new Date('2017-09-11'),
    tempo: 100,
    mood: 'Uplifting',
    key: 'A',
    scale: 'minor',
    danceability: 0.72,
    energy: 0.68
  },

  // Đen - Ngày Khác Lạ
  {
    artistName: 'Đen',
    title: 'Ngày Khác Lạ',
    coverUrl: 'https://res.cloudinary.com/dwln9t6dv/image/upload/v1746287578/NgayKhacLa_jjjnja.jpg',
    audioUrl: 'https://res.cloudinary.com/dwln9t6dv/video/upload/v1746287582/Ng%C3%A0y_Kh%C3%A1c_L%E1%BA%A1_ji7jt3.mp3',
    genreNames: ['Hip-Hop', 'Rap'],
    labelName: 'Đen',
    featuredArtistNames: ['Giang Phạm', 'Triple D'],
    playCount: 0,
    releaseDate: new Date('2018-02-23'),
    tempo: 87,
    mood: 'Inspirational',
    key: 'E',
    scale: 'minor',
    danceability: 0.70,
    energy: 0.75
  },

  {
    artistName: 'HIEUTHUHAI',
    title: 'TRÌNH',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745432929/TRINH_ap6p2g.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745432905/TR%C3%8CNH_iobw5p.mp3',
    genreNames: ['V-Pop', 'Hip-Hop', 'Rap'],
    labelName: 'M Music Records',
    featuredArtistNames: [],
    playCount: 45,
    tempo: 140,
    mood: 'Confident',
    key: 'D',
    scale: 'minor',
    danceability: 0.85,
    energy: 0.90
  },

  // SOOBIN's Single
  {
    artistName: 'SOOBIN',
    title: 'Vẫn Nhớ',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745431465/vannho_yh3ama.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745431285/V%E1%BA%ABn_Nh%E1%BB%9B_e8qiqi.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: [],
    playCount: 37,
    tempo: 75,
    mood: 'Melancholic',
    key: 'Eb',
    scale: 'minor',
    danceability: 0.45,
    energy: 0.38
  },

  {
    artistName: 'SOOBIN',
    title: 'Vài Lần Đón Đưa',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745431592/vailandondua_dgnhah.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745431587/Vai_Lan_Don_Dua_jiecy2.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: [],
    playCount: 15,
    tempo: 82,
    mood: 'Nostalgic',
    key: 'C',
    scale: 'major',
    danceability: 0.55,
    energy: 0.45
  },

  {
    artistName: 'SOOBIN',
    title: 'Say Goodbye',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745431779/saygoodbye_im75o4.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745431784/Say_Goodbye_rhpmv9.mp3',
    genreNames: ['V-Pop', 'Ballad', 'Acoustic'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: [],
    playCount: 25,
    tempo: 78,
    mood: 'Sad',
    key: 'F#',
    scale: 'minor',
    danceability: 0.48,
    energy: 0.40
  },

  {
    artistName: 'SOOBIN',
    title: 'Ngày Mai Em Đi',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745432092/ngaymaiemdi_s00edy.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745432073/Ng%C3%A0y_Mai_Em_%C4%90i_z2ll3z.mp3',
    genreNames: ['V-Pop', 'Acoustic'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: ['Lê Hiếu'],
    playCount: 16,
    tempo: 85,
    mood: 'Gentle',
    key: 'G',
    scale: 'major',
    danceability: 0.58,
    energy: 0.52
  },

  // Son Tung M-TP's Single
  {
    artistName: 'Sơn Tùng M-TP',
    title: 'Chạy Ngay Đi',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745435171/chayngaydi_q2tbv1.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745435167/Ch%E1%BA%A1y_Ngay_%C4%90i_av6kxz.mp3',
    genreNames: ['V-Pop', 'Hip-Hop'],
    labelName: 'M-TP Entertainment',
    featuredArtistNames: [],
    playCount: 100,
    tempo: 128,
    mood: 'Intense',
    key: 'F',
    scale: 'minor',
    danceability: 0.92,
    energy: 0.88
  },

  {
    artistName: 'Sơn Tùng M-TP',
    title: 'Making My Way',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745435260/makingmyway_j07fyn.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745435297/MAKING_MY_WAY_s7hrju.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'M-TP Entertainment',
    featuredArtistNames: [],
    playCount: 80,
    tempo: 125,
    mood: 'Upbeat',
    key: 'A',
    scale: 'major',
    danceability: 0.88,
    energy: 0.85
  },

  {
    artistName: 'Sơn Tùng M-TP',
    title: 'Hãy Trao Cho Anh',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745435426/haytraochoanh_fcmixd.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745435429/H%C3%A3y_Trao_Cho_Anh_q8cm6x.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'M-TP Entertainment',
    featuredArtistNames: [],
    playCount: 90,
    tempo: 118,
    mood: 'Vibrant',
    key: 'D',
    scale: 'major',
    danceability: 0.90,
    energy: 0.80
  },

  // tlinh's Single
  {
    artistName: 'tlinh',
    title: 'Vài Câu Nói Có Khiến Người Thay Đổi',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745438765/vaicaunoicokhiennguoithaydoi_mlo7k0.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745438771/vaicaunoicokhiennguoithaydoi_aqkrcc.mp3',
    genreNames: ['V-Pop'],
    labelName: 'M Music Records',
    featuredArtistNames: ['GREY D'],
    playCount: 50,
    tempo: 95,
    mood: 'Emotional',
    key: 'Ab',
    scale: 'major',
    danceability: 0.65,
    energy: 0.60
  },
  {
    artistName: 'tlinh',
    title: 'Vứt Zác',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745438553/vutzac_d0drbh.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745438570/V%E1%BB%A9t_Z%C3%A1c_rzwagg.mp3',
    genreNames: ['V-Pop', 'Rap', 'Hip-Hop'],
    labelName: 'M Music Records',
    featuredArtistNames: ['Low G'],
    playCount: 40,
    tempo: 132,
    mood: 'Bold',
    key: 'C',
    scale: 'minor',
    danceability: 0.83,
    energy: 0.85
  },

  // Obito's Single
  {
    artistName: 'Obito',
    title: 'Simple Love',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745439839/simplelove_hm8scr.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745439837/Simple_Love_eznpfm.mp3',
    genreNames: ['V-Pop', 'Hip-Hop'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: ['Seachains'],
    playCount: 40,
    tempo: 110,
    mood: 'Dreamy',
    key: 'B',
    scale: 'major',
    danceability: 0.75,
    energy: 0.65
  },
  {
    artistName: 'Obito',
    title: 'Phong Long',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745440114/phonglong_dclnox.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745440211/Phong_Long_zt4pc3.mp3',
    genreNames: ['V-Pop', 'Rap'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: ['Low G', 'WOKEUP'],
    playCount: 30,
    tempo: 125,
    mood: 'Energetic',
    key: 'G',
    scale: 'minor',
    danceability: 0.82,
    energy: 0.78
  },
  {
    artistName: 'Obito',
    title: 'When You Look at Me',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745440519/whenyoulookatme_az7yye.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745440528/When_You_Look_at_Me_feat._Seachains_hw4whz.mp3',
    genreNames: ['V-Pop', 'Rap'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: ['Seachains'],
    playCount: 20,
    tempo: 105,
    mood: 'Chill',
    key: 'D',
    scale: 'minor',
    danceability: 0.72,
    energy: 0.60
  },

  // Dương Domic's Single
  {
    artistName: 'Dương Domic',
    title: 'Là Em, Chính Em',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745731659/laemlachinhem_wzepft.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745731671/L%C3%A0_Em_Ch%C3%ADnh_Em_ki38w0.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'DAO Entertainment',
    featuredArtistNames: [],
    playCount: 25,
    tempo: 80,
    mood: 'Romantic',
    key: 'Bb',
    scale: 'major',
    danceability: 0.60,
    energy: 0.55
  },
  {
    artistName: 'Dương Domic',
    title: 'Yêu Em 2 Ngày',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745731856/yeuem2ngay_mwvqxx.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745731859/Y%C3%AAu_Em_2_Ng%C3%A0y_tgdmi8.mp3',
    genreNames: ['V-Pop', 'Ballad', 'R&B'],
    labelName: 'DAO Entertainment',
    featuredArtistNames: [],
    playCount: 25,
    tempo: 90,
    mood: 'Sensual',
    key: 'F',
    scale: 'minor',
    danceability: 0.68,
    energy: 0.58
  },
  
  
];

// Function to get single by title and artist (useful for references)
export function getSingleByTitleAndArtist(title: string, artistName: string): SingleTrackData | undefined {
  return singles.find(single => single.title === title && single.artistName === artistName);
} 