import { PrismaClient, Role, AlbumType, User, Track } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    // Seed genres
    const genres = [
      'Pop',
      'Rock',
      'Hip-Hop',
      'R&B',
      'Electronic',
      'Jazz',
      'ClassFical',
      'Country',
      'Folk',
      'Soul',
      'Blues',
      'Indie',
      'Alternative',
      'Latin',
      'K-Pop',
    ];

    console.log('Seeding genres...');
    for (const name of genres) {
      await prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    // Seed admin
    console.log('Seeding admin...');
    const hashedAdminPassword = await bcrypt.hash('admin123@', 10);

    // Check if admin exists first
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ email: 'admin@soundwave.com' }, { username: 'admin' }],
      },
    });

    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          email: 'admin@soundwave.com',
          username: 'admin',
          password: hashedAdminPassword,
          name: 'Admin',
          role: Role.ADMIN,
          isActive: true,
        },
      });
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists, skipping creation');
    }

    // Seed artists
    console.log('Seeding artists...');

    // Get genre IDs
    const indieGenre = await prisma.genre.findFirst({
      where: { name: 'Indie' },
    });
    const popGenre = await prisma.genre.findFirst({ where: { name: 'Pop' } });
    const alternativeGenre = await prisma.genre.findFirst({
      where: { name: 'Alternative' },
    });
    const hiphopGenre = await prisma.genre.findFirst({
      where: { name: 'Hip-Hop' },
    });
    const rnbGenre = await prisma.genre.findFirst({ where: { name: 'R&B' } });

    // Create Chillies
    const chilliesPassword = await bcrypt.hash('Chillies123!', 10);
    // Check if Chillies exist
    const existingChillies = await prisma.user.findFirst({
      where: {
        OR: [{ email: 'chillies@example.com' }, { username: 'chillies' }],
      },
    });

    let chilliesUser;
    if (!existingChillies) {
      chilliesUser = await prisma.user.create({
        data: {
          email: 'chillies@example.com',
          username: 'chillies',
          password: chilliesPassword,
          name: 'Chillies',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742539893/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/f6pdrcj6i2rjg68afsci.jpg',
          role: Role.ARTIST,
          currentProfile: 'ARTIST',
          isActive: true,
        },
      });
    } else {
      chilliesUser = existingChillies;
      console.log('Chillies user already exists, using existing user');
    }

    // Check if Chillies artist profile exists
    const existingChilliesProfile = await prisma.artistProfile.findFirst({
      where: {
        OR: [{ userId: chilliesUser.id }, { artistName: 'Chillies' }],
      },
    });

    let chillies;
    if (!existingChilliesProfile) {
      chillies = await prisma.artistProfile.create({
        data: {
          artistName: 'Chillies',
          bio: 'Indie/Alternative band from Vietnam.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742539893/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/f6pdrcj6i2rjg68afsci.jpg',
          socialMediaLinks: {
            instagram: 'chillies.band',
            facebook: 'chilliesband',
          },
          isVerified: true,
          isActive: true,
          verifiedAt: new Date(),
          userId: chilliesUser.id,
        },
      });
    } else {
      chillies = existingChilliesProfile;
      console.log(
        'Chillies artist profile already exists, using existing profile'
      );
    }

    // Add genres to Chillies - only if they don't already exist
    if (indieGenre) {
      const existingGenre = await prisma.artistGenre.findFirst({
        where: {
          artistId: chillies.id,
          genreId: indieGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.artistGenre.create({
          data: { artistId: chillies.id, genreId: indieGenre.id },
        });
      }
    }
    if (popGenre) {
      const existingGenre = await prisma.artistGenre.findFirst({
        where: {
          artistId: chillies.id,
          genreId: popGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.artistGenre.create({
          data: { artistId: chillies.id, genreId: popGenre.id },
        });
      }
    }
    if (alternativeGenre) {
      const existingGenre = await prisma.artistGenre.findFirst({
        where: {
          artistId: chillies.id,
          genreId: alternativeGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.artistGenre.create({
          data: { artistId: chillies.id, genreId: alternativeGenre.id },
        });
      }
    }

    // Create Playboi Carti
    const cartiPassword = await bcrypt.hash('Carti123!', 10);

    // Check if Carti exists
    const existingCarti = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'playboicarti@example.com' },
          { username: 'playboicarti' },
        ],
      },
    });

    let cartiUser;
    if (!existingCarti) {
      cartiUser = await prisma.user.create({
        data: {
          email: 'playboicarti@example.com',
          username: 'playboicarti',
          password: cartiPassword,
          name: 'Playboi Carti',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540118/testAlbum/MUSIC/h7ocs5fd3byinvj4prpm.jpg',
          role: Role.ARTIST,
          currentProfile: 'ARTIST',
          isActive: true,
        },
      });
    } else {
      cartiUser = existingCarti;
      console.log('Playboi Carti user already exists, using existing user');
    }

    // Check if Carti artist profile exists
    const existingCartiProfile = await prisma.artistProfile.findFirst({
      where: {
        OR: [{ userId: cartiUser.id }, { artistName: 'Playboi Carti' }],
      },
    });

    let playboi;
    if (!existingCartiProfile) {
      playboi = await prisma.artistProfile.create({
        data: {
          artistName: 'Playboi Carti',
          bio: 'American rapper, singer, and songwriter.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540118/testAlbum/MUSIC/h7ocs5fd3byinvj4prpm.jpg',
          socialMediaLinks: {
            instagram: 'playboicarti',
            facebook: 'playboicarti',
          },
          isVerified: true,
          isActive: true,
          verifiedAt: new Date(),
          userId: cartiUser.id,
        },
      });
    } else {
      playboi = existingCartiProfile;
      console.log(
        'Playboi Carti artist profile already exists, using existing profile'
      );
    }

    // Add genres to Playboi Carti
    if (hiphopGenre) {
      const existingGenre = await prisma.artistGenre.findFirst({
        where: {
          artistId: playboi.id,
          genreId: hiphopGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.artistGenre.create({
          data: { artistId: playboi.id, genreId: hiphopGenre.id },
        });
      }
    }

    // Create Kendrick Lamar
    const kendrickPassword = await bcrypt.hash('Kendrick123!', 10);

    // Check if Kendrick exists
    const existingKendrick = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'kendricklamar@example.com' },
          { username: 'kendricklamar' },
        ],
      },
    });

    let kendrickUser;
    if (!existingKendrick) {
      kendrickUser = await prisma.user.create({
        data: {
          email: 'kendricklamar@example.com',
          username: 'kendricklamar',
          password: kendrickPassword,
          name: 'Kendrick Lamar',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540304/testAlbum/GNX/zgqgjfvh6gxs90pwwj1x.jpg',
          role: Role.ARTIST,
          currentProfile: 'ARTIST',
          isActive: true,
        },
      });
    } else {
      kendrickUser = existingKendrick;
      console.log('Kendrick Lamar user already exists, using existing user');
    }

    // Check if Kendrick artist profile exists
    const existingKendrickProfile = await prisma.artistProfile.findFirst({
      where: {
        OR: [{ userId: kendrickUser.id }, { artistName: 'Kendrick Lamar' }],
      },
    });

    let kendrick;
    if (!existingKendrickProfile) {
      kendrick = await prisma.artistProfile.create({
        data: {
          artistName: 'Kendrick Lamar',
          bio: 'American rapper, songwriter, and record producer.',
          avatar:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540304/testAlbum/GNX/zgqgjfvh6gxs90pwwj1x.jpg',
          socialMediaLinks: {
            instagram: 'kendricklamar',
            facebook: 'kendricklamar',
          },
          isVerified: true,
          isActive: true,
          verifiedAt: new Date(),
          userId: kendrickUser.id,
        },
      });
    } else {
      kendrick = existingKendrickProfile;
      console.log(
        'Kendrick Lamar artist profile already exists, using existing profile'
      );
    }

    // Add genres to Kendrick Lamar
    if (hiphopGenre) {
      const existingGenre = await prisma.artistGenre.findFirst({
        where: {
          artistId: kendrick.id,
          genreId: hiphopGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.artistGenre.create({
          data: { artistId: kendrick.id, genreId: hiphopGenre.id },
        });
      }
    }
    if (rnbGenre) {
      const existingGenre = await prisma.artistGenre.findFirst({
        where: {
          artistId: kendrick.id,
          genreId: rnbGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.artistGenre.create({
          data: { artistId: kendrick.id, genreId: rnbGenre.id },
        });
      }
    }

    // Seed normal users
    console.log('Seeding normal users...');
    const users: User[] = [];

    for (let i = 1; i <= 5; i++) {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: `user${i}@example.com` },
            { username: `musiclover${i}` },
          ],
        },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('User123!', 10);
        const user = await prisma.user.create({
          data: {
            email: `user${i}@example.com`,
            username: `musiclover${i}`,
            password: hashedPassword,
            name: `User ${i}`,
            avatar: `https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540900/avatars/user${i}.jpg`,
            role: Role.USER,
            isActive: true,
          },
        });
        users.push(user);
      } else {
        users.push(existingUser);
        console.log(`User ${i} already exists, using existing user`);
      }
    }

    // Seed albums and tracks
    console.log('Seeding albums and tracks...');

    // Check if Chillies album exists
    const existingChilliesAlbum = await prisma.album.findFirst({
      where: {
        title: 'Qua Khung Cửa Sổ',
        artistId: chillies.id,
      },
    });

    let chilliesAlbum;
    if (!existingChilliesAlbum) {
      // Chillies album
      chilliesAlbum = await prisma.album.create({
        data: {
          title: 'Qua Khung Cửa Sổ',
          coverUrl:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742539893/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/f6pdrcj6i2rjg68afsci.jpg',
          releaseDate: new Date('2021-05-15'),
          duration: 900, // ~15 minutes
          totalTracks: 4,
          type: AlbumType.ALBUM,
          isActive: true,
          artistId: chillies.id,
        },
      });
    } else {
      chilliesAlbum = existingChilliesAlbum;
      console.log('Chillies album already exists, using existing album');
    }

    // Add genres to Chillies album
    if (indieGenre) {
      const existingGenre = await prisma.albumGenre.findFirst({
        where: {
          albumId: chilliesAlbum.id,
          genreId: indieGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.albumGenre.create({
          data: { albumId: chilliesAlbum.id, genreId: indieGenre.id },
        });
      }
    }
    if (popGenre) {
      const existingGenre = await prisma.albumGenre.findFirst({
        where: {
          albumId: chilliesAlbum.id,
          genreId: popGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.albumGenre.create({
          data: { albumId: chilliesAlbum.id, genreId: popGenre.id },
        });
      }
    }

    // Chillies tracks
    const chilliesTracks = [
      {
        title: 'Vùng Ký Ức',
        duration: 254, // ~4:14
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539938/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/xfl4mrclnw3ft833eo2i.mp3',
        trackNumber: 1,
      },
      {
        title: 'Mộng Du',
        duration: 228, // ~3:48
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539929/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/wpvbccdtkfnrdxyys5go.mp3',
        trackNumber: 2,
      },
      {
        title: 'Qua Khung Cửa Sổ',
        duration: 241, // ~4:01
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539938/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/tqhzgu72gwiogxl8thsp.mp3',
        trackNumber: 3,
      },
      {
        title: 'Một Cái Tên',
        duration: 232, // ~3:52
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539932/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/jgacx8ts8tnkkjawclrl.mp3',
        trackNumber: 4,
      },
    ];

    // Create Chillies tracks
    for (const trackData of chilliesTracks) {
      // Check if track already exists
      const existingTrack = await prisma.track.findFirst({
        where: {
          title: trackData.title,
          artistId: chillies.id,
        },
      });

      if (!existingTrack) {
        const track = await prisma.track.create({
          data: {
            title: trackData.title,
            duration: trackData.duration,
            releaseDate: chilliesAlbum.releaseDate,
            trackNumber: trackData.trackNumber,
            coverUrl: chilliesAlbum.coverUrl,
            audioUrl: trackData.audioUrl,
            playCount: Math.floor(Math.random() * 1000),
            type: AlbumType.ALBUM,
            isActive: true,
            artistId: chillies.id,
            albumId: chilliesAlbum.id,
          },
        });

        // Add genres to track
        if (indieGenre) {
          await prisma.trackGenre.create({
            data: { trackId: track.id, genreId: indieGenre.id },
          });
        }
        if (popGenre) {
          await prisma.trackGenre.create({
            data: { trackId: track.id, genreId: popGenre.id },
          });
        }
      } else {
        console.log(`Track ${trackData.title} already exists, skipping`);
      }
    }

    // Check if Carti album exists
    const existingCartiAlbum = await prisma.album.findFirst({
      where: {
        title: 'MUSIC',
        artistId: playboi.id,
      },
    });

    let cartiAlbum;
    if (!existingCartiAlbum) {
      // Playboi Carti album
      cartiAlbum = await prisma.album.create({
        data: {
          title: 'MUSIC',
          coverUrl:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540118/testAlbum/MUSIC/h7ocs5fd3byinvj4prpm.jpg',
          releaseDate: new Date('2023-09-10'),
          duration: 530, // ~8:50
          totalTracks: 3,
          type: AlbumType.ALBUM,
          isActive: true,
          artistId: playboi.id,
        },
      });
    } else {
      cartiAlbum = existingCartiAlbum;
      console.log('Playboi Carti album already exists, using existing album');
    }

    // Add genres to Playboi Carti album
    if (hiphopGenre) {
      const existingGenre = await prisma.albumGenre.findFirst({
        where: {
          albumId: cartiAlbum.id,
          genreId: hiphopGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.albumGenre.create({
          data: { albumId: cartiAlbum.id, genreId: hiphopGenre.id },
        });
      }
    }

    // Playboi Carti tracks
    const cartiTracks = [
      {
        title: 'PHILLY',
        duration: 181, // ~3:01
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540171/testAlbum/MUSIC/z3lh67ygrlyc0qvyx8hk.mp3',
        trackNumber: 1,
      },
      {
        title: 'RATHER LIE',
        duration: 164, // ~2:44
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540166/testAlbum/MUSIC/dikzevnomueqpdmhgzhw.mp3',
        trackNumber: 2,
      },
      {
        title: 'BACKD00R',
        duration: 173, // ~2:53
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540175/testAlbum/MUSIC/blyhwlcqhuf5uf29hecr.mp3',
        trackNumber: 3,
      },
    ];

    // Create Playboi Carti tracks
    for (const trackData of cartiTracks) {
      // Check if track already exists
      const existingTrack = await prisma.track.findFirst({
        where: {
          title: trackData.title,
          artistId: playboi.id,
        },
      });

      if (!existingTrack) {
        const track = await prisma.track.create({
          data: {
            title: trackData.title,
            duration: trackData.duration,
            releaseDate: cartiAlbum.releaseDate,
            trackNumber: trackData.trackNumber,
            coverUrl: cartiAlbum.coverUrl,
            audioUrl: trackData.audioUrl,
            playCount: Math.floor(Math.random() * 1000),
            type: AlbumType.ALBUM,
            isActive: true,
            artistId: playboi.id,
            albumId: cartiAlbum.id,
          },
        });

        // Add genres to track
        if (hiphopGenre) {
          await prisma.trackGenre.create({
            data: { trackId: track.id, genreId: hiphopGenre.id },
          });
        }
      } else {
        console.log(`Track ${trackData.title} already exists, skipping`);
      }
    }

    // Check if Kendrick album exists
    const existingKendrickAlbum = await prisma.album.findFirst({
      where: {
        title: 'GNX',
        artistId: kendrick.id,
      },
    });

    let kendrickAlbum;
    if (!existingKendrickAlbum) {
      // Kendrick Lamar album
      kendrickAlbum = await prisma.album.create({
        data: {
          title: 'GNX',
          coverUrl:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540304/testAlbum/GNX/zgqgjfvh6gxs90pwwj1x.jpg',
          releaseDate: new Date('2024-01-05'),
          duration: 600, // ~10:00
          totalTracks: 3,
          type: AlbumType.ALBUM,
          isActive: true,
          artistId: kendrick.id,
        },
      });
    } else {
      kendrickAlbum = existingKendrickAlbum;
      console.log('Kendrick Lamar album already exists, using existing album');
    }

    // Add genres to Kendrick Lamar album
    if (hiphopGenre) {
      const existingGenre = await prisma.albumGenre.findFirst({
        where: {
          albumId: kendrickAlbum.id,
          genreId: hiphopGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.albumGenre.create({
          data: { albumId: kendrickAlbum.id, genreId: hiphopGenre.id },
        });
      }
    }
    if (rnbGenre) {
      const existingGenre = await prisma.albumGenre.findFirst({
        where: {
          albumId: kendrickAlbum.id,
          genreId: rnbGenre.id,
        },
      });

      if (!existingGenre) {
        await prisma.albumGenre.create({
          data: { albumId: kendrickAlbum.id, genreId: rnbGenre.id },
        });
      }
    }

    // Kendrick Lamar tracks
    const kendrickTracks = [
      {
        title: 'wacced out murals',
        duration: 224, // ~3:44
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540722/testAlbum/GNX/srd0aeofrrxhxodgqjgs.mp3',
        trackNumber: 1,
      },
      {
        title: 'luther',
        duration: 213, // ~3:33
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540717/testAlbum/GNX/xheoiq4ny7flu2zack5g.mp3',
        trackNumber: 2,
      },
      {
        title: 'tv off',
        duration: 197, // ~3:17
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540719/testAlbum/GNX/a0i5pakxq2i9vzan9exd.mp3',
        trackNumber: 3,
      },
    ];

    // Create Kendrick Lamar tracks
    const allTracks: Track[] = [];
    for (const trackData of kendrickTracks) {
      // Check if track already exists
      const existingTrack = await prisma.track.findFirst({
        where: {
          title: trackData.title,
          artistId: kendrick.id,
        },
      });

      let track;
      if (!existingTrack) {
        track = await prisma.track.create({
          data: {
            title: trackData.title,
            duration: trackData.duration,
            releaseDate: kendrickAlbum.releaseDate,
            trackNumber: trackData.trackNumber,
            coverUrl: kendrickAlbum.coverUrl,
            audioUrl: trackData.audioUrl,
            playCount: Math.floor(Math.random() * 1000),
            type: AlbumType.ALBUM,
            isActive: true,
            artistId: kendrick.id,
            albumId: kendrickAlbum.id,
          },
        });

        // Add genres to track
        if (hiphopGenre) {
          await prisma.trackGenre.create({
            data: { trackId: track.id, genreId: hiphopGenre.id },
          });
        }
        if (rnbGenre) {
          await prisma.trackGenre.create({
            data: { trackId: track.id, genreId: rnbGenre.id },
          });
        }
      } else {
        track = existingTrack;
        console.log(
          `Track ${trackData.title} already exists, using existing track`
        );
      }

      allTracks.push(track);
    }

    // Get all tracks
    const tracks = await prisma.track.findMany();

    // Seed user interactions
    console.log('Seeding user interactions...');
    for (const user of users) {
      // Each user listens to a random number of tracks
      const numberOfTracksToListen =
        Math.floor(Math.random() * tracks.length) + 3;
      const tracksToListen = tracks
        .sort(() => 0.5 - Math.random())
        .slice(0, numberOfTracksToListen);

      for (const track of tracksToListen) {
        // Check if history already exists
        const existingHistory = await prisma.history.findFirst({
          where: {
            userId: user.id,
            trackId: track.id,
            type: 'PLAY',
          },
        });

        if (!existingHistory) {
          // Create history with random play count
          const playCount = Math.floor(Math.random() * 5) + 1;
          await prisma.history.create({
            data: {
              type: 'PLAY',
              playCount: playCount,
              completed: true,
              userId: user.id,
              trackId: track.id,
            },
          });
        }

        // Check if like already exists
        const existingLike = await prisma.userLikeTrack.findFirst({
          where: {
            userId: user.id,
            trackId: track.id,
          },
        });

        // 40% chance user will like the track if no existing like
        if (!existingLike && Math.random() < 0.4) {
          await prisma.userLikeTrack.create({
            data: {
              userId: user.id,
              trackId: track.id,
            },
          });
        }
      }
    }

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
