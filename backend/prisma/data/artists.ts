import { Role } from '@prisma/client';

// Artist data structure
export interface ArtistData {
  user: {
    email: string;
    username: string;
    name: string;
  };
  profile: {
    artistName: string;
    bio: string;
    avatar: string;
    socialMediaLinks?: {
      facebook?: string;
      instagram?: string;
    };
  };
}

// Export the artist data
export const artists: ArtistData[] = [
  // Obito
  {
    user: {
      email: 'obito@soundwave.com',
      username: 'obito_artist',
      name: 'Obito',
    },
    profile: {
      artistName: 'Obito',
      bio: 'Obito là một nghệ sĩ hip hop Việt Nam nổi tiếng với phong cách âm nhạc lo-fi và lyric sâu sắc.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743859970/Obito_rmccxb.jpg',
      socialMediaLinks: {
        facebook: 'obitoz',
        instagram: 'obitoz',
      },
    },
  },
  
  // RPT MCK
  {
    user: {
      email: 'mck@soundwave.com',
      username: 'mck_artist',
      name: 'MCK',
    },
    profile: {
      artistName: 'RPT MCK',
      bio: 'RPT MCK (tên thật: Nghiêm Vũ Hoàng Long) là một rapper người Việt Nam, thành viên của Rapital và Gerdnang. Anh nổi tiếng khi tham gia King Of Rap và đạt được vị trí á quân.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860346/rpt_mck_fjkaou.jpg',
      socialMediaLinks: {
        facebook: 'MCK.rpt',
        instagram: 'mck.rpt',
      },
    },
  },
  
  // Lăng LD
  {
    user: {
      email: 'langld@soundwave.com',
      username: 'langld_artist',
      name: 'Lăng LD',
    },
    profile: {
      artistName: 'Lăng LD',
      bio: 'Lăng LD là một rapper Việt Nam, thành viên nhóm Rap nhạc GrimReaper Team.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860556/lang_ld_v0pbr0.jpg',
      socialMediaLinks: {
        facebook: 'langld.grt',
        instagram: 'langld.grt',
      },
    },
  },
  
  // VSTRA
  {
    user: {
      email: 'vstra@soundwave.com',
      username: 'vstra_artist',
      name: 'VSTRA',
    },
    profile: {
      artistName: 'VSTRA',
      bio: 'VSTRA là nghệ danh của rapper Việt Nam Nguyễn Hải Đăng, được biết đến với phong cách rap melodic.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860648/vstra_ff8nu2.webp',
      socialMediaLinks: {
        facebook: 'vstra.official',
        instagram: 'vstravistaa',
      },
    },
  },
  
  // AMEE
  {
    user: {
      email: 'amee@soundwave.com',
      username: 'amee_artist',
      name: 'AMEE',
    },
    profile: {
      artistName: 'AMEE',
      bio: 'AMEE (tên thật: Trần Huyền My) là ca sĩ người Việt Nam. Cô được biết đến nhiều hơn sau khi phát hành ca khúc "Anh Nhà Ở Đâu Thế" đạt hơn 100 triệu lượt xem trên YouTube.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860145/amee_bqf6zt.jpg',
      socialMediaLinks: {
        facebook: 'ameeofficial.vn',
        instagram: 'ameevn',
      },
    },
  },
  
  // Shiki
  {
    user: {
      email: 'shiki@soundwave.com',
      username: 'shiki_artist', 
      name: 'Shiki',
    },
    profile: {
      artistName: 'Shiki',
      bio: 'Shiki (tên thật: Huỳnh Nhật Hào) là một trong những gương mặt mới xứng đáng được tỏa sáng hơn.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439433/testAlbum/Shiki/L%E1%BA%B7ng/hkbmzyo4vngqrrdmb0az.webp',
      socialMediaLinks: {
        facebook: 'shiki.official',
        instagram: 'shiki.official',
      },
    },
  },
  
  // Vũ.
  {
    user: {
      email: 'vu@soundwave.com', 
      username: 'vu_artist',
      name: 'Vũ',
    },
    profile: {
      artistName: 'Vũ.',
      bio: 'Hoàng Thái Vũ, thường được biết đến với nghệ danh Vũ., là một ca sĩ, nhạc sĩ sáng tác ca khúc người Việt Nam.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743497776/testAlbum/V%C5%A9/ed4krbq1pbqzepsv6l7e.jpg',
      socialMediaLinks: {
        facebook: 'vumusic',
        instagram: 'vumusic.official',
      },
    },
  },
  
  // tlinh
  {
    user: {
      email: 'tlinh@soundwave.com',
      username: 'tlinh_artist',
      name: 'tlinh',
    },
    profile: {
      artistName: 'tlinh',
      bio: 'tlinh tên thật là Nguyễn Thảo Linh, là một nữ rapper, ca sĩ và nhạc sĩ người Việt Nam. Cô được biết đến sau khi tham gia chương trình Rap Việt mùa 1.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439252/testAlbum/tlinh%2C%20Low%20G/FLVR/yhujw5bifxyhncqddgiw.png',
      socialMediaLinks: {
        instagram: 'thaylinhhomnay',
        facebook: 'tlinh.official',
      },
    },
  },
  
  // Low G
  {
    user: {
      email: 'lowg@soundwave.com',
      username: 'lowg_artist',
      name: 'Low G',
    },
    profile: {
      artistName: 'Low G',
      bio: 'Low G là 1 rapper nổi tiếng Việt Nam. Anh có giọng rap đặc trưng cũng như khả năng rap mượt vượt trội so với nhiều rapper trẻ thế hệ mới.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439236/testAlbum/tlinh%2C%20Low%20G/FLVR/fwt1lfhfrzqq6dchl8nw.jpg',
      socialMediaLinks: {
        facebook: 'lowgthapsang',
        instagram: 'lowgthapsang',
      },
    },
  },
  
  // itsnk
  {
    user: {
      email: 'itsnk@soundwave.com',
      username: 'itsnk_artist',
      name: 'itsnk',
    },
    profile: {
      artistName: 'itsnk',
      bio: 'itsnk là một nghệ sĩ/producer âm nhạc trẻ tài năng.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743498099/testAlbum/itsnk/e1m4ffov0faqob52fhqp.avif',
      socialMediaLinks: {},
    },
  },
  
  // Wren Evans
  {
    user: {
      email: 'wrenevans@soundwave.com',
      username: 'wrenevans_artist',
      name: 'Wren Evans',
    },
    profile: {
      artistName: 'Wren Evans',
      bio: 'Wren Evans tên thật là Lê Phan, là một ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743497966/testAlbum/Wren%20Evans/eyaniumxu7fui8ygdvsl.jpg',
      socialMediaLinks: {
        instagram: 'wrenevansmusic',
        facebook: 'wrenevansmusic',
      },
    },
  },
  
  // Phan Đinh Tùng
  {
    user: {
      email: 'phandinhtung@soundwave.com',
      username: 'phandinhtung_artist', 
      name: 'Phan Đinh Tùng',
    },
    profile: {
      artistName: 'Phan Đinh Tùng',
      bio: 'Phan Đinh Tùng là một ca sĩ, nhạc sĩ nổi tiếng người Việt Nam, cựu thành viên nhóm nhạc MTV.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442756/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/tomj0zyas6grk3zft230.jpg',
      socialMediaLinks: {
        facebook: 'phandinhtung.singer',
      },
    },
  },

  // Trung Trần
  {
    user: {
      email: 'trungtran@soundwave.com', 
      username: 'trungtran_artist',
      name: 'Trung Trần',
    },
    profile: {
      artistName: 'Trung Trần',
      bio: '',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743867463/Trung_Tran_ys1ply.webp',
      socialMediaLinks: {},
    },
  },

  // Hoàng Tôn
  {
    user: {
      email: 'hoangton@soundwave.com', 
      username: 'hoangton_artist',
      name: 'Hoàng Tôn',
    },
    profile: {
      artistName: 'Hoàng Tôn',
      bio: 'Nguyễn Hoàng Tôn là một nam ca sĩ, nhạc sĩ và nhà sản xuất âm nhạc người Việt Nam.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743867515/Hoang_Ton_i6mzhx.jpg',
      socialMediaLinks: {
        facebook: 'hoangton.official',
        instagram: 'hoangton.official'
      },
    },
  },

  // HIEUTHUHAI
  {
    user: {
      email: 'hieuthuhai@soundwave.com',
      username: 'hieuthuhai_artist',
      name: 'HIEUTHUHAI',
    },
    profile: {
      artistName: 'HIEUTHUHAI',
      bio: 'HIEUTHUHAI tên thật Trần Minh Hiếu, là một rapper và ca sĩ người Việt Nam. Anh được biết đến rộng rãi qua chương trình King of Rap và Rap Việt mùa 2.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743867958/HIEUTHUHAI_bh8xzk.webp',
      socialMediaLinks: {
        facebook: 'hieuthuhai',
        instagram: 'hieuthuhai'
      },
    },
  },

  // Bray
  {
    user: {
      email: 'bray@soundwave.com', 
      username: 'bray_artist',
      name: 'Bray',
    },
    profile: {
      artistName: 'Bray',
      bio: 'B Ray tên thật là Trần Thiện Thanh Bảo, là một nam rapper người Mỹ gốc Việt.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743868367/Bray_rmfple.jpg',
      socialMediaLinks: {
        facebook: 'yunbray110',
        instagram: 'yunbray110'
      },
    },
  },

  // Tage
  {
    user: {
      email: 'tage@soundwave.com', 
      username: 'tage_artist',
      name: 'Tage',
    },
    profile: {
      artistName: 'Tage',
      bio: 'Tage tên thật là Vũ Tuấn Huy, là một rapper, ca sĩ, nhạc sĩ người Việt Nam.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743868350/Tage_pcmon9.webp',
      socialMediaLinks: {
        facebook: 'ta.gekun',
        instagram: 'ta.gekun'
      },
    },
  },

  // marzuz
  {
    user: {
      email: 'marzuz@soundwave.com', 
      username: 'marzuz_artist',
      name: 'marzuz',
    },
    profile: {
      artistName: 'marzuz',
      bio: 'marzuz tên thật là Trần My Anh, là một ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743868415/marzuz_cf4kcy.jpg',
      socialMediaLinks: {
        facebook: 'marzuzisntreal',
        instagram: 'marzuzisntreal'
      },
    },
  },
  {
    user: {
      email: 'shayda@soundwave.com',
      username: 'shayda_artist',
      name: 'Shayda',
    },
    profile: {
      artistName: 'Shayda',
      bio: 'Shayda là một nghệ sĩ với phong cách âm nhạc đặc trưng.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743870424/Shayda_n0vdby.webp',
      socialMediaLinks: {
        facebook: 'shaydaofficial',
        instagram: 'shaydaofficial'
      },
    },
  },
  {
    user: {
      email: 'soobin@soundwave.com',
      username: 'soobin_artist',
      name: 'SOOBIN',
    },
    profile: {
      artistName: 'SOOBIN',
      bio: 'SOOBIN là một ca sĩ, nhạc sĩ nổi tiếng người Việt Nam. Anh là thành viên nhóm SpaceSpeakers và đã phát hành nhiều ca khúc hit.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743874021/Soobin_eo3d2y.jpg',
      socialMediaLinks: {
        facebook: 'soobinhoangson',
        instagram: 'soobinhoangson'
      },
    },
  },
  {
    user: {
      email: 'andree@soundwave.com',
      username: 'andree_artist',
      name: 'Andree Right Hand',
    },
    profile: {
      artistName: 'Andree Right Hand',
      bio: 'Andree Right Hand là một nhà sản xuất âm nhạc và rapper người Việt Nam. Anh nổi tiếng với vai trò là thành viên của SpaceSpeakers và nhiều sản phẩm âm nhạc chất lượng.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743874323/andree_bpcik4.jpg',
      socialMediaLinks: {
        facebook: 'andreerighthand',
        instagram: 'andreerighthand'
      },
    },
  },
  {
    user: {
      email: 'krisv@soundwave.com',
      username: 'krisv_artist',
      name: 'Kris V',
    },
    profile: {
      artistName: 'Kris V',
      bio: 'Kris V là một nghệ sĩ trẻ trong làng nhạc Việt, với phong cách âm nhạc đặc trưng của mình.',
      avatar: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743874348/kris_v_nucwck.jpg',
      socialMediaLinks: {
        facebook: 'krisv.official',
        instagram: 'krisv.official'
      },
    },
  },
  {
    user: {
      email: 'seachains@soundwave.com',
      username: 'seachains_artist',
      name: 'Seachains',
    },
    profile: {
      artistName: 'Seachains',
      bio: 'Seachains là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.',
      avatar: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745439987/seachains_kmptms.jpg',
      socialMediaLinks: {
        facebook: 'seachains',
        instagram: 'seachains'
      },
    },
  },
  {
    user: {
      email: 'wokeup@soundwave.com',
      username: 'wokeup_artist',
      name: 'WOKEUP',
    },
    profile: {
      artistName: 'WOKEUP',
      bio: 'WOKEUP là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.',
      avatar: 'https://res.cloudinary.com/dbwhalglx/image/upload/v1745440097/wokeup_wnwnoy.jpg',
      socialMediaLinks: {
        facebook: 'wokeupmusic',
        instagram: 'wokeupmusic'
      },
    },
  },
];

// Function to get artist by name (useful for references)
export function getArtistByName(name: string): ArtistData | undefined {
  return artists.find(artist => artist.profile.artistName === name);
} 