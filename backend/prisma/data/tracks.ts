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
}

// Export the singles data
export const singles: SingleTrackData[] = [
  // Vũ.'s Single
  {
    artistName: 'Vũ.',
    title: 'Vì Anh Đâu Có Biết',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442415/testAlbum/V%C5%A9/V%C3%AC%20Anh%20%C4%90%C3%A2u%20C%C3%B3%20Bi%E1%BA%BFt/frou2hv5xqhghbnlervy.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442420/testAlbum/V%C5%A9/V%C3%AC%20Anh%20%C4%90%C3%A2u%20C%C3%B3%20Bi%E1%BA%BFt/w6t3yuq960odthomqphq.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 100
  },
  {
    artistName: 'Vũ.',
    title: 'Lạ Lùng',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745439076/lalung_jspxir.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745439072/L%E1%BA%A1_L%C3%B9ng_amsc9e.mp3',
    genreNames: ['V-Pop', 'Indie'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 90
  },
  {
    artistName: 'Vũ.',
    title: 'Đông Kiếm Em',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745439348/dongkiemem_nstwin.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745439344/%C4%90%C3%B4ng_Ki%E1%BA%BFm_Em_vs63al.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 80
  },
  {
    artistName: 'Vũ.',
    title: 'Hẹn Hò',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745439262/henho_uejz5a.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745439258/H%E1%BB%87n_H%C3%B2_ihqk4b.mp3',
    genreNames: ['V-Pop', 'Ballad'],
    labelName: 'Warner Music Vietnam',
    featuredArtistNames: [],
    playCount: 70
  },
  
  // Wren Evans' Singles
  {
    artistName: 'Wren Evans',
    title: 'Từng Quen',
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
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442569/testAlbum/Wren%20Evans/%C4%90%E1%BB%83%20%C3%9D/dkziecvuunuibpmipxfs.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442576/testAlbum/Wren%20Evans/%C4%90%E1%BB%83%20%C3%9D/cdiz4wskknjr4hxtdpn6.mp3',
    genreNames: ['V-Pop', 'R&B'],
    labelName: 'SPACESPEAKERS LABEL',
    featuredArtistNames: [],
    playCount: 75
  },
  {
    artistName: 'Wren Evans',
    title: 'Thích Em Hơi Nhiều',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745433944/thichemhoinhieu_n1befr.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745433941/Th%C3%ADch_Em_H%C6%A1i_Nhi%E1%BB%81u_-_The_Goodboi_Flip_jhiypj.mp3',
    genreNames: ['V-Pop'],
    labelName: 'SPACESPEAKERS LABEL',
    featuredArtistNames: [],
    playCount: 70
  },
  {
    artistName: 'Wren Evans',
    title: 'Cứu Lấy Âm Nhạc',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745434174/cuulayamnhac_lic7qy.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745434167/C%E1%BB%A9u_L%E1%BA%A5y_%C3%82m_Nh%E1%BA%A1c_f0y2xf.mp3',
    genreNames: ['V-Pop', 'Hip-Hop'],
    labelName: 'SPACESPEAKERS LABEL',
    featuredArtistNames: ['itsnk'],
    playCount: 70
  },
  
  // Phan Đinh Tùng's Single
  {
    artistName: 'Phan Đinh Tùng',
    title: 'Khúc Hát Mừng Sinh Nhật',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442756/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/tomj0zyas6grk3zft230.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442668/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/qrm9ovig9ezxdpsysdwj.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'Đông Tây Promotion',
    featuredArtistNames: [],
    playCount: 90
  },
  
  // HIEUTHUHAI's Single
  {
    artistName: 'HIEUTHUHAI',
    title: 'Nước Mắt Cá Sấu',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743870605/NMCS_rq3wmm.webp',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870609/N%C6%B0%E1%BB%9Bc_M%E1%BA%AFt_C%C3%A1_S%E1%BA%A5u_ldpno8.mp3',
    genreNames: ['V-Pop', 'Hip-Hop', 'Rap'],
    labelName: 'M Music Records',
    featuredArtistNames: [],
    playCount: 63,
    releaseDate: new Date('2025-04-01')
  },

  // MONO - Ôm Em Thật Lâu
  {
    artistName: 'MONO',
    title: 'Ôm Em Thật Lâu',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436291/seed/artists/MONO/yt1xzctpsfy3hqr7sdmb.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1745436293/seed/artists/MONO/ckois6mvulxsu4anpabz.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'M Music Records',
    featuredArtistNames: [],
    playCount: 0,
    releaseDate: new Date('2025-04-03')
  },

  // MONO - Chăm Hoa
  {
    artistName: 'MONO',
    title: 'Chăm Hoa',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436544/seed/artists/MONO/vvlotcogfhiooiq3gctm.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1745436548/seed/artists/MONO/bqbgkmbuvxmwqywz93ki.mp3',
    genreNames: ['V-Pop', 'Pop'],
    labelName: 'M Music Records',
    featuredArtistNames: [],
    playCount: 0,
    releaseDate: new Date('2024-10-22')
  },

  // Đen - Dưới Hiên Nhà
  {
    artistName: 'Đen',
    title: 'Dưới Hiên Nhà',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437250/seed/artists/%C4%90en/iizch3ygybzl83q1zmfy.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1745437256/seed/artists/%C4%90en/uvojxryuxqsnyxe7apaw.mp3',
    genreNames: ['Hip-Hop', 'Rap'],
    labelName: 'Đen',
    featuredArtistNames: ['Emcee L (Da LAB)', 'JGKiD (Da LAB)'],
    playCount: 0,
    releaseDate: new Date('2016-08-06')
  },

  // Đen - Đi Theo Bóng Mặt Trời
  {
    artistName: 'Đen',
    title: 'Đi Theo Bóng Mặt Trời',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437393/seed/artists/%C4%90en/begfbwkugfedpwumd5et.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1745437395/seed/artists/%C4%90en/ujvytchqdd0zry8zbxdb.mp3',
    genreNames: ['Hip-Hop', 'Rap'],
    labelName: 'Đen',
    featuredArtistNames: ['Giang Nguyễn'],
    playCount: 0,
    releaseDate: new Date('2017-05-13')
  },

  // Đen - Ta Cứ Đi Cùng Nhau
  {
    artistName: 'Đen',
    title: 'Ta Cứ Đi Cùng Nhau',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437677/seed/artists/%C4%90en/dgk5twb5ki5vi0qq5ocl.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1745437684/seed/artists/%C4%90en/qaeai8knaylimfg9ytwe.mp3',
    genreNames: ['Hip-Hop', 'Rap', 'Pop'],
    labelName: 'Đen',
    featuredArtistNames: ['Linh Cáo'],
    playCount: 0,
    releaseDate: new Date('2017-09-11')
  },

  // Đen - Ngày Khác Lạ
  {
    artistName: 'Đen',
    title: 'Ngày Khác Lạ',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437804/seed/artists/%C4%90en/vdxgft0se7oxe6iilxqf.jpg',
    audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1745437809/seed/artists/%C4%90en/rl0h6dr5lbhnx8twsvnk.mp3',
    genreNames: ['Hip-Hop', 'Rap'],
    labelName: 'Đen',
    featuredArtistNames: ['Giang Phạm', 'Triple D'],
    playCount: 0,
    releaseDate: new Date('2018-02-23')
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
  },
  {
    artistName: 'Obito',
    title: 'Phong Long',
    coverUrl: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745440114/phonglong_dclnox.jpg',
    audioUrl: 'https://res.cloudinary.com/dbwhalglx/video/upload/v1745440211/Phong_Long_zt4pc3.mp3',
    genreNames: ['V-Pop', 'Rap'],
    labelName: 'Universal Music Vietnam',
    featuredArtistNames: ['Low G, WOKE UP'],
    playCount: 30,
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
  },
  
  
];

// Function to get single by title and artist (useful for references)
export function getSingleByTitleAndArtist(title: string, artistName: string): SingleTrackData | undefined {
  return singles.find(single => single.title === title && single.artistName === artistName);
} 