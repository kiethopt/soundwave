import * as process from 'process';
import { PrismaClient, AlbumType } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/vi';

const prisma = new PrismaClient();
faker.seed(123);

// Phần main sẽ nhận tham số đầu vào
async function main() {
  // Lấy artistId từ command line argument
  const artistId = process.argv[2];
  if (!artistId) {
    console.error('❌ Vui lòng cung cấp artistId');
    console.log('Cách dùng: npx ts-node seed-artist.ts <artist-id>');
    process.exit(1);
  }

  // Kiểm tra artist tồn tại
  const artist = await prisma.artistProfile.findUnique({
    where: { id: artistId },
    include: { user: true },
  });

  if (!artist) {
    console.error(`❌ Không tìm thấy nghệ sĩ với ID: ${artistId}`);
    process.exit(1);
  }

  console.log(`🎹 Bắt đầu tạo dữ liệu cho nghệ sĩ: ${artist.artistName}`);

  // Tạo thể loại nhạc (giữ nguyên)
  const genres = await Promise.all(
    [
      'Nhạc Trẻ',
      'Bolero',
      'V-Pop',
      'Rap Việt',
      'Nhạc Dance',
      'Nhạc Cách Mạng',
    ].map((name) =>
      prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  // Tạo 10 albums
  const ALBUM_TITLES = [
    'Một triệu like',
    'Hôm nay tôi buồn',
    'Đi để trở về',
    'Chúng ta của hiện tại',
    'Hẹn một mai',
    'Có chàng trai viết lên cây',
  ];

  for (let i = 0; i < 11; i++) {
    const albumType = faker.helpers.arrayElement(Object.values(AlbumType));
    const albumTitle = `${faker.helpers.arrayElement(
      ALBUM_TITLES
    )} ${faker.number.int({ min: 1, max: 9 })}_${faker.string.alphanumeric(6)}`;

    // Tạo album
    const album = await prisma.album.upsert({
      where: { title_artistId: { title: albumTitle, artistId } },
      update: {},
      create: {
        title: albumTitle,
        coverUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1738422177/covers/dme611p5ogaqii8bcfbu.jpg',
        releaseDate: faker.date.past({ years: 2 }),
        duration: 0,
        totalTracks: 0,
        type: albumType,
        artistId,
        genres: {
          create: genres.slice(0, 2).map((genre) => ({
            genre: { connect: { id: genre.id } },
          })),
        },
      },
    });

    // Tạo 5 tracks cho mỗi album
    let totalDuration = 0;
    await Promise.all(
      Array.from({ length: 5 }).map(async (_, index) => {
        const duration = faker.number.int({ min: 120, max: 300 });
        totalDuration += duration;

        const trackTitle =
          `${faker.music.songName()}_${faker.string.alphanumeric(8)}`
            .replace(/[^a-zA-Z0-9À-ỹ\s]/g, '')
            .replace(/(\w)(\d)/g, '$1 $2');

        return prisma.track.create({
          data: {
            title: trackTitle,
            duration,
            releaseDate: album.releaseDate,
            trackNumber: index + 1,
            coverUrl: album.coverUrl,
            audioUrl:
              'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1738422247/tracks/rui11n539f2ilguc79sz.mp3',
            type: albumType,
            artistId,
            albumId: album.id,
            genres: {
              create: genres.slice(0, 1).map((genre) => ({
                genre: { connect: { id: genre.id } },
              })),
            },
          },
        });
      })
    );

    // Cập nhật thông tin album
    await prisma.album.update({
      where: { id: album.id },
      data: { duration: totalDuration, totalTracks: 5 },
    });
  }

  console.log(`✅ Đã tạo thành công:
- 11 album
- 55 bài hát (5 bài/album)`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
