import { PrismaClient, Role, AlbumType } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Helper function to get genre IDs
async function getGenreIds(genreNames: string[]) {
  const genres = await prisma.genre.findMany({
    where: { name: { in: genreNames } },
    select: { id: true },
  });
  return genres.map((g) => g.id);
}

// Helper function to get label ID
async function getLabelId(labelName: string | null): Promise<string | null> {
  if (!labelName) return null;
  const label = await prisma.label.findUnique({
    where: { name: labelName },
    select: { id: true },
  });
  return label?.id ?? null;
}

// Helper function to convert MM:SS or M:SS string to seconds
function durationToSeconds(durationStr: string): number {
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    const minutes = parts[0];
    const seconds = parts[1];
    if (!isNaN(minutes) && !isNaN(seconds)) {
      return minutes * 60 + seconds;
    }
  }
  console.warn(`⚠️ Invalid duration format: ${durationStr}. Returning 0.`);
  return 0; // Default or throw error if strict parsing is needed
}

async function main() {
  try {
    console.log('🔄 Starting basic database seeding...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    const now = new Date();

    // === 1. Seed Genres ===
    console.log('🔄 Seeding genres...');
    const genreNames = [
      'Pop',
      'Rock',
      'Hip-Hop',
      'R&B',
      'Electronic',
      'Jazz',
      'Classical',
      'Country',
      'Folk',
      'Soul',
      'Blues',
      'Indie',
      'Alternative',
      'Latin',
      'K-Pop',
      'V-Pop',
      'Rap',
      'Lo-fi',
      'Dance',
      'EDM',
      'Reggae',
      'Metal',
      'Punk',
      'Ambient',
      'House',
      'Techno',
      'Acoustic',
      'Ballad',
      'Funk',
      'New Wave',
      'Disco',
      'Trap',
      'Gospel',
      'Opera',
      'Orchestral',
      'Singer-Songwriter',
      'Experimental',
      'Instrumental',
      'World',
      'Bolero',
    ];
    await prisma.genre.createMany({
      data: genreNames.map((name) => ({ name })),
      skipDuplicates: true,
    });
    console.log('✅ Genres seeded successfully.');

    // === 2. Seed Labels ===
    console.log('🔄 Seeding labels...');
    const labelData = [
      {
        name: 'Universal Music Vietnam',
        description: 'Chi nhánh của Universal Music Group tại Việt Nam...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431554/labels/wzr1ktvlhz4iwosvumuo.svg',
      },
      {
        name: 'Warner Music Vietnam',
        description: 'Chi nhánh của Warner Music Group tại Việt Nam...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431554/labels/odz4yauhezy6jm9nwtq7.webp',
      },
      {
        name: 'Sony Music Vietnam',
        description: 'Chi nhánh của Sony Music Entertainment tại Việt Nam...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431553/labels/pu9on85wfnit81ctjl9m.png',
      },
      {
        name: 'SPACESPEAKERS LABEL',
        description: 'Hãng thu âm độc lập do nhóm SpaceSpeakers thành lập...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431554/labels/c0ihhauygdstdf4l2ihx.png',
      },
      {
        name: 'CIRCLE R',
        description: 'Công ty giải trí và hãng thu âm...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431553/labels/dkkhscf8gfzcgtwdzubo.jpg',
      },
      {
        name: 'M Music Records',
        description: 'Hãng thu âm trực thuộc M-TP Entertainment...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431553/labels/ypucskftannu0cckxf94.svg',
      },
      {
        name: 'CDSL',
        description: 'CDSL là một tập thể nghệ sĩ trẻ...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431552/labels/z6lrmzvmgocit7epvchy.png',
      },
      {
        name: 'Yin Yang Media',
        description: 'Đơn vị đồng hành và hỗ trợ cho các nghệ sĩ Việt Nam...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431554/labels/cxcdu3iidtfm752w2hte.png',
      },
      {
        name: 'DAO Entertainment',
        description: 'DAO Music Entertainment là công ty phát hành...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431552/labels/l9114e82ddiruwshqufq.png',
      },
      {
        name: 'Believe Digital',
        description:
          'Công ty công nghệ và dịch vụ âm nhạc kỹ thuật số toàn cầu...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431552/labels/ykb5jpwhh5uxqc3gntxs.png',
      },
      {
        name: 'DreamS Entertainment',
        description: 'Tập đoàn Giải trí & Truyền thông Việt Nam...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431553/labels/vwj1u97kvekl36yh4dbc.jpg',
      },
      {
        name: 'HYBE Labels',
        description: 'Tập đoàn giải trí đa quốc gia từ Hàn Quốc...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431553/labels/ji2fmcjlwbinvqavlx3o.png',
      },
      {
        name: 'Đông Tây Promotion',
        description: 'Công ty truyền thông và giải trí hàng đầu Việt Nam...',
        logoUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743431552/labels/aohzj3xpsp445v9pfpob.png',
      },
    ];
    for (const label of labelData) {
      await prisma.label.upsert({
        where: { name: label.name },
        update: {
          description: label.description,
          logoUrl: label.logoUrl || null,
        },
        create: {
          name: label.name,
          description: label.description,
          logoUrl: label.logoUrl || null,
        },
      });
    }
    console.log('✅ Labels seeded successfully.');

    // === 3. Seed Admin Account ===
    console.log('🔄 Seeding admin account...');
    await prisma.user.upsert({
      where: { email: 'admin@soundwave.com' },
      update: { isActive: true, role: Role.ADMIN },
      create: {
        email: 'admin@soundwave.com',
        username: 'admin',
        password: hashedPassword,
        name: 'System Administrator',
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log('✅ Admin account seeded successfully.');

    // === 4. Seed Artists, Albums, Tracks (Initial Set) ===
    console.log('🔄 Seeding initial artists, albums, and tracks...');

    const artistsSeedData = [
      // --- Vũ. ---
      {
        user: { email: 'vu@soundwave.com', username: 'vu_artist', name: 'Vũ' },
        profile: {
          artistName: 'Vũ.',
          bio: 'Hoàng Thái Vũ, thường được biết đến với nghệ danh Vũ., là một ca sĩ, nhạc sĩ sáng tác ca khúc người Việt Nam.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439401/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/btcckb2ct6jkeyzn5q9s.png',
          socialMediaLinks: {
            facebook: 'vumusic',
            instagram: 'vumusic.official',
          },
        },
        album: {
          title: 'Bảo Tàng Của Nuối Tiếc',
          coverUrl:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743434878/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/elnrlzd5dgkcl4euioqe.jpg',
          labelName: 'Warner Music Vietnam',
          genreNames: ['V-Pop', 'Ballad', 'Singer-Songwriter'],
          type: AlbumType.ALBUM,
          tracks: [
            {
              title: 'Nếu Những Tiếc Nuối',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434824/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/dfiktyddtxdxvfgj4dyg.mp3',
              trackNumber: 1,
              duration: 260,
            }, // 4:20
            {
              title: 'Mùa Mưa Ấy',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434777/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/qtkjlfyq2qxj6yr0enn3.mp3',
              trackNumber: 2,
              duration: 228,
            }, // 3:48
            {
              title: 'Ngồi Chờ Trong Vấn Vương',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434754/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/axxycictkwiapoqlbgwv.mp3',
              trackNumber: 3,
              duration: 201,
            }, // 3:21
            {
              title: 'Dành Hết Xuân Thì Để Chờ Nhau',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434845/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/rnqmok8sosnkawwdxz0d.mp3',
              trackNumber: 4,
              duration: 288,
            }, // 4:48
            {
              title: 'Và Em Sẽ Luôn Là Người Tôi Yêu Nhất',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434797/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/zy6xfmqzhjwirntwaaae.mp3',
              trackNumber: 5,
              duration: 257,
            }, // 4:17
            {
              title: 'Những Chuyến Bay',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434861/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/lonb3cmtqmeugwzfcwtn.mp3',
              trackNumber: 6,
              duration: 273,
            }, // 4:33
            {
              title: 'Mây Khóc Vì Điều Gì',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434787/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/oqqbltgfg82lhtqqhz9o.mp3',
              trackNumber: 7,
              duration: 214,
            }, // 3:34
            {
              title: 'Những Lời Hứa Bỏ Quên',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434756/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/auuktbf2dboi0i1kjlzl.mp3',
              trackNumber: 8,
              duration: 236,
            }, // 3:56
            {
              title: 'Không Yêu Em Thì Yêu Ai',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434791/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/glvb7rydfc9xmsoehnwq.mp3',
              trackNumber: 9,
              duration: 232,
            }, // 3:52
            {
              title: 'bình yên',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743434776/testAlbum/V%C5%A9/B%E1%BA%A3o%20T%C3%A0ng%20C%E1%BB%A7a%20Nu%E1%BB%91i%20Ti%E1%BA%BFc/myyqqjyhofy8pzetplpc.mp3',
              trackNumber: 10,
              duration: 201,
            }, // 3:21
          ],
        },
      },
      // --- Shiki ---
      {
        user: {
          email: 'shiki@soundwave.com',
          username: 'shiki_artist',
          name: 'Shiki',
        },
        profile: {
          artistName: 'Shiki',
          bio: 'Shiki tên thật là Trần Duy Tùng, là một nghệ sĩ trẻ đa tài trong cộng đồng nhạc Indie/Lo-fi Việt Nam.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439433/testAlbum/Shiki/L%E1%BA%B7ng/hkbmzyo4vngqrrdmb0az.webp',
          socialMediaLinks: {
            facebook: 'shiki.official',
            instagram: 'shiki.official',
          },
        },
        album: {
          title: 'Lặng',
          coverUrl:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743436315/testAlbum/Shiki/L%E1%BA%B7ng/c4n2z5lw7j38cevdcjwn.jpg',
          labelName: 'CDSL',
          genreNames: ['V-Pop', 'Lo-fi', 'Indie'],
          type: AlbumType.ALBUM,
          tracks: [
            {
              title: '1000 Ánh Mắt',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436373/testAlbum/Shiki/L%E1%BA%B7ng/rigndjyu6sha8qudao4d.mp3',
              trackNumber: 1,
              duration: 152,
            }, // 2:32
            {
              title: 'Anh Vẫn Đợi',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436465/testAlbum/Shiki/L%E1%BA%B7ng/i6hmq7l3hdqvbxu5e28r.mp3',
              trackNumber: 2,
              duration: 152,
            }, // 2:32
            {
              title: 'Có Đôi Điều',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436588/testAlbum/Shiki/L%E1%BA%B7ng/qxklb5cw51whc4isrc0q.mp3',
              trackNumber: 3,
              duration: 174,
            }, // 2:54
            {
              title: 'Lặng',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436725/testAlbum/Shiki/L%E1%BA%B7ng/sgvcaztihnxys4q8jiwf.mp3',
              trackNumber: 4,
              duration: 196,
            }, // 3:16
            {
              title: 'Night Time',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436782/testAlbum/Shiki/L%E1%BA%B7ng/zqwu8zxop4btjefhmegl.mp3',
              trackNumber: 5,
              duration: 228,
            }, // 3:48
            {
              title: 'Perfect',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436825/testAlbum/Shiki/L%E1%BA%B7ng/odtql92weapv0vu7cwch.mp3',
              trackNumber: 6,
              duration: 188,
            }, // 3:08
            {
              title: 'Take Off Your Hands',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743436987/testAlbum/Shiki/L%E1%BA%B7ng/wxsbjznbjgpkgbma1rhr.mp3',
              trackNumber: 7,
              duration: 204,
            }, // 3:24
          ],
        },
      },
      // --- tlinh (No album here, featured in Low G's) ---
      {
        user: {
          email: 'tlinh@soundwave.com',
          username: 'tlinh_artist',
          name: 'tlinh',
        },
        profile: {
          artistName: 'tlinh',
          bio: 'tlinh tên thật là Nguyễn Thảo Linh, là một nữ rapper, ca sĩ và nhạc sĩ người Việt Nam. Cô được biết đến sau khi tham gia chương trình Rap Việt mùa 1.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439252/testAlbum/tlinh%2C%20Low%20G/FLVR/yhujw5bifxyhncqddgiw.png',
          socialMediaLinks: {
            instagram: 'thaylinhhomnay',
            facebook: 'tlinh.official',
          },
        },
        // No album defined here
      },
      // --- Low G (with tlinh featured) ---
      {
        user: {
          email: 'lowg@soundwave.com',
          username: 'lowg_artist',
          name: 'Low G',
        },
        profile: {
          artistName: 'Low G',
          bio: 'Low G tên thật là Nguyễn Hoàng Long, là một rapper người Việt Nam. Anh được biết đến với phong cách rap độc đáo và kỹ thuật tốt.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439236/testAlbum/tlinh%2C%20Low%20G/FLVR/fwt1lfhfrzqq6dchl8nw.jpg',
          socialMediaLinks: {
            facebook: 'lowgthapsang',
            instagram: 'lowgthapsang',
          },
        },
        album: {
          title: 'FLVR',
          coverUrl:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743437224/testAlbum/tlinh%2C%20Low%20G/FLVR/oxz6tyeukjvo9lkcfw51.jpg',
          labelName: 'SPACESPEAKERS LABEL',
          genreNames: ['V-Pop', 'Hip-Hop', 'Rap'],
          type: AlbumType.EP,
          featuredArtistNames: ['tlinh'], // tlinh is the featured artist for the whole EP in this example
          tracks: [
            {
              title: 'DÂU TẰM',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437229/testAlbum/tlinh%2C%20Low%20G/FLVR/bgsotddidlfj6zrzbtyn.mp3',
              trackNumber: 1,
              duration: 160,
            }, // 2:40
            {
              title: 'NGÂN',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437334/testAlbum/tlinh%2C%20Low%20G/FLVR/ntlvaidfotjbmw9rxg3z.mp3',
              trackNumber: 2,
              duration: 158,
            }, // 2:38
            {
              title: 'HOP ON DA SHOW',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437358/testAlbum/tlinh%2C%20Low%20G/FLVR/pgdrfb8oux5ub958hrvf.mp3',
              trackNumber: 3,
              duration: 175,
            }, // 2:55
            {
              title: 'PHÓNG ZÌN ZÌN',
              audioUrl:
                'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437384/testAlbum/tlinh%2C%20Low%20G/FLVR/vqv3bigkrhgob2diijnu.mp3',
              trackNumber: 4,
              duration: 203,
            }, // 3:23
          ],
        },
      },
      // --- itsnk (Needed for Wren Evans feature) ---
      {
        user: {
          email: 'itsnk@soundwave.com',
          username: 'itsnk_artist',
          name: 'itsnk',
        },
        profile: {
          artistName: 'itsnk',
          bio: 'itsnk là một nghệ sĩ/producer âm nhạc trẻ tài năng.',
          avatar: null, // Add avatar URL if available
          socialMediaLinks: {},
        },
        // No album
      },
      // --- Wren Evans ---
      {
        user: {
          email: 'wrenevans@soundwave.com',
          username: 'wrenevans_artist',
          name: 'Wren Evans',
        },
        profile: {
          artistName: 'Wren Evans',
          bio: 'Wren Evans tên thật là Lê Phan, là một ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442570/testAlbum/Wren%20Evans/T%E1%BB%ABng%20Quen/wzrdd9fi2qihaqihoiro.jpg', // Use one of the single covers or a dedicated avatar
          socialMediaLinks: {
            instagram: 'wrenevansmusic',
            facebook: 'wrenevansmusic',
          },
        },
        // No album, singles will be seeded separately
      },
      // --- Phan Đình Tùng ---
      {
        user: {
          email: 'phandinhtung@soundwave.com',
          username: 'phandinhtung_artist',
          name: 'Phan Đình Tùng',
        },
        profile: {
          artistName: 'Phan Đình Tùng',
          bio: 'Phan Đình Tùng là một ca sĩ, nhạc sĩ nổi tiếng người Việt Nam, cựu thành viên nhóm nhạc MTV.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442756/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/tomj0zyas6grk3zft230.jpg', // Use single cover or dedicated avatar
          socialMediaLinks: { facebook: 'phandinhtung.singer' },
        },
        // No album, single will be seeded separately
      },
    ];

    const artistProfilesMap = new Map<string, string>(); // Map artistName to artistId

    // Seed Users and Artist Profiles
    for (const artistData of artistsSeedData) {
      const user = await prisma.user.upsert({
        where: { email: artistData.user.email },
        update: {
          name: artistData.user.name,
          username: artistData.user.username,
          avatar: artistData.profile.avatar,
        },
        create: {
          ...artistData.user,
          avatar: artistData.profile.avatar,
          password: hashedPassword,
          isActive: true,
          role: Role.USER,
        },
      });

      const artistProfile = await prisma.artistProfile.upsert({
        where: { userId: user.id },
        update: {
          ...artistData.profile,
          isVerified: true,
          isActive: true,
          verifiedAt: now,
        },
        create: {
          ...artistData.profile,
          userId: user.id,
          role: Role.ARTIST,
          isVerified: true,
          isActive: true,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
      artistProfilesMap.set(artistProfile.artistName, artistProfile.id);
      console.log(`✅ Seeded User & Artist: ${artistData.profile.artistName}`);
    }

    // Seed Albums and Tracks associated with Albums
    for (const artistData of artistsSeedData) {
      if (!artistData.album) continue; // Skip artists without an album defined here

      const artistId = artistProfilesMap.get(artistData.profile.artistName);
      if (!artistId) {
        console.warn(
          `⚠️ Could not find artistId for ${artistData.profile.artistName}. Skipping album.`
        );
        continue;
      }

      const albumLabelId = await getLabelId(artistData.album.labelName);
      const albumGenreIds = await getGenreIds(artistData.album.genreNames);
      const totalTracks = artistData.album.tracks.length;
      const albumDuration = artistData.album.tracks.reduce(
        (sum, track) => sum + (track.duration ?? 0),
        0
      );

      const album = await prisma.album.upsert({
        where: { title_artistId: { title: artistData.album.title, artistId } },
        update: {
          coverUrl: artistData.album.coverUrl,
          labelId: albumLabelId,
          type: artistData.album.type,
          isActive: true,
          totalTracks: totalTracks,
          duration: albumDuration,
          genres: {
            deleteMany: {},
            create: albumGenreIds.map((genreId) => ({ genreId })),
          },
        },
        create: {
          title: artistData.album.title,
          coverUrl: artistData.album.coverUrl,
          releaseDate: now,
          duration: albumDuration,
          totalTracks: totalTracks,
          type: artistData.album.type,
          isActive: true,
          artistId: artistId,
          labelId: albumLabelId,
          createdAt: now,
          updatedAt: now,
          genres: { create: albumGenreIds.map((genreId) => ({ genreId })) },
        },
      });
      console.log(
        `✅ Seeded Album: ${album.title} by ${artistData.profile.artistName}`
      );

      // Find featured artist IDs mentioned for the whole album
      const albumFeaturedArtistIds = (
        artistData.album.featuredArtistNames ?? []
      )
        .map((name) => artistProfilesMap.get(name))
        .filter((id): id is string => !!id);

      for (const trackData of artistData.album.tracks) {
        const track = await prisma.track.upsert({
          // Use a combination of title and main artistId as unique identifier
          where: { title_artistId: { title: trackData.title, artistId } },
          update: {
            audioUrl: trackData.audioUrl,
            trackNumber: trackData.trackNumber,
            coverUrl: album.coverUrl, // Use album cover for album tracks
            duration: trackData.duration,
            isActive: true,
            type: album.type,
            labelId: albumLabelId,
            genres: {
              deleteMany: {},
              create: albumGenreIds.map((genreId) => ({ genreId })), // Inherit genres from album
            },
          },
          create: {
            title: trackData.title,
            duration: trackData.duration,
            releaseDate: now,
            trackNumber: trackData.trackNumber,
            coverUrl: album.coverUrl, // Use album cover for album tracks
            audioUrl: trackData.audioUrl,
            playCount: 0,
            type: album.type,
            isActive: true,
            artistId: artistId, // Main artist
            albumId: album.id, // Link to the album
            labelId: albumLabelId,
            createdAt: now,
            updatedAt: now,
            genres: { create: albumGenreIds.map((genreId) => ({ genreId })) }, // Inherit genres from album
          },
        });

        // Add featured artists for this specific track (if any defined at album level)
        // You could extend trackData to include track-specific features if needed
        if (albumFeaturedArtistIds.length > 0) {
          await prisma.trackArtist.createMany({
            data: albumFeaturedArtistIds.map((featArtistId) => ({
              trackId: track.id,
              artistId: featArtistId,
            })),
            skipDuplicates: true, // Avoid errors if already featured
          });
        }
      }
      console.log(`✅ Seeded ${totalTracks} Tracks for Album: ${album.title}`);
    }
    console.log(
      '✅ Initial artists, albums, and album tracks seeded successfully.'
    );

    // === 5. Seed Standalone Singles ===
    console.log('🔄 Seeding standalone singles...');
    const singlesSeedData = [
      // Vũ.'s Single
      {
        artistName: 'Vũ.',
        title: 'Vì Anh Đâu Có Biết',
        duration: '4:01',
        coverUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442415/testAlbum/V%C5%A9/V%C3%AC%20Anh%20%C4%90%C3%A2u%20C%C3%B3%20Bi%E1%BA%BFt/frou2hv5xqhghbnlervy.jpg',
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442420/testAlbum/V%C5%A9/V%C3%AC%20Anh%20%C4%90%C3%A2u%20C%C3%B3%20Bi%E1%BA%BFt/w6t3yuq960odthomqphq.mp3',
        genreNames: ['V-Pop', 'Ballad'], // Example genres
        labelName: 'Warner Music Vietnam', // Use Vũ.'s label
        featuredArtistNames: [],
        playCount: 100, // Add a play count to ensure it appears in search results
      },
      // Wren Evans' Singles
      {
        artistName: 'Wren Evans',
        title: 'Từng Quen',
        duration: '2:54',
        coverUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442570/testAlbum/Wren%20Evans/T%E1%BB%ABng%20Quen/wzrdd9fi2qihaqihoiro.jpg',
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442574/testAlbum/Wren%20Evans/T%E1%BB%ABng%20Quen/c603qnanwdwodfrrc5xr.mp3',
        genreNames: ['V-Pop', 'Hip-Hop'], // Example genres
        labelName: null, // No label specified
        featuredArtistNames: ['itsnk'], // Feature itsnk
        playCount: 80, // Add a play count to ensure it appears in search results
      },
      {
        artistName: 'Wren Evans',
        title: 'Để Ý',
        duration: '2:39',
        coverUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442569/testAlbum/Wren%20Evans/%C4%90%E1%BB%83%20%C3%9D/dkziecvuunuibpmipxfs.jpg',
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442576/testAlbum/Wren%20Evans/%C4%90%E1%BB%83%20%C3%9D/cdiz4wskknjr4hxtdpn6.mp3',
        genreNames: ['V-Pop', 'R&B'], // Example genres
        labelName: null,
        featuredArtistNames: [],
        playCount: 75, // Add a play count to ensure it appears in search results
      },
      // Phan Đình Tùng's Single
      {
        artistName: 'Phan Đình Tùng',
        title: 'Khúc Hát Mừng Sinh Nhật',
        duration: '3:29',
        coverUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442756/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/tomj0zyas6grk3zft230.jpg',
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743442668/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/qrm9ovig9ezxdpsysdwj.mp3',
        genreNames: ['V-Pop', 'Pop'], // Example genres
        labelName: null,
        featuredArtistNames: [],
        playCount: 90, // Add a play count to ensure it appears in search results
      },
    ];

    for (const singleData of singlesSeedData) {
      const artistId = artistProfilesMap.get(singleData.artistName);
      if (!artistId) {
        console.warn(
          `⚠️ Could not find artistId for ${singleData.artistName} while seeding single "${singleData.title}". Skipping.`
        );
        continue;
      }

      const singleLabelId = await getLabelId(singleData.labelName);
      const singleGenreIds = await getGenreIds(singleData.genreNames);
      const singleDuration = durationToSeconds(singleData.duration);

      // Find featured artist IDs for this single
      const featuredArtistIds = singleData.featuredArtistNames
        .map((name) => artistProfilesMap.get(name))
        .filter((id): id is string => {
          if (!id)
            console.warn(
              `⚠️ Could not find featured artist ID for "${name}" on single "${singleData.title}".`
            );
          return !!id;
        });

      // Create the single track
      const track = await prisma.track.upsert({
        where: { title_artistId: { title: singleData.title, artistId } }, // Unique constraint
        update: {
          duration: singleDuration,
          coverUrl: singleData.coverUrl,
          audioUrl: singleData.audioUrl,
          isActive: true,
          type: AlbumType.SINGLE,
          albumId: null, // Explicitly null for singles
          labelId: singleLabelId,
          playCount: singleData.playCount || 0, // Use the play count from the data
          genres: {
            deleteMany: {}, // Ensure genres are updated if track exists
            create: singleGenreIds.map((genreId) => ({ genreId })),
          },
        },
        create: {
          title: singleData.title,
          duration: singleDuration,
          releaseDate: now,
          trackNumber: null, // Singles don't typically have track numbers
          coverUrl: singleData.coverUrl,
          audioUrl: singleData.audioUrl,
          playCount: singleData.playCount || 0, // Use the play count from the data
          type: AlbumType.SINGLE,
          isActive: true,
          artistId: artistId, // Main artist
          albumId: null, // No album link
          labelId: singleLabelId,
          createdAt: now,
          updatedAt: now,
          genres: { create: singleGenreIds.map((genreId) => ({ genreId })) },
        },
      });
      console.log(
        `✅ Seeded Single: "${track.title}" by ${singleData.artistName}`
      );

      // Link featured artists if any
      if (featuredArtistIds.length > 0) {
        await prisma.trackArtist.createMany({
          data: featuredArtistIds.map((featArtistId) => ({
            trackId: track.id,
            artistId: featArtistId,
          })),
          skipDuplicates: true, // Avoid errors if feature link already exists
        });
        console.log(
          `   -> Added features: ${singleData.featuredArtistNames.join(', ')}`
        );
      }
    }
    console.log('✅ Standalone singles seeded successfully.');

    console.log('🎉 Basic database seeding completed!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Prisma client disconnected.');
  }
}

main();
