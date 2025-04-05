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
  
  // Shiki (existing artist added here for completeness)
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
];

// Function to get artist by name (useful for references)
export function getArtistByName(name: string): ArtistData | undefined {
  return artists.find(artist => artist.profile.artistName === name);
} 