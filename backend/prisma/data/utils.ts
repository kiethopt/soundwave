import { PrismaClient } from '@prisma/client';

// Helper function to convert MM:SS or M:SS string to seconds
export function durationToSeconds(durationStr: string): number {
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

// Helper function to get genre IDs
export async function getGenreIds(
  prisma: PrismaClient,
  genreNames: string[]
): Promise<string[]> {
  const genres = await prisma.genre.findMany({
    where: { name: { in: genreNames } },
    select: { id: true },
  });
  return genres.map((g) => g.id);
}

// Helper function to get label ID
export async function getLabelId(
  prisma: PrismaClient,
  labelName: string | null
): Promise<string | null> {
  if (!labelName) return null;
  const label = await prisma.label.findUnique({
    where: { name: labelName },
    select: { id: true },
  });
  return label?.id ?? null;
}

// Common genre names for the system
export const genreNames = [
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

// Label data for the system
export const labelData = [
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
      'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743512738/Warner_Music_VN_qqwch0.png',
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