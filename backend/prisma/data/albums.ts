import { AlbumType } from '@prisma/client';

// Track data structure for use within albums
export interface TrackData {
  title: string;
  audioUrl: string;
  trackNumber: number;
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
    releaseDate: new Date('2024-10-10'),
    tracks: [
      {
        title: 'Intro',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859179/Intro_hdgyvj.mp3',
        trackNumber: 1,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Xuất Phát Điểm',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859201/Xu%E1%BA%A5t_Ph%C3%A1t_%C4%90i%E1%BB%83m_hix0i2.mp3',
        trackNumber: 2,
        featuredArtists: ['Shiki']
      },
      {
        title: 'CL5 (interlude)',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859173/CL5_interlude_weh1oq.mp3',
        trackNumber: 3,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Đầu Đường Xó Chợ',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859196/%C4%90%E1%BA%A7u_%C4%90%C6%B0%E1%BB%9Dng_X%C3%B3_Ch%E1%BB%A3_oc3l9v.mp3',
        trackNumber: 4,
        featuredArtists: ['Shiki', 'Lăng LD']
      },
      {
        title: 'Biên Giới Long Bình',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859189/Bi%C3%AAn_Gi%E1%BB%9Bi_Long_B%C3%ACnh_auvhuj.mp3',
        trackNumber: 5,
        featuredArtists: ['Shiki']
      },
      {
        title: '16',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859189/Bi%C3%AAn_Gi%E1%BB%9Bi_Long_B%C3%ACnh_auvhuj.mp3',
        trackNumber: 6,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Sài Gòn Ơi',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859190/S%C3%A0i_G%C3%B2n_%C6%A1i_nfhauv.mp3',
        trackNumber: 7,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Trốn chạy',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859199/Tr%E1%BB%91n_Ch%E1%BA%A1y_tzewqe.mp3',
        trackNumber: 8,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Cất cánh',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859178/C%E1%BA%A5t_c%C3%A1nh_interlude_gkahis.mp3',
        trackNumber: 9,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Hà Nội',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859182/H%C3%A0_N%E1%BB%99i_kwfdua.mp3',
        trackNumber: 10,
        featuredArtists: ['Shiki', 'VSTRA']
      },
      {
        title: 'Vô Điều Kiện',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859182/H%C3%A0_N%E1%BB%99i_kwfdua.mp3',
        trackNumber: 11,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Đánh Đổi',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859197/%C4%90%C3%A1nh_%C4%90%E1%BB%95i_r3panr.mp3',
        trackNumber: 12,
        featuredArtists: ['Shiki', 'RPT MCK']
      },
      {
        title: 'Backstage Freestyle',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859175/Backstage_Freestyle_gnpfyw.mp3',
        trackNumber: 13,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Tell the kids i love them',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859192/Tell_the_kids_i_love_them_pwqmbw.mp3',
        trackNumber: 14,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Ước mơ của Mẹ (interlude)',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859202/%C6%AF%E1%BB%9Bc_m%C6%A1_c%E1%BB%A7a_M%E1%BA%B9_interlude_tyntaq.mp3',
        trackNumber: 15,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Con kể Ba nghe',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859181/Con_k%E1%BB%83_Ba_nghe_scl0nl.mp3',
        trackNumber: 16,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Champion',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859186/Champion_czjzsv.mp3',
        trackNumber: 17,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Chưa Xong',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859178/Ch%C6%B0a_Xong_xx7qeu.mp3',
        trackNumber: 18,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Tự Sự',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859190/T%E1%BB%B1_S%E1%BB%B1_ydp8j3.mp3',
        trackNumber: 19,
        featuredArtists: ['Shiki']
      },
      {
        title: 'Outro',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743859177/Outro_rownnb.mp3',
        trackNumber: 20,
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
    releaseDate: new Date('2024-08-02'),
    tracks: [
      {
        title: 'MỘNG YU',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860161/M%E1%BB%98NG_YU_lt0z7a.mp3',
        trackNumber: 1,
        featuredArtists: ['RPT MCK']
      },
      {
        title: 'Cuộc gọi lúc nửa đêm',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860154/Cu%E1%BB%99c_g%E1%BB%8Di_l%C3%BAc_n%E1%BB%ADa_%C4%91%C3%AAm_cr875y.mp3',
        trackNumber: 2,
      },
      {
        title: 'Beautiful nightmare (interlude)',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860150/Beautiful_nightmare_interlude_v31pfv.mp3',
        trackNumber: 3,
      },
      {
        title: 'Miền Mộng Mị',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860154/Mi%E1%BB%81n_M%E1%BB%99ng_M%E1%BB%8B_zuoo0s.mp3',
        trackNumber: 4,
      },
      {
        title: '2000 câu hỏi vì sao',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743860151/2000_c%C3%A2u_h%E1%BB%8Fi_v%C3%AC_sao_vy4g9r.mp3',
        trackNumber: 5,
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
    releaseDate: new Date('2024-09-27'),
    tracks: [
      {
        title: 'Nếu Những Tiếc Nuối',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434824/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/dfiktyddtxdxvfgj4dyg.mp3',
        trackNumber: 1,
      },
      {
        title: 'Mùa Mưa Ấy',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434777/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/qtkjlfyq2qxj6yr0enn3.mp3',
        trackNumber: 2,
      },
      {
        title: 'Ngồi Chờ Trong Vấn Vương',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434754/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/axxycictkwiapoqlbgwv.mp3',
        trackNumber: 3,
      },
      {
        title: 'Dành Hết Xuân Thì Để Chờ Nhau',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434845/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/rnqmok8sosnkawwdxz0d.mp3',
        trackNumber: 4, 
      },
      {
        title: 'Và Em Sẽ Luôn Là Người Tôi Yêu Nhất',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434797/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/zy6xfmqzhjwirntwaaae.mp3',
        trackNumber: 5,
      },
      {
        title: 'Những Chuyến Bay',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434861/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/lonb3cmtqmeugwzfcwtn.mp3',
        trackNumber: 6,
      },
      {
        title: 'Mây Khóc Vì Điều Gì',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434787/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/oqqbltgfg82lhtqqhz9o.mp3',
        trackNumber: 7,
      },
      {
        title: 'Những Lời Hứa Bỏ Quên',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434756/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/auuktbf2dboi0i1kjlzl.mp3',
        trackNumber: 8,
      },
      {
        title: 'Không Yêu Em Thì Yêu Ai',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434791/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/glvb7rydfc9xmsoehnwq.mp3',
        trackNumber: 9,
      },
      {
        title: 'bình yên',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434776/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/myyqqjyhofy8pzetplpc.mp3',
        trackNumber: 10,
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
    releaseDate: new Date('2024-06-27'),
    tracks: [
      {
        title: '1000 Ánh Mắt',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436373/testAlbum/Shiki/L%E1%BA%B7ng/rigndjyu6sha8qudao4d.mp3',
        trackNumber: 1,
      },
      {
        title: 'Anh Vẫn Đợi',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436465/testAlbum/Shiki/L%E1%BA%B7ng/i6hmq7l3hdqvbxu5e28r.mp3',
        trackNumber: 2,
      },
      {
        title: 'Có Đôi Điều',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436588/testAlbum/Shiki/L%E1%BA%B7ng/qxklb5cw51whc4isrc0q.mp3',
        trackNumber: 3,
      },
      {
        title: 'Lặng',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436725/testAlbum/Shiki/L%E1%BA%B7ng/sgvcaztihnxys4q8jiwf.mp3',
        trackNumber: 4,
      },
      {
        title: 'Night Time',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436782/testAlbum/Shiki/L%E1%BA%B7ng/zqwu8zxop4btjefhmegl.mp3',
        trackNumber: 5,
      },
      {
        title: 'Perfect',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436825/testAlbum/Shiki/L%E1%BA%B7ng/odtql92weapv0vu7cwch.mp3',
        trackNumber: 6,
      }, 
      {
        title: 'Take Off Your Hands',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436987/testAlbum/Shiki/L%E1%BA%B7ng/wxsbjznbjgpkgbma1rhr.mp3',
        trackNumber: 7,
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
    featuredArtistNames: ['tlinh'], // tlinh is the featured artist for the whole EP
    tracks: [
      {
        title: 'DÂU TẰM',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437229/testAlbum/tlinh%2C%20Low%20G/FLVR/bgsotddidlfj6zrzbtyn.mp3',
        trackNumber: 1,
      },
      {
        title: 'NGÂN',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437334/testAlbum/tlinh%2C%20Low%20G/FLVR/ntlvaidfotjbmw9rxg3z.mp3',
        trackNumber: 2,
      },
      {
        title: 'HOP ON DA SHOW',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437358/testAlbum/tlinh%2C%20Low%20G/FLVR/pgdrfb8oux5ub958hrvf.mp3',
        trackNumber: 3,
      },
      {
        title: 'PHÓNG ZÌN ZÌN',
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437384/testAlbum/tlinh%2C%20Low%20G/FLVR/vqv3bigkrhgob2diijnu.mp3',
        trackNumber: 4,
      },
    ],
  },

  // RPT MCK - "99%" album
  {
    artistName: 'RPT MCK',
    title: '99%',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743867252/99_ksdjsu.jpg',
    type: AlbumType.ALBUM,
    labelName: 'CDSL',
    genreNames: ['V-Pop', 'Hip-Hop', 'Rap', 'R&B'], // Added R&B
    releaseDate: new Date('2023-03-02'),
    tracks: [
      { title: '00', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867253/00_tkouxp.mp3', trackNumber: 1 },
      { title: 'Chìm Sâu', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867262/Ch%C3%ACm_S%C3%A2u_i3wowi.mp3', trackNumber: 2, featuredArtists: ['Trung Trần'] },
      { title: 'Suit & Tie', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867269/Suit_Tie_skzbdx.mp3', trackNumber: 3, featuredArtists: ['Hoàng Tôn'] },
      { title: 'Va Vào Giai Điệu Này', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867270/Va_V%C3%A0o_Giai_%C4%90i%E1%BB%87u_N%C3%A0y_utosff.mp3', trackNumber: 4 },
      { title: 'Tối Nay Ta Đi Đâu Nhờ', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867256/T%E1%BB%91i_Nay_Ta_%C4%90i_%C4%90%C3%A2u_Nh%E1%BB%9D_ebdut1.mp3', trackNumber: 5 },
      { title: 'Chỉ Một Đêm Nữa Thôi', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867263/Ch%E1%BB%89_M%E1%BB%99t_%C4%90%C3%AAm_N%E1%BB%AFa_Th%C3%B4i_nusxzj.mp3', trackNumber: 6, featuredArtists: ['tlinh'] },
      { title: 'Thôi Em Đừng Đi', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867272/Th%C3%B4i_Em_%C4%90%E1%BB%ABng_%C4%90i_ohaw0f.mp3', trackNumber: 7, featuredArtists: ['Trung Trần'] },
      { title: '5050', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867254/5050_ozzoga.mp3', trackNumber: 8 },
      { title: 'Cuốn Cho Anh Một Điếu Nữa Đi', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867268/Cu%E1%BB%91n_Cho_Anh_M%E1%BB%99t_%C4%90i%E1%BA%BFu_N%E1%BB%AFa_%C4%90i_rkb07p.mp3', trackNumber: 9 },
      { title: 'Show Me Love', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867267/Show_Me_Love_zyjlvf.mp3', trackNumber: 10 },
      { title: 'Tại Vì Sao', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867269/T%E1%BA%A1i_V%C3%AC_Sao_efz5to.mp3', trackNumber: 11 },
      { title: 'Thờ Er', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867257/Th%E1%BB%9D_Er_bpag2y.mp3', trackNumber: 12 },
      { title: 'Ai Mới Là Kẻ Xấu Xa', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867261/Ai_M%E1%BB%9Bi_L%C3%A0_K%E1%BA%BB_X%E1%BA%A5u_Xa_tousdd.mp3', trackNumber: 13 },
      { title: 'Anh Đã Ổn Hơn', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867259/Anh_%C4%90%C3%A3_%E1%BB%94n_H%C6%A1n_jelhzq.mp3', trackNumber: 14 },
      { title: 'Badtrip', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867260/Badtrip_wodiv2.mp3', trackNumber: 15 },
      { title: '99', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743867259/99_w6sy6e.mp3', trackNumber: 16 }
    ]
  },

  // HIEUTHUHAI - "Ai Cũng Phải Bắt Đầu Từ Đâu Đó" album
  {
    artistName: 'HIEUTHUHAI',
    title: 'Ai Cũng Phải Bắt Đầu Từ Đâu Đó',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743868105/ACPBDTDD_ix1qeb.webp',
    type: AlbumType.ALBUM,
    labelName: 'M Music Records',
    genreNames: ['V-Pop', 'Hip-Hop', 'Rap'],
    releaseDate: new Date('2023-10-16'),
    tracks: [
      { title: 'Ai Cũng Phải Bắt Đầu Từ Đâu Đó', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868107/Ai_C%C5%A9ng_Ph%E1%BA%A3i_B%E1%BA%AFt_%C4%90%E1%BA%A7u_T%E1%BB%AB_%C4%90%C3%A2u_%C4%90%C3%B3_hrkbft.mp3', trackNumber: 1 },
      { title: 'Giờ Thì Ai Cười', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868125/Gi%E1%BB%9D_Th%C3%AC_Ai_C%C6%B0%E1%BB%9Di_osmint.mp3', trackNumber: 2 },
      { title: 'Không Phải Gu', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868117/Kh%C3%B4ng_Ph%E1%BA%A3i_Gu_dapmsw.mp3', trackNumber: 3, featuredArtists: ['Bray', 'Tage'] },
      { title: 'Siêu Sao', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868182/Si%C3%AAu_Sao_udmirx.mp3', trackNumber: 4 },
      { title: 'Đi Họp Lớp', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868183/%C4%90i_H%E1%BB%8Dp_L%E1%BB%9Bp_ma7izb.mp3', trackNumber: 5 },
      { title: 'Không Thể Say', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868183/Kh%C3%B4ng_Th%E1%BB%83_Say_rby9p0.mp3', trackNumber: 6 },
      { title: 'Exit Sign', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868118/Exit_Sign_s0mayg.mp3', trackNumber: 7, featuredArtists: ['marzuz'] },
      { title: 'Visa Interlude', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868179/Visa_Interlude_pzbphx.mp3', trackNumber: 8 },
      { title: 'Sắp Nổi Tiếng', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868185/S%E1%BA%AFp_N%E1%BB%95i_Ti%E1%BA%BFng_doshig.mp3', trackNumber: 9 },
      { title: 'KPI', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868189/KPI_d1ppwf.mp3', trackNumber: 10 },
      { title: 'Everything Will Be Okay', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868122/Everything_Will_Be_Okay_w2e95y.mp3', trackNumber: 11 },
      { title: 'Cho Em An Toàn', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868125/Cho_Em_An_To%C3%A0n_spfd7l.mp3', trackNumber: 12 },
      { title: 'NOLOVENOLIFE', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743868186/NOLOVENOLIFE_ce4hqh.mp3', trackNumber: 13 }
    ]
  },
  
  // Shayda - "FOUR" album
  {
    artistName: 'Shayda',
    title: 'FOUR',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743870790/FOUR_tn54uj.webp',
    type: AlbumType.ALBUM,
    labelName: 'QP hype',
    genreNames: ['Pop', 'R&B'],
    releaseDate: new Date('2025-02-28'),
    tracks: [
      { title: 'Get Closer', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870808/Get_Closer_lwokor.mp3', trackNumber: 1 },
      { title: 'Deep', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870801/Deep_ph5ixw.mp3', trackNumber: 2 },
      { title: 'Fight', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870813/Fight_zkw7kt.mp3', trackNumber: 3 },
      { title: 'Myself', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870828/Myself_zvrbxh.mp3', trackNumber: 4 },
      { title: 'Heaven-Sent', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870816/Heaven-Sent_ldz9mh.mp3', trackNumber: 5 },
      { title: 'BADAK', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870794/BADAK_q7bnli.mp3', trackNumber: 6 },
      { title: 'Fuck Off', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870807/Fuck_Off_ph5nf7.mp3', trackNumber: 7 },
      { title: 'Kill Me', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870824/Kill_Me_kqjk3m.mp3', trackNumber: 8 },
      { title: 'Her', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870813/Her_cbenhi.mp3', trackNumber: 9 },
      { title: 'How Come ?', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870816/How_Come_so91mf.mp3', trackNumber: 10 },
      { title: 'Change', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870799/Change_w2ase4.mp3', trackNumber: 11 },
      { title: 'Face Out', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870804/Face_Out_e3v6ln.mp3', trackNumber: 12 },
      { title: 'Love Yaaa', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870828/Love_Yaaa_ntxuwl.mp3', trackNumber: 13 },
      { title: 'Tease My Lover', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870832/Tease_My_Lover_vbvipn.mp3', trackNumber: 14 },
      { title: 'Grateful To Us', audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743870814/Grateful_To_Us_cpsmqd.mp3', trackNumber: 15 }
    ]
  },
  
  // Wren Evans - "LOI CHOI: The Neo Pop Punk" album
  {
    artistName: 'Wren Evans',
    title: 'LOI CHOI: The Neo Pop Punk',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743872377/LOICHOI_wrwlwq.webp',
    type: AlbumType.ALBUM,
    labelName: 'Universal Music Vietnam',
    genreNames: ['V-Pop', 'Pop Punk', 'Alternative'],
    releaseDate: new Date('2023-09-17'),
    featuredArtistNames: ['itsnk'],
    tracks: [
      { 
        title: 'Phóng Đổ Tim Em', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872416/Ph%C3%B3ng_%C4%90%E1%BB%95_Tim_Em_enbeuv.mp3', 
        trackNumber: 1, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Call Me', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872406/Call_Me_fn8xg0.mp3', 
        trackNumber: 2, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Cầu Vĩnh Tuy', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872405/C%E1%BA%A7u_V%C4%A9nh_Tuy_tjntvv.mp3', 
        trackNumber: 3, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Từng Quen', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872419/T%E1%BB%ABng_Quen_mcdfti.mp3', 
        trackNumber: 4, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'bé ơi từ từ', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872384/b%C3%A9_%C6%A1i_t%E1%BB%AB_t%E1%BB%AB_bk3l7i.mp3', 
        trackNumber: 5, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Lối Chơi (Interlude)', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872407/L%E1%BB%91i_Ch%C6%A1i_Interlude_pfu0el.mp3', 
        trackNumber: 6, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Tình Yêu Vĩ Mô', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872414/T%C3%ACnh_Y%C3%AAu_V%C4%A9_M%C3%B4_wmilrq.mp3', 
        trackNumber: 7, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Việt Kiều', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872421/Vi%E1%BB%87t_Ki%E1%BB%81u_wylzla.mp3', 
        trackNumber: 8, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'ĐĐĐ', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872515/%C4%90%C4%90%C4%90_pwht3k.mp3', 
        trackNumber: 9, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Quyền Anh', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872417/Quy%E1%BB%81n_Anh_yiuyps.mp3', 
        trackNumber: 10, 
        featuredArtists: ['itsnk']
      },
      { 
        title: 'Tò Te Tí', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743872417/T%C3%B2_Te_T%C3%AD_e5b5hh.mp3', 
        trackNumber: 11, 
        featuredArtists: ['itsnk']
      }
    ]
  },
  
  // SOOBIN - "BẬT NÓ LÊN" album
  {
    artistName: 'SOOBIN',
    title: 'BẬT NÓ LÊN',
    coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743874100/BatNoLen_rr1ieu.jpg',
    type: AlbumType.ALBUM,
    labelName: 'SPACESPEAKERS LABEL',
    genreNames: ['V-Pop', 'R&B', 'Pop'],
    releaseDate: new Date('2024-06-25'),
    tracks: [
      { 
        title: 'Intro', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874020/Intro_ng8hyh.mp3', 
        trackNumber: 1
      },
      { 
        title: 'DANCING IN THE DARK', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874032/DANCING_IN_THE_DARK_ptrvh2.mp3', 
        trackNumber: 2
      },
      { 
        title: 'Sunset In the City - Deluxe Version', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874062/Sunset_In_The_City_-_Deluxe_Version_x15hsl.mp3', 
        trackNumber: 3
      },
      { 
        title: 'Sẽ Quên Em Nhanh Thôi', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874080/S%E1%BA%BD_Qu%C3%AAn_Em_Nhanh_Th%C3%B4i_sgjlb0.mp3', 
        trackNumber: 4
      },
      { 
        title: 'giá như', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874041/gi%C3%A1_nh%C6%B0_tpgmo0.mp3', 
        trackNumber: 5
      },
      { 
        title: 'Ai Mà Biết Được', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874042/Ai_M%C3%A0_Bi%E1%BA%BFt_%C4%90%C6%B0%E1%BB%A3c_feat._tlinh_ttmgrh.mp3', 
        trackNumber: 6, 
        featuredArtists: ['tlinh']
      },
      { 
        title: 'Bật Nó Lên', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874030/B%E1%BA%ADt_N%C3%B3_L%C3%AAn_bd3gsl.mp3', 
        trackNumber: 7
      },
      { 
        title: 'Heyyy', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874037/Heyyy_t05ngf.mp3', 
        trackNumber: 8
      },
      { 
        title: 'Luật Anh', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874048/Lu%E1%BA%ADt_Anh_feat._Andree_Right_Hand_htg5cn.mp3', 
        trackNumber: 9, 
        featuredArtists: ['Andree Right Hand']
      },
      { 
        title: 'Lu Mờ', 
        audioUrl: 'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743874039/Lu_M%E1%BB%9D_feat._Kris_V_rpsefx.mp3', 
        trackNumber: 10, 
        featuredArtists: ['Kris V']
      }
    ]
  },
];

// Function to get album by title (useful for references)
export function getAlbumByTitle(title: string): AlbumData | undefined {
  return albums.find(album => album.title === title);
} 