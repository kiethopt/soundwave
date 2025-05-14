import { AlbumType } from '@prisma/client';

export interface TrackData {
  title: string; audioUrl: string; trackNumber: number; featuredArtists?: string[]; coverUrl?: string; tempo?: number; mood?: string; key?: string; scale?: string; danceability?: number; energy?: number; genres?: string[];
}

export interface AlbumData {
  artistName: string; title: string; coverUrl: string; type: AlbumType; labelName: string | null; genreNames: string[]; releaseDate?: Date; tracks: TrackData[]; featuredArtistNames?: string[];
}

export const albums: AlbumData[] = [
  {
    "artistName": "AMEE",
    "title": "Chủ nhật boy",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813665/covers/pcqwiqptybyfoxynansa.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Chủ nhật boy - MV Version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813662/tracks/kz2anj6e1ajaxj8mxb6n.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813665/covers/pcqwiqptybyfoxynansa.jpg",
        "tempo": 96,
        "mood": "Energetic",
        "key": "C",
        "scale": "major",
        "danceability": 0.7286,
        "energy": 0.6161,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "AMEE",
    "title": "dreaAMEE (acoustic version)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "từ thích thích thành thương thương",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813356/tracks/izkp4se9g1vckyxdzh0l.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
        "tempo": 135,
        "mood": "Melancholic",
        "key": "C#",
        "scale": "minor",
        "danceability": 0.5231,
        "energy": 0.0992,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "gr8teful (intro)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813336/tracks/vdwf6bpwdesdgohi9asd.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
        "tempo": 95,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.4896,
        "energy": 0.1513,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "yêu thì yêu không yêu thì yêu",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813340/tracks/mzpj45ijnziatkaan5av.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
        "tempo": 115,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.6666,
        "energy": 0.1911,
        "genres": [
          "Ballad",
          "V-Pop",
          "Indie"
        ]
      },
      {
        "title": "sao anh chưa về nhà",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813367/tracks/qgft9hszxhkf0dyxxner.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
        "tempo": 93,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.4519,
        "energy": 0.1428,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "xuân hạ thu đông rồi lại xuân",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813344/tracks/r3qg29rvubk08yn16boa.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
        "tempo": 108,
        "mood": "Melancholic",
        "key": "G",
        "scale": "minor",
        "danceability": 0.501,
        "energy": 0.0544,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "nàng thơ… trời giấu trời mang đi",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813350/tracks/nlpxhwooz0c7unztf56e.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
        "tempo": 94,
        "mood": "Melancholic",
        "key": "B",
        "scale": "minor",
        "danceability": 0.4941,
        "energy": 0.053,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "anh nhà ở đâu thế",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813361/tracks/d82zbc1byfwtej3xtuft.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813337/covers/pfcuxakvzjn8kltho5be.jpg",
        "tempo": 108,
        "mood": "Melancholic",
        "key": "D#",
        "scale": "minor",
        "danceability": 0.6772,
        "energy": 0.1271,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "AMEE",
    "title": "dreaAMEE",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "g9 (Outro)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813332/tracks/b1bkc3mlbdujpw7yogwv.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
        "tempo": 95,
        "mood": "Melancholic",
        "key": "D#",
        "scale": "minor",
        "danceability": 0.369,
        "energy": 0.0654,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "mama boy",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813310/tracks/lkbexplhj0iilruhaecu.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
        "tempo": 122,
        "mood": "Moderate",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.5938,
        "energy": 0.545,
        "genres": [
          "Rap",
          "Hip-Hop"
        ]
      },
      {
        "title": "đen đá không đường",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813306/tracks/rfujyfntrpvgeqftqcok.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.723,
        "energy": 0.1587,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "dreAMEE (intro)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813303/tracks/peafiihz2nk19ps1owoo.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
        "tempo": 86,
        "mood": "Melancholic",
        "key": "A#",
        "scale": "minor",
        "danceability": 0.4672,
        "energy": 0.162,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "xuân, hạ, thu, đông rồi lại xuân",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813327/tracks/cwraugb0qs82jgehpvfh.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
        "tempo": 98,
        "mood": "Melancholic",
        "key": "G",
        "scale": "minor",
        "danceability": 0.4983,
        "energy": 0.0518,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "ex's hate me, Pt.2",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813322/tracks/vjoesnlzuirccwxru6gb.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
        "tempo": 111,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.5921,
        "energy": 0.1025,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "trời giấu trời mang đi",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813316/tracks/z5jfflgou8qrc1xrrhue.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813304/covers/qytgxefuj3bqonnzjiun.jpg",
        "tempo": 93,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.4469,
        "energy": 0.109,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "AMEE",
    "title": "Em Về Tinh Khôi (25th Làn Sóng Xanh)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811131/covers/ojfp9dkuu0cy9anfoqhg.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Em Về Tinh Khôi - 25th Làn Sóng Xanh",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811129/tracks/gwrdxbzon6oq31wycui6.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811131/covers/ojfp9dkuu0cy9anfoqhg.jpg",
        "tempo": 106,
        "mood": "Melancholic",
        "key": "G",
        "scale": "minor",
        "danceability": 0.5047,
        "energy": 0.1851,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "AMEE",
    "title": "MỘNGMEE",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278911/unnamed_w32pik.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [
      "Pop",
      "R&B",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-03-20'),
    "tracks": [
      {
        "title": "2000 câu hỏi vì sao",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278906/2000_c%C3%A2u_h%E1%BB%8Fi_v%C3%AC_sao_kjuj2s.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278911/unnamed_w32pik.jpg",
        "tempo": 110,
        "mood": "Curious",
        "key": "A",
        "scale": "major",
        "danceability": 0.78,
        "energy": 0.7,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      },
      {
        "title": "MỘNG YU",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278900/M%E1%BB%98NG_YU_hdzoip.mp3",
        "trackNumber": 2,
        "featuredArtists": [
          "RPT MCK"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278911/unnamed_w32pik.jpg",
        "tempo": 105,
        "mood": "Dreamy",
        "key": "D",
        "scale": "minor",
        "danceability": 0.75,
        "energy": 0.68,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      },
      {
        "title": "Miền Mộng Mị",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278903/Mi%E1%BB%81n_M%E1%BB%99ng_M%E1%BB%8B_ytlbc6.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278911/unnamed_w32pik.jpg",
        "tempo": 98,
        "mood": "Ethereal",
        "key": "G",
        "scale": "minor",
        "danceability": 0.7,
        "energy": 0.6,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      },
      {
        "title": "Cuộc gọi lúc nửa đêm",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278902/Cu%E1%BB%99c_g%E1%BB%8Di_l%C3%BAc_n%E1%BB%ADa_%C4%91%C3%AAm_poavd2.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278911/unnamed_w32pik.jpg",
        "tempo": 92,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.62,
        "energy": 0.55,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      },
      {
        "title": "Beautiful nightmare (interlude)",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278901/Beautiful_nightmare_interlude_l5mgzv.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278911/unnamed_w32pik.jpg",
        "tempo": 80,
        "mood": "Atmospheric",
        "key": "Bb",
        "scale": "minor",
        "danceability": 0.4,
        "energy": 0.35,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "B Ray",
    "title": "Do For Love (feat. AMEE)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813274/covers/de0ske7ahum6roh75ev7.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Do For Love (feat. AMEE) - Spedup Remix",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813288/tracks/ojudkrrlsbn9dsly7c5r.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813274/covers/de0ske7ahum6roh75ev7.jpg",
        "tempo": 119,
        "mood": "Energetic",
        "key": "B",
        "scale": "minor",
        "danceability": 0.727,
        "energy": 0.6335,
        "genres": [
          "Dance",
          "New Wave"
        ]
      },
      {
        "title": "Do For Love (feat. AMEE) - Lofi",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813293/tracks/gbkhaepzfi2g4wf2zccp.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813274/covers/de0ske7ahum6roh75ev7.jpg",
        "tempo": 114,
        "mood": "Melancholic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.5087,
        "energy": 0.1827,
        "genres": [
          "Instrumental",
          "Lo-fi"
        ]
      },
      {
        "title": "Do For Love (feat. AMEE) - Remix",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813283/tracks/ki4pbru4w1ovt4o4isbo.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813274/covers/de0ske7ahum6roh75ev7.jpg",
        "tempo": 125,
        "mood": "Moderate",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.7922,
        "energy": 0.5856,
        "genres": [
          "Rap",
          "Hip-Hop"
        ]
      },
      {
        "title": "Do For Love (feat. AMEE) - Spedup",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813278/tracks/zqqh3b6gfgspawb5gc1f.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813274/covers/de0ske7ahum6roh75ev7.jpg",
        "tempo": 138,
        "mood": "Happy",
        "key": "A",
        "scale": "major",
        "danceability": 0.722,
        "energy": 0.5884,
        "genres": [
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Do For Love (feat. AMEE) - Masew Remix",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813273/tracks/o12uxoflq14pyxgbazkg.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813274/covers/de0ske7ahum6roh75ev7.jpg",
        "tempo": 118,
        "mood": "Happy",
        "key": "G#",
        "scale": "major",
        "danceability": 0.7854,
        "energy": 0.4699,
        "genres": [
          "Country"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Binz",
    "title": "Don't Break My Heart (Kaiz Remix)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807833/covers/xhhmeqxvetqdggnvtbkn.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Don't Break My Heart - Kaiz Remix",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807832/tracks/hzvrckv7pbjhydch9uu7.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807833/covers/xhhmeqxvetqdggnvtbkn.jpg",
        "tempo": 100,
        "mood": "Energetic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.7322,
        "energy": 0.6967,
        "genres": [
          "Experimental"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Binz",
    "title": "Đan Xinh In Love",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807763/covers/ejhqrvbtjmkhkaoyqhcn.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Men Cry (feat. Gonzo & Nomovodka)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807781/tracks/a8f2yuaofovguwacbjxj.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807763/covers/ejhqrvbtjmkhkaoyqhcn.jpg",
        "tempo": 87,
        "mood": "Calm",
        "key": "D",
        "scale": "minor",
        "danceability": 0.2965,
        "energy": 0.3227,
        "genres": [
          "Ambient",
          "Instrumental"
        ]
      },
      {
        "title": "Overture",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807761/tracks/jqo5zincqbidlpsagk8s.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807763/covers/ejhqrvbtjmkhkaoyqhcn.jpg",
        "tempo": 94,
        "mood": "Moderate",
        "key": "A",
        "scale": "minor",
        "danceability": 0.4652,
        "energy": 0.5135,
        "genres": [
          "Blues"
        ]
      },
      {
        "title": "Hit Me Up (feat. Nomovodka)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807798/tracks/p7mbjen30eymeedaimr5.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807763/covers/ejhqrvbtjmkhkaoyqhcn.jpg",
        "tempo": 100,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.5302,
        "energy": 0.1474,
        "genres": [
          "Jazz"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Binz",
    "title": "Keep Cầm Ca",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796415/covers/iu45h6fyjcfry67s2mfh.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Duyên Kiếp Cầm Ca",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796463/tracks/kxpeuvzcpi07f1duu9c6.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796415/covers/iu45h6fyjcfry67s2mfh.jpg",
        "tempo": 115,
        "mood": "Moderate",
        "key": "E",
        "scale": "minor",
        "danceability": 0.4017,
        "energy": 0.4503,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Rượu Độc",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796482/tracks/acjkkk03cnoiftmsmcsq.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796415/covers/iu45h6fyjcfry67s2mfh.jpg",
        "tempo": 95,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.425,
        "energy": 0.1934,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Hồn Lỡ Sa Vào",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796413/tracks/zqftttdmzdtoj4qu2dhs.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796415/covers/iu45h6fyjcfry67s2mfh.jpg",
        "tempo": 110,
        "mood": "Melancholic",
        "key": "F",
        "scale": "major",
        "danceability": 0.4031,
        "energy": 0.2845,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Chưa Yêu Lần Nao",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796428/tracks/wavpsu0yxlkpta1eiish.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796415/covers/iu45h6fyjcfry67s2mfh.jpg",
        "tempo": 100,
        "mood": "Calm",
        "key": "A",
        "scale": "minor",
        "danceability": 0.5562,
        "energy": 0.3158,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Đêm Vũ Trường",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796448/tracks/gmecvsgvh5hurctvtxxm.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796415/covers/iu45h6fyjcfry67s2mfh.jpg",
        "tempo": 90,
        "mood": "Moderate",
        "key": "E",
        "scale": "minor",
        "danceability": 0.6495,
        "energy": 0.3831,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "chief.",
    "title": "Where the Sun Sets",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852277/covers/q1myzmpmeuumvihimph2.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-10'),
    "tracks": [
      {
        "title": "troubles",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852291/tracks/gr8kczinvtjyngykkeup.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852277/covers/q1myzmpmeuumvihimph2.jpg",
        "tempo": 81,
        "mood": "Melancholic",
        "key": "C#",
        "scale": "major",
        "danceability": 0.3819,
        "energy": 0.1073,
        "genres": [
          "Jazz"
        ]
      },
      {
        "title": "overboard",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852275/tracks/jbncdee3xrsjeexfuekf.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852277/covers/q1myzmpmeuumvihimph2.jpg",
        "tempo": 75,
        "mood": "Melancholic",
        "key": "C",
        "scale": "major",
        "danceability": 0.4022,
        "energy": 0.0905,
        "genres": [
          "Acoustic",
          "Instrumental"
        ]
      },
      {
        "title": "afternoons",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852325/tracks/pqpmxmgnfhfqyxu0vn2z.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852277/covers/q1myzmpmeuumvihimph2.jpg",
        "tempo": 79,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.4348,
        "energy": 0.0819,
        "genres": [
          "Jazz"
        ]
      },
      {
        "title": "picking berries",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852314/tracks/cumik9cegrtj1dwpmzbn.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852277/covers/q1myzmpmeuumvihimph2.jpg",
        "tempo": 79,
        "mood": "Melancholic",
        "key": "B",
        "scale": "major",
        "danceability": 0.5311,
        "energy": 0.1592,
        "genres": [
          "Jazz"
        ]
      },
      {
        "title": "waiting",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852303/tracks/i2rmldcdxzrxhi54kit0.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852277/covers/q1myzmpmeuumvihimph2.jpg",
        "tempo": 134,
        "mood": "Melancholic",
        "key": "Ab",
        "scale": "major",
        "danceability": 0.646,
        "energy": 0.1499,
        "genres": [
          "Jazz"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Dương Domic",
    "title": "Dữ Liệu Quý",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745731266/dulieuquy_kd0c8v.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [
      "Pop",
      "R&B",
      "Indie",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-01-31'),
    "tracks": [
      {
        "title": "Pin Dự Phòng",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745731355/Pin_D%E1%BB%B1_Ph%C3%B2ng_w6wafm.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745731266/dulieuquy_kd0c8v.jpg",
        "tempo": 95,
        "mood": "Reflective",
        "key": "G",
        "scale": "major",
        "danceability": 0.68,
        "energy": 0.6,
        "genres": [
          "Pop",
          "R&B",
          "Indie",
          "V-Pop"
        ]
      },
      {
        "title": "Chập Chờn",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745731353/Ch%E1%BA%ADp_Ch%E1%BB%9Dn_akpg6s.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745731266/dulieuquy_kd0c8v.jpg",
        "tempo": 90,
        "mood": "Dreamy",
        "key": "F",
        "scale": "minor",
        "danceability": 0.65,
        "energy": 0.55,
        "genres": [
          "Pop",
          "R&B",
          "Indie",
          "V-Pop"
        ]
      },
      {
        "title": "Mất Kết Nối",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745731355/M%E1%BA%A5t_K%E1%BA%BFt_N%E1%BB%91i_qcxd1j.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745731266/dulieuquy_kd0c8v.jpg",
        "tempo": 85,
        "mood": "Disconnected",
        "key": "C",
        "scale": "minor",
        "danceability": 0.6,
        "energy": 0.52,
        "genres": [
          "Pop",
          "R&B",
          "Indie",
          "V-Pop"
        ]
      },
      {
        "title": "Tràn Bộ Nhớ",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745731355/Tr%C3%A0n_B%E1%BB%99_Nh%E1%BB%9B_ry2ikr.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745731266/dulieuquy_kd0c8v.jpg",
        "tempo": 105,
        "mood": "Overwhelmed",
        "key": "D",
        "scale": "minor",
        "danceability": 0.72,
        "energy": 0.65,
        "genres": [
          "Pop",
          "R&B",
          "Indie",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "GREY D",
    "title": "nhạt-fine (maxi single)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811897/covers/hr1hg3c5bahfejp4yps8.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "nhạt-fine (feat. 52Hz)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811910/tracks/toeoxfc5g4gncabad3fl.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811897/covers/hr1hg3c5bahfejp4yps8.jpg",
        "tempo": 119,
        "mood": "Happy",
        "key": "B",
        "scale": "major",
        "danceability": 0.6541,
        "energy": 0.4302,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "nhạt-fine (blue ver.)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811896/tracks/ndnuptzjjjuqzcjulzqi.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811897/covers/hr1hg3c5bahfejp4yps8.jpg",
        "tempo": 114,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "major",
        "danceability": 0.266,
        "energy": 0.1469,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "GREY D",
    "title": "GREY Dimension - live from GENfest 23",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "có hẹn với thanh xuân - live from GENfest 23",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811170/tracks/gz16h3j0uav4tnsvo0xq.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
        "tempo": 128,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.3911,
        "energy": 0.2672,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "tình yêu chậm trễ (live piano ver.)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811151/tracks/ditbldpgwvcl6qd71clf.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
        "tempo": 95,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.4237,
        "energy": 0.0975,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "dự báo thời tiết hôm nay mưa - live from GENfest 23",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811146/tracks/ig7upz6mpfugqb4ojh2v.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
        "tempo": 98,
        "mood": "Moderate",
        "key": "G#",
        "scale": "minor",
        "danceability": 0.2296,
        "energy": 0.4841,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "giữ lấy làm gì - live from GENfest 23",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811141/tracks/dkc1oglk6pmwkqq5keyk.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
        "tempo": 97,
        "mood": "Happy",
        "key": "C#",
        "scale": "major",
        "danceability": 0.6273,
        "energy": 0.4771,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "đưa em về nhàa - live from GENfest 23",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811136/tracks/hysooje5tcxfdhceegmu.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
        "tempo": 91,
        "mood": "Calm",
        "key": "A#",
        "scale": "minor",
        "danceability": 0.1547,
        "energy": 0.3155,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "vaicaunoicokhiennguoithaydoi - live from GENfest 23",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811163/tracks/f2h7qk0e9e6ehdcr9bm0.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
        "tempo": 113,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.3271,
        "energy": 0.0876,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "badadu - live from GENfest 23",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811156/tracks/lwpsbebsngj0rqstuxbp.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811137/covers/npqnr7vafkfgrnvx90lj.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "D",
        "scale": "minor",
        "danceability": 0.1603,
        "energy": 0.0638,
        "genres": [
          "Instrumental",
          "Lo-fi"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "GREY D",
    "title": "dự báo thời tiết hôm nay mưa - Maxi Single (storm version)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811109/covers/eic6rxppgypp0nc5kclq.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "dự báo thời tiết hôm nay mưa - storm version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811112/tracks/ft1r0wokbsuu5ejporvz.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811109/covers/eic6rxppgypp0nc5kclq.jpg",
        "tempo": 97,
        "mood": "Calm",
        "key": "C#",
        "scale": "minor",
        "danceability": 0.3449,
        "energy": 0.3078,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "vaicaunoicokhiennguoithaydoi - storm version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811117/tracks/bxatt3wwerhwhfjtj8uz.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811109/covers/eic6rxppgypp0nc5kclq.jpg",
        "tempo": 113,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.355,
        "energy": 0.1198,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "tỉnh thức sau giấc ngủ đông - storm version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811107/tracks/euxmbuirzvz0ncgyclqt.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811109/covers/eic6rxppgypp0nc5kclq.jpg",
        "tempo": 88,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.2029,
        "energy": 0.0649,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "GREY D",
    "title": "dự báo thời tiết hôm nay mưa - Maxi Single",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811087/covers/obau2kuhdmow7x3qvoko.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "tỉnh thức sau giấc ngủ đông",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811085/tracks/cnwyxp1gtfx1gtft0bkk.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811087/covers/obau2kuhdmow7x3qvoko.jpg",
        "tempo": 92,
        "mood": "Melancholic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.186,
        "energy": 0.0579,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "dự báo thời tiết hôm nay mưa",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811090/tracks/ktvcaim7bxuphvhy8eiy.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811087/covers/obau2kuhdmow7x3qvoko.jpg",
        "tempo": 89,
        "mood": "Melancholic",
        "key": "C#",
        "scale": "minor",
        "danceability": 0.326,
        "energy": 0.2793,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "vaicaunoicokhiennguoithaydoi",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811099/tracks/ivjlgyuoxr3yeka6jfvo.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811087/covers/obau2kuhdmow7x3qvoko.jpg",
        "tempo": 98,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.4726,
        "energy": 0.0697,
        "genres": [
          "Country"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Kai Đinh",
    "title": "winter warmer",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811979/covers/qfhcd5kbizpsek8xbpca.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "tinhdau tinhdau tinhdau",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811994/tracks/y2ozhgxnvovqyzmq2bk0.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811979/covers/qfhcd5kbizpsek8xbpca.jpg",
        "tempo": 75,
        "mood": "Melancholic",
        "key": "B",
        "scale": "major",
        "danceability": 0.5521,
        "energy": 0.2917,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "để tôi ôm em bằng giai điệu này",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811978/tracks/f71ipg6tbnzxfsfgkuac.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811979/covers/qfhcd5kbizpsek8xbpca.jpg",
        "tempo": 88,
        "mood": "Melancholic",
        "key": "E",
        "scale": "major",
        "danceability": 0.5889,
        "energy": 0.2178,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Lệ Quyên",
    "title": "Khúc Tình Xưa 2",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802501/covers/xtd68efgf8qvfuvbjcar.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Trả Lại Thời Gian",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802500/tracks/dldvpjlaxhzpk8dxxv9z.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802501/covers/xtd68efgf8qvfuvbjcar.jpg",
        "tempo": 86,
        "mood": "Moderate",
        "key": "F",
        "scale": "minor",
        "danceability": 0.468,
        "energy": 0.365,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      },
      {
        "title": "Sầu Tím Thiệp Hồng",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802522/tracks/h5nsbilqyrv35zl7sblg.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802501/covers/xtd68efgf8qvfuvbjcar.jpg",
        "tempo": 84,
        "mood": "Moderate",
        "key": "D",
        "scale": "minor",
        "danceability": 0.4633,
        "energy": 0.4417,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Lệ Quyên",
    "title": "Khúc Tình Xưa 1",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802404/covers/eoczjm7th0wzkhqgpufh.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Tình Lỡ",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802403/tracks/tqtruyc0nzu8ocd69avf.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802404/covers/eoczjm7th0wzkhqgpufh.jpg",
        "tempo": 60,
        "mood": "Melancholic",
        "key": "Eb",
        "scale": "minor",
        "danceability": 0.4175,
        "energy": 0.1766,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      },
      {
        "title": "Tình Đời",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802462/tracks/m2qsulh9u0mzpqse2zkp.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802404/covers/eoczjm7th0wzkhqgpufh.jpg",
        "tempo": 62,
        "mood": "Moderate",
        "key": "B",
        "scale": "minor",
        "danceability": 0.5129,
        "energy": 0.3648,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      },
      {
        "title": "Sầu Lẻ Bóng",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802441/tracks/kyz3v5i6em3weq4mo5qj.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802404/covers/eoczjm7th0wzkhqgpufh.jpg",
        "tempo": 84,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.4454,
        "energy": 0.2437,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Low G",
    "title": "FLVR",
    "coverUrl": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743437224/testAlbum/tlinh%2C%20Low%20G/FLVR/oxz6tyeukjvo9lkcfw51.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [
      "Hip-Hop",
      "V-Pop",
      "Rap"
    ],
    "releaseDate": new Date('2025-04-17'),
    "tracks": [
      {
        "title": "PHÓNG ZÌN ZÌN",
        "audioUrl": "https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437384/testAlbum/tlinh%2C%20Low%20G/FLVR/vqv3bigkrhgob2diijnu.mp3",
        "trackNumber": 1,
        "featuredArtists": [
          "tlinh"
        ],
        "coverUrl": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743437224/testAlbum/tlinh%2C%20Low%20G/FLVR/oxz6tyeukjvo9lkcfw51.jpg",
        "tempo": 135,
        "mood": "Intense",
        "key": "D",
        "scale": "minor",
        "danceability": 0.9,
        "energy": 0.92,
        "genres": [
          "Hip-Hop",
          "V-Pop",
          "Rap"
        ]
      },
      {
        "title": "HOP ON DA SHOW",
        "audioUrl": "https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437358/testAlbum/tlinh%2C%20Low%20G/FLVR/pgdrfb8oux5ub958hrvf.mp3",
        "trackNumber": 2,
        "featuredArtists": [
          "tlinh"
        ],
        "coverUrl": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743437224/testAlbum/tlinh%2C%20Low%20G/FLVR/oxz6tyeukjvo9lkcfw51.jpg",
        "tempo": 140,
        "mood": "Confident",
        "key": "G",
        "scale": "minor",
        "danceability": 0.88,
        "energy": 0.9,
        "genres": [
          "Hip-Hop",
          "V-Pop",
          "Rap"
        ]
      },
      {
        "title": "DÂU TẰM",
        "audioUrl": "https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437229/testAlbum/tlinh%2C%20Low%20G/FLVR/bgsotddidlfj6zrzbtyn.mp3",
        "trackNumber": 3,
        "featuredArtists": [
          "tlinh"
        ],
        "coverUrl": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743437224/testAlbum/tlinh%2C%20Low%20G/FLVR/oxz6tyeukjvo9lkcfw51.jpg",
        "tempo": 130,
        "mood": "Energetic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.85,
        "energy": 0.8,
        "genres": [
          "Hip-Hop",
          "V-Pop",
          "Rap"
        ]
      },
      {
        "title": "NGÂN",
        "audioUrl": "https://res.cloudinary.com/dsw1dm5ka/video/upload/v1743437334/testAlbum/tlinh%2C%20Low%20G/FLVR/ntlvaidfotjbmw9rxg3z.mp3",
        "trackNumber": 4,
        "featuredArtists": [
          "tlinh"
        ],
        "coverUrl": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743437224/testAlbum/tlinh%2C%20Low%20G/FLVR/oxz6tyeukjvo9lkcfw51.jpg",
        "tempo": 125,
        "mood": "Smooth",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.8,
        "energy": 0.75,
        "genres": [
          "Hip-Hop",
          "V-Pop",
          "Rap"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "MONO",
    "title": "22",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Anh Không Thể",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810713/tracks/x60tz4irl13gbindjokz.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 52,
        "mood": "Melancholic",
        "key": "F",
        "scale": "major",
        "danceability": 0.4817,
        "energy": 0.2047,
        "genres": [
          "Ballad",
          "V-Pop",
          "Indie"
        ]
      },
      {
        "title": "Do You",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810727/tracks/dg8zeti2kct5337jbdsr.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 95,
        "mood": "Calm",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.4846,
        "energy": 0.3342,
        "genres": [
          "Blues"
        ]
      },
      {
        "title": "MONOlogue",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810699/tracks/rslk0k70a5eoeqaqj06p.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 119,
        "mood": "Melancholic",
        "key": "A",
        "scale": "major",
        "danceability": 0.3718,
        "energy": 0.188,
        "genres": [
          "Folk",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Cô nương Ahhhh~",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810751/tracks/yjcisd5noxyxiefhyma7.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 84,
        "mood": "Energetic",
        "key": "C",
        "scale": "major",
        "danceability": 0.544,
        "energy": 0.7326,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Quên Anh Đi",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810679/tracks/vw43elngdeonyxgcvnxp.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 96,
        "mood": "Melancholic",
        "key": "Ab",
        "scale": "minor",
        "danceability": 0.3978,
        "energy": 0.2943,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Waiting For You",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810773/tracks/esn7z9e52tbayfwwrc5h.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 75,
        "mood": "Moderate",
        "key": "F",
        "scale": "major",
        "danceability": 0.5311,
        "energy": 0.419,
        "genres": [
          "Alternative",
          "Rap",
          "Hip-Hop"
        ]
      },
      {
        "title": "L.I.E",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810801/tracks/brxlogxehvp4u3bcxmpq.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 78,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.3731,
        "energy": 0.2142,
        "genres": [
          "Jazz"
        ]
      },
      {
        "title": "Kill Me",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810664/tracks/chkdj3jkxqow6crgp58l.mp3",
        "trackNumber": 8,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 105,
        "mood": "Melancholic",
        "key": "Eb",
        "scale": "major",
        "danceability": 0.585,
        "energy": 0.2937,
        "genres": [
          "Alternative",
          "Rap",
          "Hip-Hop"
        ]
      },
      {
        "title": "Em Là",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810634/tracks/kt4cv3rmrmg43b4gbbmi.mp3",
        "trackNumber": 9,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.3635,
        "energy": 0.148,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Buông",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810620/tracks/mztpfqxcxlbfduz7urid.mp3",
        "trackNumber": 10,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810622/covers/s77qttpmnoih3kjp741a.jpg",
        "tempo": 72,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.612,
        "energy": 0.2706,
        "genres": [
          "Ballad",
          "V-Pop",
          "Indie"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "MONO",
    "title": "ĐẸP",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277957/s9htcpunfrmtv4rks2op_dbwgb7.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-01-31'),
    "tracks": [
      {
        "title": "Intro",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277976/Intro_ofgkdq.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277957/s9htcpunfrmtv4rks2op_dbwgb7.jpg",
        "tempo": 80,
        "mood": "Atmospheric",
        "key": "F",
        "scale": "major",
        "danceability": 0.45,
        "energy": 0.4,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Cười Lên",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277973/C%C6%B0%E1%BB%9Di_L%C3%AAn_yx80yr.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277957/s9htcpunfrmtv4rks2op_dbwgb7.jpg",
        "tempo": 115,
        "mood": "Uplifting",
        "key": "G",
        "scale": "major",
        "danceability": 0.8,
        "energy": 0.75,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Em Xinh",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277973/Em_Xinh_e56kir.mp3",
        "trackNumber": 3,
        "featuredArtists": [
          "Onionn"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277957/s9htcpunfrmtv4rks2op_dbwgb7.jpg",
        "tempo": 105,
        "mood": "Admiring",
        "key": "C",
        "scale": "major",
        "danceability": 0.75,
        "energy": 0.7,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Open Your Eyes",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277976/Open_Your_Eyes_svtz3v.mp3",
        "trackNumber": 4,
        "featuredArtists": [
          "Onionn"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277957/s9htcpunfrmtv4rks2op_dbwgb7.jpg",
        "tempo": 110,
        "mood": "Inspirational",
        "key": "A",
        "scale": "major",
        "danceability": 0.78,
        "energy": 0.75,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Young",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277974/Young_wcisev.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277957/s9htcpunfrmtv4rks2op_dbwgb7.jpg",
        "tempo": 120,
        "mood": "Youthful",
        "key": "D",
        "scale": "major",
        "danceability": 0.85,
        "energy": 0.8,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "My Anh",
    "title": "Got You (The Heroes Version)",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852133/covers/s0phbb7vtm0860z1u5as.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-10'),
    "tracks": [
      {
        "title": "Got You",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852132/tracks/vf9avtojrvkj4nr7uudx.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852133/covers/s0phbb7vtm0860z1u5as.jpg",
        "tempo": 107,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.4936,
        "genres": [
          "Country"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Mỹ Tâm",
    "title": "Bolero Edition",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802310/covers/dhhxgaigky1u2qwrjx31.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Hoa Trinh Nữ",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802309/tracks/qhxbbaei2lgdzmeinjif.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802310/covers/dhhxgaigky1u2qwrjx31.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.4409,
        "energy": 0.2678,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      },
      {
        "title": "Xin Thời Gian Qua Mau",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802361/tracks/gbxlsxnsqo1wvqkpyvlf.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802310/covers/dhhxgaigky1u2qwrjx31.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "G",
        "scale": "minor",
        "danceability": 0.463,
        "energy": 0.2257,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      },
      {
        "title": "Đôi Mắt Người Xưa",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746802338/tracks/q3oeljan3xawqr7bmzod.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746802310/covers/dhhxgaigky1u2qwrjx31.jpg",
        "tempo": 86,
        "mood": "Moderate",
        "key": "Ab",
        "scale": "minor",
        "danceability": 0.3674,
        "energy": 0.3891,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "sapientdream",
    "title": "Past Lives (The Chainsmokers Remix)",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852413/covers/qvx4v20pptaigyilbqrn.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-10'),
    "tracks": [
      {
        "title": "Past Lives - The Chainsmokers Remix",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852412/tracks/r5ufigfoku522xok8jlw.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852413/covers/qvx4v20pptaigyilbqrn.jpg",
        "tempo": 128,
        "mood": "Energetic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.8109,
        "energy": 0.6076,
        "genres": [
          "Dance",
          "Disco"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Shayda",
    "title": "FOUR",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [
      "Pop",
      "R&B"
    ],
    "releaseDate": new Date('2025-01-17'),
    "tracks": [
      {
        "title": "Face Out",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279932/Face_Out_tuzx6i.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 120,
        "mood": "Assertive",
        "key": "E",
        "scale": "minor",
        "danceability": 0.78,
        "energy": 0.75,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Change",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279930/Change_wodzpx.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 105,
        "mood": "Transformative",
        "key": "A",
        "scale": "major",
        "danceability": 0.75,
        "energy": 0.7,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Her",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279926/Her_ihixgz.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 88,
        "mood": "Tender",
        "key": "D",
        "scale": "major",
        "danceability": 0.6,
        "energy": 0.55,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Kill Me",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279925/Kill_Me_d81ifb.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 115,
        "mood": "Dark",
        "key": "B",
        "scale": "minor",
        "danceability": 0.75,
        "energy": 0.82,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Fuck Off",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279882/Fuck_Off_bwlkgg.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 125,
        "mood": "Defiant",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.82,
        "energy": 0.88,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Deep",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279872/Deep_efc5xm.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 95,
        "mood": "Introspective",
        "key": "F",
        "scale": "minor",
        "danceability": 0.65,
        "energy": 0.6,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Fight",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279873/Fight_fpnp4q.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 128,
        "mood": "Fierce",
        "key": "G",
        "scale": "minor",
        "danceability": 0.8,
        "energy": 0.85,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "How Come ?",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279930/How_Come_giwyhd.mp3",
        "trackNumber": 8,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 95,
        "mood": "Questioning",
        "key": "G",
        "scale": "minor",
        "danceability": 0.68,
        "energy": 0.62,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Myself",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279875/Myself_mtvhug.mp3",
        "trackNumber": 9,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 90,
        "mood": "Reflective",
        "key": "C",
        "scale": "major",
        "danceability": 0.62,
        "energy": 0.58,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "BADAK",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279879/BADAK_nbwxcx.mp3",
        "trackNumber": 10,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 135,
        "mood": "Aggressive",
        "key": "A",
        "scale": "minor",
        "danceability": 0.85,
        "energy": 0.9,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Love Yaaa",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279933/Love_Yaaa_n9uy5o.mp3",
        "trackNumber": 11,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 98,
        "mood": "Affectionate",
        "key": "C",
        "scale": "major",
        "danceability": 0.72,
        "energy": 0.65,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Heaven-Sent",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279878/Heaven-Sent_rbml79.mp3",
        "trackNumber": 12,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 100,
        "mood": "Ethereal",
        "key": "E",
        "scale": "major",
        "danceability": 0.7,
        "energy": 0.65,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Grateful To Us",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279945/Grateful_To_Us_dr2lov.mp3",
        "trackNumber": 13,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 85,
        "mood": "Thankful",
        "key": "D",
        "scale": "major",
        "danceability": 0.65,
        "energy": 0.6,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Tease My Lover",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279939/Tease_My_Lover_tq6lcq.mp3",
        "trackNumber": 14,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 115,
        "mood": "Flirtatious",
        "key": "F",
        "scale": "major",
        "danceability": 0.85,
        "energy": 0.75,
        "genres": [
          "Pop",
          "R&B"
        ]
      },
      {
        "title": "Get Closer",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279871/Get_Closer_tg61oi.mp3",
        "trackNumber": 15,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279869/FOUR_tn54uj_yenbgf.webp",
        "tempo": 110,
        "mood": "Intimate",
        "key": "D",
        "scale": "major",
        "danceability": 0.78,
        "energy": 0.72,
        "genres": [
          "Pop",
          "R&B"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Shiki",
    "title": "Lặng",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [
      "Indie",
      "V-Pop",
      "Lo-fi"
    ],
    "releaseDate": new Date('2025-03-02'),
    "tracks": [
      {
        "title": "Anh Vẫn Đợi",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278547/Anh_V%E1%BA%ABn_%C4%90%E1%BB%A3i_fesftl.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
        "tempo": 75,
        "mood": "Patient",
        "key": "C",
        "scale": "minor",
        "danceability": 0.48,
        "energy": 0.4,
        "genres": [
          "Indie",
          "V-Pop",
          "Lo-fi"
        ]
      },
      {
        "title": "Lặng",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278549/L%E1%BA%B7ng_cjpemv.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
        "tempo": 70,
        "mood": "Quiet",
        "key": "D",
        "scale": "minor",
        "danceability": 0.42,
        "energy": 0.3,
        "genres": [
          "Indie",
          "V-Pop",
          "Lo-fi"
        ]
      },
      {
        "title": "1000 Ánh Mắt",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278547/1000_%C3%81nh_M%E1%BA%AFt_kur2fn.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
        "tempo": 85,
        "mood": "Dreamy",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.6,
        "energy": 0.45,
        "genres": [
          "Indie",
          "V-Pop",
          "Lo-fi"
        ]
      },
      {
        "title": "Perfect",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278551/Perfect_yhyrok.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
        "tempo": 95,
        "mood": "Serene",
        "key": "G",
        "scale": "major",
        "danceability": 0.65,
        "energy": 0.5,
        "genres": [
          "Indie",
          "V-Pop",
          "Lo-fi"
        ]
      },
      {
        "title": "Có Đôi Điều",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278553/C%C3%B3_%C4%90%C3%B4i_%C4%90i%E1%BB%81u_sujo0g.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
        "tempo": 90,
        "mood": "Contemplative",
        "key": "A",
        "scale": "minor",
        "danceability": 0.55,
        "energy": 0.48,
        "genres": [
          "Indie",
          "V-Pop",
          "Lo-fi"
        ]
      },
      {
        "title": "Night Time",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278550/Night_Time_r292qy.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
        "tempo": 80,
        "mood": "Ambient",
        "key": "E",
        "scale": "minor",
        "danceability": 0.58,
        "energy": 0.4,
        "genres": [
          "Indie",
          "V-Pop",
          "Lo-fi"
        ]
      },
      {
        "title": "Take Off Your Hands",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746278552/Take_Off_Your_Hands_n9hon1.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746278544/c4n2z5lw7j38cevdcjwn_r9eeoy.jpg",
        "tempo": 88,
        "mood": "Melancholic",
        "key": "B",
        "scale": "minor",
        "danceability": 0.62,
        "energy": 0.45,
        "genres": [
          "Indie",
          "V-Pop",
          "Lo-fi"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Sơn Tùng M-TP",
    "title": "SKY DECADE",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-02-25'),
    "tracks": [
      {
        "title": "Như Ngày Hôm Qua",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Nh%C6%B0_Ng%C3%A0y_H%C3%B4m_Qua_vytwoj.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 120,
        "mood": "Upbeat",
        "key": "F",
        "scale": "major",
        "danceability": 0.82,
        "energy": 0.75,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Không Phải Dạng Vừa Đâu",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721272/Kh%C3%B4ng_Ph%E1%BA%A3i_D%E1%BA%A1ng_V%E1%BB%ABa_%C4%90%C3%A2u_cygu7r.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 140,
        "mood": "Confident",
        "key": "A",
        "scale": "minor",
        "danceability": 0.88,
        "energy": 0.92,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Intro 2022",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745720915/Intro_2022_fiw56y.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 90,
        "mood": "Cinematic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.4,
        "energy": 0.45,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Buông Đôi Tay Nhau Ra",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Bu%C3%B4ng_%C4%90%C3%B4i_Tay_Nhau_Ra_sjwdvv.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 95,
        "mood": "Heartbroken",
        "key": "C",
        "scale": "minor",
        "danceability": 0.68,
        "energy": 0.62,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Chắc Ai Đó Sẽ Về",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721273/Ch%E1%BA%AFc_Ai_%C4%90%C3%B3_S%E1%BA%BD_V%E1%BB%81_ygjdiq.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 75,
        "mood": "Sad",
        "key": "E",
        "scale": "minor",
        "danceability": 0.55,
        "energy": 0.48,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Nắng Ấm Xa Dần",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/N%E1%BA%AFng_%E1%BA%A4m_Xa_D%E1%BA%A7n_formje.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 95,
        "mood": "Melancholic",
        "key": "G",
        "scale": "minor",
        "danceability": 0.7,
        "energy": 0.65,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Thái Bình Mồ Hôi Rơi",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721283/Th%C3%A1i_B%C3%ACnh_M%E1%BB%93_H%C3%B4i_R%C6%A1i_pxt49y.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 130,
        "mood": "Determined",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.82,
        "energy": 0.78,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Âm Thầm Bên Em",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721273/%C3%82m_Th%E1%BA%A7m_B%C3%AAn_Em_irif9v.mp3",
        "trackNumber": 8,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 110,
        "mood": "Romantic",
        "key": "A",
        "scale": "major",
        "danceability": 0.75,
        "energy": 0.68,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Ấn Nút Nhớ... Thả Giấc Mơ",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721272/%E1%BA%A4n_N%C3%BAt_Nh%E1%BB%9B..._Th%E1%BA%A3_Gi%E1%BA%A5c_M%C6%A1_xdffps.mp3",
        "trackNumber": 9,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 80,
        "mood": "Dreamy",
        "key": "D",
        "scale": "major",
        "danceability": 0.6,
        "energy": 0.52,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Tiến Lên Việt Nam Ơi",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Ti%E1%BA%BFn_L%C3%AAn_Vi%E1%BB%87t_Nam_%C6%A0i_eojbzk.mp3",
        "trackNumber": 10,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 130,
        "mood": "Patriotic",
        "key": "G",
        "scale": "major",
        "danceability": 0.9,
        "energy": 0.95,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Nắng Ấm Ngang Qua",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745720932/N%E1%BA%AFng_%E1%BA%A4m_Ngang_Qua_k4pttn.mp3",
        "trackNumber": 11,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 125,
        "mood": "Bright",
        "key": "E",
        "scale": "major",
        "danceability": 0.85,
        "energy": 0.8,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Special Thanks",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745720924/Special_Thanks_piuhdr.mp3",
        "trackNumber": 12,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 95,
        "mood": "Grateful",
        "key": "D",
        "scale": "major",
        "danceability": 0.6,
        "energy": 0.55,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Anh Sai Rồi",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721282/Anh_Sai_R%E1%BB%93i_drr2vl.mp3",
        "trackNumber": 13,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 82,
        "mood": "Regretful",
        "key": "D",
        "scale": "minor",
        "danceability": 0.62,
        "energy": 0.55,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Remember Me - SlimV Remix",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/Remember_Me_-_SlimV_Remix_g1xgkr.mp3",
        "trackNumber": 14,
        "featuredArtists": [
          "SlimV"
        ],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 140,
        "mood": "Electronic",
        "key": "D",
        "scale": "minor",
        "danceability": 0.95,
        "energy": 0.9,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Nơi Này Có Anh",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/N%C6%A1i_N%C3%A0y_C%C3%B3_Anh_frmpnq.mp3",
        "trackNumber": 15,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 110,
        "mood": "Romantic",
        "key": "D",
        "scale": "major",
        "danceability": 0.88,
        "energy": 0.75,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Chúng Ta Không Thuộc Về Nhau",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/Ch%C3%BAng_Ta_Kh%C3%B4ng_Thu%E1%BB%99c_V%E1%BB%81_Nhau_z9tbg2.mp3",
        "trackNumber": 16,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 125,
        "mood": "Defiant",
        "key": "E",
        "scale": "minor",
        "danceability": 0.85,
        "energy": 0.82,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Một Năm Mới Bình An",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721270/M%E1%BB%99t_N%C4%83m_M%E1%BB%9Bi_B%C3%ACnh_An_flycac.mp3",
        "trackNumber": 17,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 100,
        "mood": "Festive",
        "key": "G",
        "scale": "major",
        "danceability": 0.78,
        "energy": 0.8,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Em Của Ngày Hôm Qua",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721273/Em_C%E1%BB%A7a_Ng%C3%A0y_H%C3%B4m_Qua_awezus.mp3",
        "trackNumber": 18,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 125,
        "mood": "Nostalgic",
        "key": "C",
        "scale": "major",
        "danceability": 0.78,
        "energy": 0.72,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Cơn Mưa Ngang Qua",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721272/C%C6%A1n_M%C6%B0a_Ngang_Qua_j6fwmt.mp3",
        "trackNumber": 19,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 128,
        "mood": "Energetic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.85,
        "energy": 0.8,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Khuôn Mặt Đáng Thương",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745721271/Khu%C3%B4n_M%E1%BA%B7t_%C4%90%C3%A1ng_Th%C6%B0%C6%A1ng_ulstlp.mp3",
        "trackNumber": 20,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 85,
        "mood": "Tender",
        "key": "B",
        "scale": "minor",
        "danceability": 0.65,
        "energy": 0.55,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Cơn Mưa Xa Dần",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745720920/C%C6%A1n_M%C6%B0a_Xa_D%E1%BA%A7n_ybhkn5.mp3",
        "trackNumber": 21,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745720896/skydecade_y0e9e2.jpg",
        "tempo": 110,
        "mood": "Nostalgic",
        "key": "G",
        "scale": "major",
        "danceability": 0.75,
        "energy": 0.7,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "SOOBIN",
    "title": "The Playah",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745730233/theplayah_bsvorq.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [
      "Pop",
      "R&B",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-03-20'),
    "tracks": [
      {
        "title": "BLACKJACK",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745729921/BLACKJACK_cpv6nz.mp3",
        "trackNumber": 1,
        "featuredArtists": [
          "Binz"
        ],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745730233/theplayah_bsvorq.jpg",
        "tempo": 130,
        "mood": "Confident",
        "key": "G",
        "scale": "minor",
        "danceability": 0.9,
        "energy": 0.85,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      },
      {
        "title": "Trò Chơi",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745729932/Tr%C3%B2_Ch%C6%A1i_uv2orf.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745730233/theplayah_bsvorq.jpg",
        "tempo": 115,
        "mood": "Playful",
        "key": "F",
        "scale": "minor",
        "danceability": 0.85,
        "energy": 0.8,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      },
      {
        "title": "Tháng Năm",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745729929/Th%C3%A1ng_N%C4%83m_pjozzp.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745730233/theplayah_bsvorq.jpg",
        "tempo": 95,
        "mood": "Nostalgic",
        "key": "D",
        "scale": "major",
        "danceability": 0.7,
        "energy": 0.65,
        "genres": [
          "Pop",
          "R&B",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "SOOBIN",
    "title": "BẬT NÓ LÊN",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-01-02'),
    "tracks": [
      {
        "title": "Lu Mờ",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277351/Lu_M%E1%BB%9D_feat._Kris_V_d3gohk.mp3",
        "trackNumber": 1,
        "featuredArtists": [
          "Kris V"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 110,
        "mood": "Hazy",
        "key": "G",
        "scale": "minor",
        "danceability": 0.8,
        "energy": 0.72,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Bật Nó Lên",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277348/B%E1%BA%ADt_N%C3%B3_L%C3%AAn_vrlrla.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 128,
        "mood": "Energetic",
        "key": "C",
        "scale": "major",
        "danceability": 0.9,
        "energy": 0.85,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Sunset In the City - Deluxe Version",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277347/Sunset_In_The_City_-_Deluxe_Version_iuzgxj.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 110,
        "mood": "Chill",
        "key": "D",
        "scale": "major",
        "danceability": 0.75,
        "energy": 0.7,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Ai Mà Biết Được",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277347/Ai_M%C3%A0_Bi%E1%BA%BFt_%C4%90%C6%B0%E1%BB%A3c_feat._tlinh_zpz4la.mp3",
        "trackNumber": 4,
        "featuredArtists": [
          "tlinh"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 115,
        "mood": "Curious",
        "key": "E",
        "scale": "minor",
        "danceability": 0.82,
        "energy": 0.75,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "giá như",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277349/gi%C3%A1_nh%C6%B0_yni3lm.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 80,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.55,
        "energy": 0.48,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Intro",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277346/Intro_ywaskk.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 90,
        "mood": "Atmospheric",
        "key": "C",
        "scale": "minor",
        "danceability": 0.5,
        "energy": 0.55,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "DANCING IN THE DARK",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277346/DANCING_IN_THE_DARK_ttd4m7.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 125,
        "mood": "Mysterious",
        "key": "G",
        "scale": "minor",
        "danceability": 0.88,
        "energy": 0.8,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Luật Anh",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277350/Lu%E1%BA%ADt_Anh_feat._Andree_Right_Hand_aafw1m.mp3",
        "trackNumber": 8,
        "featuredArtists": [
          "Andree Right Hand"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 130,
        "mood": "Confident",
        "key": "D",
        "scale": "minor",
        "danceability": 0.88,
        "energy": 0.85,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Heyyy",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277350/Heyyy_tafehi.mp3",
        "trackNumber": 9,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 118,
        "mood": "Flirtatious",
        "key": "Bb",
        "scale": "major",
        "danceability": 0.85,
        "energy": 0.78,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "Sẽ Quên Em Nhanh Thôi",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746277346/S%E1%BA%BD_Qu%C3%AAn_Em_Nhanh_Th%C3%B4i_lonmak.mp3",
        "trackNumber": 10,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277397/BatNoLen_vzakod.jpg",
        "tempo": 95,
        "mood": "Resolute",
        "key": "A",
        "scale": "minor",
        "danceability": 0.65,
        "energy": 0.62,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "SUNI",
    "title": "Hương Mùa Hè EP.01",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811176/covers/cjdusyjsvdpg8zp5i107.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "khi cô đơn em nhớ đến ai",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811194/tracks/cis2ydoykdq2id9n6efo.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811176/covers/cjdusyjsvdpg8zp5i107.jpg",
        "tempo": 138,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.5012,
        "energy": 0.1495,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "vaicaunoicokhiennguoithaydoi - Acoustic",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811189/tracks/lg3a11fkaeumunneqddz.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811176/covers/cjdusyjsvdpg8zp5i107.jpg",
        "tempo": 86,
        "mood": "Melancholic",
        "key": "G#",
        "scale": "minor",
        "danceability": 0.4033,
        "energy": 0.1242,
        "genres": [
          "Folk",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "thích em hơi nhiều",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811180/tracks/zjhi3zv4xv7i1qj0l09u.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811176/covers/cjdusyjsvdpg8zp5i107.jpg",
        "tempo": 97,
        "mood": "Melancholic",
        "key": "D",
        "scale": "minor",
        "danceability": 0.4946,
        "energy": 0.0516,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "tóc ngắn",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811184/tracks/nluqua0td6irlvdubaov.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811176/covers/cjdusyjsvdpg8zp5i107.jpg",
        "tempo": 96,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.4536,
        "energy": 0.1355,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "vào hạ",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811175/tracks/srwr5t8s6f0ogdamj6s2.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811176/covers/cjdusyjsvdpg8zp5i107.jpg",
        "tempo": 108,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.5103,
        "energy": 0.1298,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "T.R.I",
    "title": "THE RECAP",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813051/covers/owlgoyouvgtptc607tiq.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Lặng Im Và Tan Vỡ - The Recap",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813059/tracks/lscy4tdt8zvcps5z48w5.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813051/covers/owlgoyouvgtptc607tiq.jpg",
        "tempo": 88,
        "mood": "Melancholic",
        "key": "G",
        "scale": "minor",
        "danceability": 0.4247,
        "energy": 0.0081,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Một Bài Hát Không Vui Mấy - The Recap",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813065/tracks/psr9e0o8ntsdmmbwf49j.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813051/covers/owlgoyouvgtptc607tiq.jpg",
        "tempo": 94,
        "mood": "Melancholic",
        "key": "C#",
        "scale": "minor",
        "danceability": 0.4994,
        "energy": 0.1954,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Trở Thành Quá Khứ - The Recap",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813055/tracks/gtv1l8cxlq5caqz3icmx.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813051/covers/owlgoyouvgtptc607tiq.jpg",
        "tempo": 91,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.438,
        "energy": 0.0171,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Lễ Đường Của Em - The Recap",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813050/tracks/tdyefe72nyinezqt629n.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813051/covers/owlgoyouvgtptc607tiq.jpg",
        "tempo": 113,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.5285,
        "energy": 0.0839,
        "genres": [
          "Ballad",
          "V-Pop",
          "Indie"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "T.R.I",
    "title": "Sau Chia Tay...Ai Cũng Khác",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813036/covers/eycjky7bntja31jvcuyo.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Sau Chia Tay... Ai Cũng Khác",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813035/tracks/kod5lddel3y84sr87nby.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813036/covers/eycjky7bntja31jvcuyo.jpg",
        "tempo": 93,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.3202,
        "energy": 0.0532,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "Sau Chia Tay... Ai Cũng Khác - Beat Version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813040/tracks/me9nbtxjrb6gteeixqf9.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813036/covers/eycjky7bntja31jvcuyo.jpg",
        "tempo": 93,
        "mood": "Melancholic",
        "key": "D#",
        "scale": "minor",
        "danceability": 0.316,
        "energy": 0.0468,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "T.R.I",
    "title": "một bài hát không vui mấy (Sad Version)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813012/covers/ynu8ljsxqdtyouwity2k.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "một bài hát không vui mấy - Sad Version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813010/tracks/v8jqiwe39xrdmvg7gfaa.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813012/covers/ynu8ljsxqdtyouwity2k.jpg",
        "tempo": 95,
        "mood": "Melancholic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.4268,
        "energy": 0.0668,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "T.R.I",
    "title": "Làm Lại",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812985/covers/ufzvvsarepytnu59nhpe.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "trở thành quá khứ (Làm Lại)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812988/tracks/umq85pvuwrbfh6tgukes.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812985/covers/ufzvvsarepytnu59nhpe.jpg",
        "tempo": 98,
        "mood": "Melancholic",
        "key": "D#",
        "scale": "minor",
        "danceability": 0.4482,
        "energy": 0.1579,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "lặng im và tan vỡ (Làm Lại)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812984/tracks/pvmp5vj7elwsv0nax903.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812985/covers/ufzvvsarepytnu59nhpe.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "D#",
        "scale": "minor",
        "danceability": 0.4958,
        "energy": 0.1925,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "T.R.I",
    "title": "bíc iu",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "hơi ngại",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812773/tracks/nbrshltlscpq4pflqmim.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
        "tempo": 123,
        "mood": "Moderate",
        "key": "F",
        "scale": "minor",
        "danceability": 0.477,
        "energy": 0.3636,
        "genres": [
          "Ballad",
          "V-Pop",
          "Indie"
        ]
      },
      {
        "title": "bướngg",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812836/tracks/pndhpgm7q8chzvkqif6p.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
        "tempo": 161,
        "mood": "Happy",
        "key": "G",
        "scale": "minor",
        "danceability": 0.6478,
        "energy": 0.3214,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "si mê",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812777/tracks/zrjm8mmz9qle4etzti4o.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
        "tempo": 83,
        "mood": "Calm",
        "key": "F",
        "scale": "minor",
        "danceability": 0.4763,
        "energy": 0.3093,
        "genres": [
          "V-Pop",
          "Bolero"
        ]
      },
      {
        "title": "sao phải yêu? (Intro)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812769/tracks/kyzhjb81ojjvle1wqujn.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
        "tempo": 96,
        "mood": "Melancholic",
        "key": "A#",
        "scale": "minor",
        "danceability": 0.5542,
        "energy": 0.4529,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "ra là vậy. (Outro)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812789/tracks/lztc7zr1kdebffpjh94i.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
        "tempo": 95,
        "mood": "Happy",
        "key": "A",
        "scale": "major",
        "danceability": 0.7459,
        "energy": 0.6525,
        "genres": [
          "Pop",
          "V-Pop"
        ]
      },
      {
        "title": "hơi sai",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812785/tracks/pix7togffln50qlx82og.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
        "tempo": 104,
        "mood": "Melancholic",
        "key": "C#",
        "scale": "minor",
        "danceability": 0.5941,
        "energy": 0.2883,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "toihomquaemtuyetlam",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812781/tracks/kzpzfyc2owckpev692ul.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812770/covers/yhnkauht1ogr5mec1n1p.jpg",
        "tempo": 106,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.4574,
        "energy": 0.0955,
        "genres": [
          "Jazz"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "T.R.I",
    "title": "9 8 7 (Piano Version)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812762/covers/ydw1af40by6rpcvhwphq.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "9 8 7 - Piano Version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812761/tracks/p6ykdy40phj13df8zkoh.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812762/covers/ydw1af40by6rpcvhwphq.jpg",
        "tempo": 95,
        "mood": "Melancholic",
        "key": "D#",
        "scale": "minor",
        "danceability": 0.3637,
        "energy": 0.0836,
        "genres": [
          "Jazz"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "The Chainsmokers",
    "title": "No Hard Feelings",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Chainsmokers-No%20Hard%20Feelings&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-10'),
    "tracks": [
      {
        "title": "Green Lights - demo",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852423/tracks/ticgpsbapzsgkciqcryd.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Chainsmokers-No%20Hard%20Feelings&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
        "tempo": 80,
        "mood": "Moderate",
        "key": "C",
        "scale": "major",
        "danceability": 0.4138,
        "energy": 0.3827,
        "genres": [
          "Blues"
        ]
      },
      {
        "title": "Tennis Court",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852441/tracks/uahmpuntqmu992waavkg.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Chainsmokers-No%20Hard%20Feelings&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
        "tempo": 92,
        "mood": "Energetic",
        "key": "C#",
        "scale": "major",
        "danceability": 0.6091,
        "energy": 0.6095,
        "genres": [
          "Soul",
          "R&B"
        ]
      },
      {
        "title": "No Shade at Pitti",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852499/tracks/hwwxn8lpsuhktmu2pi3z.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Chainsmokers-No%20Hard%20Feelings&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
        "tempo": 68,
        "mood": "Melancholic",
        "key": "Bb",
        "scale": "major",
        "danceability": 0.3833,
        "energy": 0.2784,
        "genres": [
          "Folk",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Friday",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852473/tracks/gwrwfducytas0lzcj5ig.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Chainsmokers-No%20Hard%20Feelings&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
        "tempo": 103,
        "mood": "Melancholic",
        "key": "C#",
        "scale": "major",
        "danceability": 0.4307,
        "energy": 0.2953,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "Bad Advice",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852454/tracks/laai1up1duuib1km3j2e.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Chainsmokers-No%20Hard%20Feelings&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
        "tempo": 100,
        "mood": "Melancholic",
        "key": "Ab",
        "scale": "major",
        "danceability": 0.7664,
        "energy": 0.3909,
        "genres": [
          "Soul",
          "R&B"
        ]
      },
      {
        "title": "Addicted (feat. The Chainsmokers & INK)",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852487/tracks/k0dujnac0kyxixbid3zb.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Chainsmokers-No%20Hard%20Feelings&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
        "tempo": 120,
        "mood": "Melancholic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.6127,
        "energy": 0.3521,
        "genres": [
          "Country"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "the cozy lofi",
    "title": "echoes of peace",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "calm waters",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746800965/tracks/uk6rg18kegva5zeznjoo.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 81,
        "mood": "Melancholic",
        "key": "G",
        "scale": "major",
        "danceability": 0.6286,
        "energy": 0.13,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "dreamscape",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746800997/tracks/pqsxjwgiodql1hqqlqt3.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 68,
        "mood": "Melancholic",
        "key": "A",
        "scale": "major",
        "danceability": 0.4726,
        "energy": 0.085,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "lullaby dreams",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746801052/tracks/xulgeh79jkdkn8tpkwb0.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 80,
        "mood": "Melancholic",
        "key": "Eb",
        "scale": "minor",
        "danceability": 0.373,
        "energy": 0.1109,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "relaxation station",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746801101/tracks/svwtgfuwxaddrtlaqlys.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 75,
        "mood": "Melancholic",
        "key": "G",
        "scale": "major",
        "danceability": 0.4791,
        "energy": 0.0908,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "serenity",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746801112/tracks/fghgiauper9cyx7msqw9.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 89,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.4549,
        "energy": 0.0552,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "mindful moments",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746801081/tracks/klzjn6kcivnlc38lfujq.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 70,
        "mood": "Melancholic",
        "key": "G",
        "scale": "major",
        "danceability": 0.5279,
        "energy": 0.1186,
        "genres": [
          "Lo-fi",
          "Jazz"
        ]
      },
      {
        "title": "tranquil nights",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746801127/tracks/ywveh9w6aaa4m3pqinx2.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 82,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.3066,
        "energy": 0.048,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "lofi bliss",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746801027/tracks/vadcyyagezznojjycunx.mp3",
        "trackNumber": 8,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 88,
        "mood": "Melancholic",
        "key": "C",
        "scale": "major",
        "danceability": 0.5264,
        "energy": 0.1262,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "chill waves",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746800979/tracks/rzs5bhzsmjxbuliqnitm.mp3",
        "trackNumber": 9,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746800967/covers/kckbq8hr0rlmigaqvmgr.jpg",
        "tempo": 80,
        "mood": "Melancholic",
        "key": "G",
        "scale": "major",
        "danceability": 0.5206,
        "energy": 0.0732,
        "genres": [
          "Lo-fi",
          "Jazz"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "the cozy lofi",
    "title": "life is a journey",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796505/covers/edfyo9kekhmypadfofii.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "afraid to fail",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796504/tracks/dntsvskufhnndrxy7wre.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796505/covers/edfyo9kekhmypadfofii.jpg",
        "tempo": 80,
        "mood": "Melancholic",
        "key": "G",
        "scale": "minor",
        "danceability": 0.477,
        "energy": 0.1234,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "happiness is a choice",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796553/tracks/twhag7xt40ha2ooqxxuv.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796505/covers/edfyo9kekhmypadfofii.jpg",
        "tempo": 86,
        "mood": "Melancholic",
        "key": "E",
        "scale": "major",
        "danceability": 0.5945,
        "energy": 0.1675,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "good things ahead",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796538/tracks/sjqbdqysd0thjaqab7dx.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796505/covers/edfyo9kekhmypadfofii.jpg",
        "tempo": 85,
        "mood": "Melancholic",
        "key": "Bb",
        "scale": "major",
        "danceability": 0.6121,
        "energy": 0.1496,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "enjoy the ride",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746796524/tracks/m2nob8dam90c5jypaspv.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746796505/covers/edfyo9kekhmypadfofii.jpg",
        "tempo": 97,
        "mood": "Happy",
        "key": "A",
        "scale": "major",
        "danceability": 0.7661,
        "energy": 0.2228,
        "genres": [
          "Instrumental",
          "Lo-fi"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "the cozy lofi",
    "title": "past is past",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746794848/covers/vog66fdpsbuyaspk47kf.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "strings for power",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795238/tracks/e9xsewzjtqhbpcvgzw7f.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795239/covers/wjbw4mxwzjhvwtvyarjq.jpg",
        "tempo": 93,
        "mood": "Happy",
        "key": "G",
        "scale": "major",
        "danceability": 0.6958,
        "energy": 0.1885,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "flow flow",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795262/tracks/zcqs56vbllyx79eb5vps.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795263/covers/tk2x65qgozzotocsaipy.jpg",
        "tempo": 95,
        "mood": "Happy",
        "key": "F",
        "scale": "major",
        "danceability": 0.7563,
        "energy": 0.2132,
        "genres": [
          "Jazz"
        ]
      },
      {
        "title": "still need swing",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795276/tracks/eodbkjfh4e6thepllvwr.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795277/covers/a8esdxlsidb0vdbabsbd.jpg",
        "tempo": 85,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.5506,
        "energy": 0.1106,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "rest sugar",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795361/tracks/gvdp0ry8c0cu8aczcdcw.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795363/covers/g2dntvm7gcr92o2pu03x.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.6828,
        "energy": 0.1919,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "fire and ice",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795351/tracks/ribwbvgfpvadqcyya34k.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795353/covers/vziw7ntaursfuqqm4jnt.jpg",
        "tempo": 86,
        "mood": "Happy",
        "key": "C#",
        "scale": "major",
        "danceability": 0.7574,
        "energy": 0.1907,
        "genres": [
          "Jazz"
        ]
      },
      {
        "title": "i'll always be nice to you",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795453/tracks/n8n84isimctvqhxyc8xg.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795454/covers/zdqosla4tikhy20hleic.jpg",
        "tempo": 78,
        "mood": "Melancholic",
        "key": "Ab",
        "scale": "major",
        "danceability": 0.4793,
        "energy": 0.069,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "mystical feeling",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795332/tracks/nmcjmqd0u3kyxyupk73v.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795333/covers/trntdspvykr3l1ygfmjw.jpg",
        "tempo": 85,
        "mood": "Melancholic",
        "key": "G",
        "scale": "major",
        "danceability": 0.5163,
        "energy": 0.1043,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "earning",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795319/tracks/k6otsdne1jga6ms8p9jp.mp3",
        "trackNumber": 8,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795322/covers/mzk5ivajqowtrnwvcqnb.jpg",
        "tempo": 89,
        "mood": "Melancholic",
        "key": "C",
        "scale": "major",
        "danceability": 0.6017,
        "energy": 0.1488,
        "genres": [
          "Instrumental",
          "Lo-fi"
        ]
      },
      {
        "title": "tropical evening",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795302/tracks/t3qltsbmmm8oxsatwj1h.mp3",
        "trackNumber": 9,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795303/covers/c7bvasmkkvk9nj099osw.jpg",
        "tempo": 82,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.5974,
        "energy": 0.1667,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "napping storm",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795290/tracks/rcp8o1ykw0ejgm6zlxww.mp3",
        "trackNumber": 10,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795292/covers/lk5t9kmmyyumaaedkqfm.jpg",
        "tempo": 91,
        "mood": "Happy",
        "key": "D",
        "scale": "major",
        "danceability": 0.6185,
        "energy": 0.171,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "sweet walk",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795398/tracks/xderd9wekvca8kiuctxd.mp3",
        "trackNumber": 11,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795399/covers/eymga46w3wyohuoa7bnl.jpg",
        "tempo": 100,
        "mood": "Happy",
        "key": "C",
        "scale": "major",
        "danceability": 0.5872,
        "energy": 0.0931,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "time for",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795376/tracks/v8wj3rqtm9wxzqs4kenb.mp3",
        "trackNumber": 12,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795378/covers/frkzzirvs5f9uacgccrk.jpg",
        "tempo": 93,
        "mood": "Happy",
        "key": "G",
        "scale": "minor",
        "danceability": 0.6648,
        "energy": 0.1825,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "I love lights",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795111/tracks/r06uiroqqzkjzzggdotd.mp3",
        "trackNumber": 13,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795112/covers/siiijfai1l4rvmeiwkos.jpg",
        "tempo": 80,
        "mood": "Melancholic",
        "key": "C#",
        "scale": "minor",
        "danceability": 0.5737,
        "energy": 0.1772,
        "genres": [
          "Instrumental",
          "Lo-fi"
        ]
      },
      {
        "title": "no nightmare",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795164/tracks/dhci8hfwcprqfd6ppb3o.mp3",
        "trackNumber": 14,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795165/covers/aqghrarnlciuj17xmvgr.jpg",
        "tempo": 83,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.6151,
        "energy": 0.167,
        "genres": [
          "Instrumental",
          "Lo-fi"
        ]
      },
      {
        "title": "late evening",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795178/tracks/psedcixhbb6fpav1wvcc.mp3",
        "trackNumber": 15,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795179/covers/y9v0l8wshj4okl7uyuyd.jpg",
        "tempo": 69,
        "mood": "Melancholic",
        "key": "C",
        "scale": "major",
        "danceability": 0.5432,
        "energy": 0.1362,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "still need evening",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795201/tracks/iqbxcbjhhyose5hghunt.mp3",
        "trackNumber": 16,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795202/covers/ytz7fzttmdmgdmkj0gkv.jpg",
        "tempo": 79,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.4708,
        "energy": 0.0985,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "infinite trouble",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795224/tracks/rlqqxjbdnu89xcy6itmh.mp3",
        "trackNumber": 17,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795225/covers/fttoziwsndixzj96lfll.jpg",
        "tempo": 89,
        "mood": "Melancholic",
        "key": "B",
        "scale": "major",
        "danceability": 0.539,
        "energy": 0.1261,
        "genres": [
          "Classical"
        ]
      },
      {
        "title": "fake feeling",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746794846/tracks/hnmah79sjijvjufy2h7u.mp3",
        "trackNumber": 18,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746794848/covers/vog66fdpsbuyaspk47kf.jpg",
        "tempo": 96,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.5379,
        "energy": 0.1068,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "black coffee",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746794866/tracks/pzs53gykpqxrufmt3g0t.mp3",
        "trackNumber": 19,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746794868/covers/mgflaciqcnjpg8ndasi4.jpg",
        "tempo": 79,
        "mood": "Calm",
        "key": "D",
        "scale": "major",
        "danceability": 0.6952,
        "energy": 0.2088,
        "genres": [
          "Lo-fi",
          "Jazz"
        ]
      },
      {
        "title": "more juice",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746794894/tracks/pfq9xtzhxpkpapv2aomh.mp3",
        "trackNumber": 20,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746794895/covers/wk7jmxpql7rgmbukntxh.jpg",
        "tempo": 87,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.439,
        "energy": 0.0819,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "skyline to mind",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746794905/tracks/p0ckmjw6vs2boxdyu3br.mp3",
        "trackNumber": 21,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746794907/covers/e2lz4ekbczyztsmzsmhc.jpg",
        "tempo": 100,
        "key": "C",
        "scale": "major",
        "genres": [
          "Lo-fi",
          "Pop"
        ]
      },
      {
        "title": "another sauce",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746794916/tracks/ifswgwjebimvxbiqpubh.mp3",
        "trackNumber": 22,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746794917/covers/yh4ajna4z3yt9wcglawz.jpg",
        "tempo": 97,
        "key": "G",
        "scale": "major",
        "genres": [
          "Lo-fi",
          "Pop"
        ]
      },
      {
        "title": "feel life",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795043/tracks/it9xerdgyypxlqgzlwpf.mp3",
        "trackNumber": 23,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795044/covers/calj6iddgninlgoi4ih3.jpg",
        "tempo": 85,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.5711,
        "energy": 0.1242,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "another break",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795074/tracks/s9iiyhwa3cmznc5jovjg.mp3",
        "trackNumber": 24,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795076/covers/gcxqnhdnvxxtx8e64mr7.jpg",
        "tempo": 88,
        "mood": "Melancholic",
        "key": "G",
        "scale": "major",
        "danceability": 0.5982,
        "energy": 0.1369,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "far from life",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795098/tracks/rbdqdstsrvtodnidshb4.mp3",
        "trackNumber": 25,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795100/covers/aixfeqgbvgdniaxwkqob.jpg",
        "tempo": 88,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.5688,
        "energy": 0.1732,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "the time",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795054/tracks/pkk0t0b2ovpfn3kwvlkh.mp3",
        "trackNumber": 26,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795056/covers/uedscf4xhoal2err20oi.jpg",
        "tempo": 89,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.4311,
        "energy": 0.0804,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "it's love lights",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795033/tracks/n6mbfjpvzyjpcfrtkugs.mp3",
        "trackNumber": 27,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795034/covers/n6vhou6ca0ficfttwepm.jpg",
        "tempo": 90,
        "mood": "Happy",
        "key": "C",
        "scale": "minor",
        "danceability": 0.7002,
        "energy": 0.1786,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "space for lies",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795189/tracks/ttrk7lxefnsv9crfuhln.mp3",
        "trackNumber": 28,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795190/covers/uvl7201wyfojchjiz24y.jpg",
        "tempo": 98,
        "mood": "Calm",
        "key": "C",
        "scale": "major",
        "danceability": 0.7859,
        "energy": 0.2552,
        "genres": [
          "Lo-fi",
          "Jazz"
        ]
      },
      {
        "title": "one coffee break",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795124/tracks/neo7beomjzwg18setc5t.mp3",
        "trackNumber": 29,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795125/covers/wu6ss2sc3egfaas0etql.jpg",
        "tempo": 84,
        "mood": "Melancholic",
        "key": "D",
        "scale": "minor",
        "danceability": 0.4002,
        "energy": 0.0772,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "inspired side",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795139/tracks/fqlr8wnrtaktxuf6cxmv.mp3",
        "trackNumber": 30,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795141/covers/vbxt1rvndnz6fcil792t.jpg",
        "tempo": 83,
        "mood": "Melancholic",
        "key": "D",
        "scale": "major",
        "danceability": 0.5709,
        "energy": 0.1003,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "classic freedom",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795153/tracks/jdotto0hge0o9r951tki.mp3",
        "trackNumber": 31,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795155/covers/d3e97di3csf3sh4uhpfd.jpg",
        "tempo": 85,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "major",
        "danceability": 0.574,
        "energy": 0.0936,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "call me coward",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795429/tracks/tcelqpmdv4blb3qj5h2r.mp3",
        "trackNumber": 32,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795431/covers/attwwx2borq5fsqixflb.jpg",
        "tempo": 82,
        "mood": "Calm",
        "key": "A",
        "scale": "minor",
        "danceability": 0.7099,
        "energy": 0.2131,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "civilized",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795441/tracks/ebs7lpaipa9ejemlqfei.mp3",
        "trackNumber": 33,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795442/covers/suqffwcqsdkih3qewcbw.jpg",
        "tempo": 93,
        "mood": "Melancholic",
        "key": "B",
        "scale": "major",
        "danceability": 0.6487,
        "energy": 0.0684,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      },
      {
        "title": "the biggest motion",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795015/tracks/ehtvzdh95mtknpbqn0cf.mp3",
        "trackNumber": 34,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795017/covers/vyfvuuycduiyiud26k6z.jpg",
        "tempo": 82,
        "mood": "Happy",
        "key": "A",
        "scale": "major",
        "danceability": 0.6076,
        "energy": 0.0985,
        "genres": [
          "Lo-fi",
          "Classical"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "The Deli",
    "title": "For Your Ears Not Your Belly",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852058/covers/iwj6eoei4jzqxxjqm6pu.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-10'),
    "tracks": [
      {
        "title": "Ratio",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852081/tracks/ipz2b5ykx668wopcr5ph.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852058/covers/iwj6eoei4jzqxxjqm6pu.jpg",
        "tempo": 70,
        "mood": "Energetic",
        "key": "F",
        "scale": "minor",
        "danceability": 0.7246,
        "energy": 0.746,
        "genres": [
          "Rap",
          "Hip-Hop"
        ]
      },
      {
        "title": "Long Way",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852056/tracks/ivqqaelqzbnzpc0rngx2.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852058/covers/iwj6eoei4jzqxxjqm6pu.jpg",
        "tempo": 87,
        "mood": "Energetic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.7003,
        "energy": 0.7302,
        "genres": [
          "Rap",
          "Hip-Hop"
        ]
      },
      {
        "title": "Feels",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852069/tracks/uhyaw6ek5usok05bwjwb.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852058/covers/iwj6eoei4jzqxxjqm6pu.jpg",
        "tempo": 87,
        "mood": "Moderate",
        "key": "C",
        "scale": "major",
        "danceability": 0.515,
        "energy": 0.5625,
        "genres": [
          "Alternative",
          "Rap",
          "Hip-Hop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "The Deli",
    "title": "Spacetime",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852015/covers/mfdtxdnixuu69lfltalq.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-10'),
    "tracks": [
      {
        "title": "Keepgoing",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852042/tracks/xul3auofgqzdtncmus3h.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852015/covers/mfdtxdnixuu69lfltalq.jpg",
        "tempo": 87,
        "mood": "Melancholic",
        "key": "F#",
        "scale": "major",
        "danceability": 0.7367,
        "energy": 0.3475,
        "genres": [
          "Soul",
          "R&B"
        ]
      },
      {
        "title": "Timedilation",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852031/tracks/zwpiflkpatiteugpgmxl.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852015/covers/mfdtxdnixuu69lfltalq.jpg",
        "tempo": 90,
        "mood": "Melancholic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.6952,
        "energy": 0.2744,
        "genres": [
          "Pop"
        ]
      },
      {
        "title": "Goodbyelullaby",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852014/tracks/kuexcaadyqnn4hgiwke1.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852015/covers/mfdtxdnixuu69lfltalq.jpg",
        "tempo": 83,
        "mood": "Energetic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.6459,
        "energy": 0.7535,
        "genres": [
          "Country"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "The Deli",
    "title": "Vibes 3 (Remastered)",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851991/covers/sbaziu91dzd1ryyjlrrl.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-10'),
    "tracks": [
      {
        "title": "Bossa - Remastered",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852005/tracks/vjnovmeyf55datqctn4l.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851991/covers/sbaziu91dzd1ryyjlrrl.jpg",
        "tempo": 93,
        "mood": "Happy",
        "key": "C",
        "scale": "major",
        "danceability": 0.8489,
        "energy": 0.3789,
        "genres": [
          "Soul",
          "R&B"
        ]
      },
      {
        "title": "Fall Breeze - Remastered",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851997/tracks/ypcm8y6juim09tpwgvbw.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851991/covers/sbaziu91dzd1ryyjlrrl.jpg",
        "tempo": 80,
        "mood": "Melancholic",
        "key": "F",
        "scale": "major",
        "danceability": 0.7533,
        "energy": 0.351,
        "genres": [
          "Jazz"
        ]
      },
      {
        "title": "Float - Remastered",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851990/tracks/c8hmyv82qxsgyopkvhtc.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851991/covers/sbaziu91dzd1ryyjlrrl.jpg",
        "tempo": 90,
        "mood": "Happy",
        "key": "E",
        "scale": "minor",
        "danceability": 0.6713,
        "energy": 0.2427,
        "genres": [
          "Country"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Touliver",
    "title": "GENE (HPM Collective Remix EP) [Extended Mixes]",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808648/covers/gzmlvubxay6z3ioracmp.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Gene (Monotape Remix) [Extended Mix]",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808668/tracks/gpd1akh5xzycsp2cjvsr.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808648/covers/gzmlvubxay6z3ioracmp.jpg",
        "tempo": 126,
        "mood": "Energetic",
        "key": "B",
        "scale": "minor",
        "danceability": 0.8602,
        "energy": 0.8365,
        "genres": [
          "Dance",
          "Disco"
        ]
      },
      {
        "title": "Gene (GET LOOZE Remix) [Extended Mix]",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808646/tracks/eyfqlbuqtagut7yypnjz.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808648/covers/gzmlvubxay6z3ioracmp.jpg",
        "tempo": 128,
        "mood": "Energetic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.9071,
        "energy": 0.6349,
        "genres": [
          "Dance",
          "Disco"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Touliver",
    "title": "Gene (HPM Collective Remix EP)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808543/covers/bvqe283cvfd7e1c9ymm6.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "Gene (BeepBeepChild Remix)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808562/tracks/rkjb5epzp3bixr6kqo8e.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808543/covers/bvqe283cvfd7e1c9ymm6.jpg",
        "tempo": 110,
        "mood": "Happy",
        "key": "F",
        "scale": "major",
        "danceability": 0.7823,
        "energy": 0.4779,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "Gene (55 Remix)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808632/tracks/aoprjizcvlniehkqvgzq.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808543/covers/bvqe283cvfd7e1c9ymm6.jpg",
        "tempo": 115,
        "mood": "Energetic",
        "key": "E",
        "scale": "minor",
        "danceability": 0.827,
        "energy": 0.6053,
        "genres": [
          "Dance",
          "New Wave"
        ]
      },
      {
        "title": "Gene (Steji Remix)",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808610/tracks/k6j6fygyujjfjj5ndbws.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808543/covers/bvqe283cvfd7e1c9ymm6.jpg",
        "tempo": 100,
        "mood": "Energetic",
        "key": "B",
        "scale": "minor",
        "danceability": 0.5273,
        "energy": 0.6287,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "Gene (Monotape Remix) [Radio Edit]",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808577/tracks/gqvlabe4eneonxj5tvpg.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808543/covers/bvqe283cvfd7e1c9ymm6.jpg",
        "tempo": 126,
        "mood": "Energetic",
        "key": "B",
        "scale": "minor",
        "danceability": 0.8357,
        "energy": 0.8747,
        "genres": [
          "Rock",
          "Punk"
        ]
      },
      {
        "title": "Gene (Get Looze Remix) [Radio Edit]",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808598/tracks/gr5a3qliaokjlqtnxm2h.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808543/covers/bvqe283cvfd7e1c9ymm6.jpg",
        "tempo": 128,
        "mood": "Moderate",
        "key": "E",
        "scale": "minor",
        "danceability": 0.7055,
        "energy": 0.5083,
        "genres": [
          "Country"
        ]
      },
      {
        "title": "Gene (OLY Remix) [Radio Edit]",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746808541/tracks/vmgwpnxy8vywezksqtq0.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746808543/covers/bvqe283cvfd7e1c9ymm6.jpg",
        "tempo": 100,
        "mood": "Happy",
        "key": "E",
        "scale": "minor",
        "danceability": 0.7559,
        "energy": 0.377,
        "genres": [
          "Rap",
          "Hip-Hop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Văn Mai Hương",
    "title": "Mưa Tháng Sáu",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811834/covers/ininrlzqpbstwx0cjmrx.jpg",
    "type": AlbumType.EP,
    "labelName": null,
    "genreNames": [],
    "releaseDate": new Date('2025-05-09'),
    "tracks": [
      {
        "title": "MƯA THÁNG SÁU - solo version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811852/tracks/etnutvhcbqxlmhwb2ix5.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811834/covers/ininrlzqpbstwx0cjmrx.jpg",
        "tempo": 70,
        "mood": "Melancholic",
        "key": "Bb",
        "scale": "minor",
        "danceability": 0.6319,
        "energy": 0.2652,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      },
      {
        "title": "mưa tháng sáu - suy version",
        "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811833/tracks/klova4qw8cofzf2zm7zu.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811834/covers/ininrlzqpbstwx0cjmrx.jpg",
        "tempo": 70,
        "mood": "Melancholic",
        "key": "D",
        "scale": "minor",
        "danceability": 0.5527,
        "energy": 0.1582,
        "genres": [
          "Ballad",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Vũ.",
    "title": "Bảo Tàng Của Nuối Tiếc",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [
      "V-Pop",
      "Ballad",
      "Singer-Songwriter"
    ],
    "releaseDate": new Date('2025-02-26'),
    "tracks": [
      {
        "title": "Không Yêu Em Thì Yêu Ai",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279239/Kh%C3%B4ng_Y%C3%AAu_Em_Th%C3%AC_Y%C3%AAu_Ai_y1zpmr.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 88,
        "mood": "Passionate",
        "key": "C",
        "scale": "major",
        "danceability": 0.58,
        "energy": 0.62,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Mùa Mưa Ấy",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279230/M%C3%B9a_M%C6%B0a_%E1%BA%A4y_oqmyir.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 80,
        "mood": "Melancholic",
        "key": "D",
        "scale": "minor",
        "danceability": 0.5,
        "energy": 0.42,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Nếu Những Tiếc Nuối",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279173/N%E1%BA%BFu_Nh%E1%BB%AFng_Ti%E1%BA%BFc_Nu%E1%BB%91i_pm4vid.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 75,
        "mood": "Nostalgic",
        "key": "C",
        "scale": "minor",
        "danceability": 0.45,
        "energy": 0.4,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Những Lời Hứa Bỏ Quên",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279239/Nh%E1%BB%AFng_L%E1%BB%9Di_H%E1%BB%A9a_B%E1%BB%8F_Qu%C3%AAn_l7e4sr.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 82,
        "mood": "Regretful",
        "key": "Bb",
        "scale": "minor",
        "danceability": 0.5,
        "energy": 0.45,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Ngồi Chờ Trong Vấn Vương",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279232/Ng%E1%BB%93i_Ch%E1%BB%9D_Trong_V%E1%BA%A5n_V%C6%B0%C6%A1ng_u5yxxf.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 85,
        "mood": "Longing",
        "key": "F",
        "scale": "major",
        "danceability": 0.55,
        "energy": 0.48,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "bình yên",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279240/b%C3%ACnh_y%C3%AAn_emdk2s.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 68,
        "mood": "Peaceful",
        "key": "G",
        "scale": "major",
        "danceability": 0.4,
        "energy": 0.35,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Mây Khóc Vì Điều Gì",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279237/M%C3%A2y_Kh%C3%B3c_V%C3%AC_%C4%90i%E1%BB%81u_G%C3%AC_nwjsrz.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 70,
        "mood": "Sad",
        "key": "D",
        "scale": "minor",
        "danceability": 0.45,
        "energy": 0.4,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Những Chuyến Bay",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279235/Nh%E1%BB%AFng_Chuy%E1%BA%BFn_Bay_ocwwlh.mp3",
        "trackNumber": 8,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 95,
        "mood": "Contemplative",
        "key": "G",
        "scale": "major",
        "danceability": 0.6,
        "energy": 0.55,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Và Em Sẽ Luôn Là Người Tôi Yêu Nhất",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279246/V%C3%A0_Em_S%E1%BA%BD_Lu%C3%B4n_L%C3%A0_Ng%C6%B0%E1%BB%9Di_T%C3%B4i_Y%C3%AAu_Nh%E1%BA%A5t_uytipi.mp3",
        "trackNumber": 9,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 78,
        "mood": "Emotional",
        "key": "E",
        "scale": "minor",
        "danceability": 0.52,
        "energy": 0.5,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      },
      {
        "title": "Dành Hết Xuân Thì Để Chờ Nhau",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746279245/D%C3%A0nh_H%E1%BA%BFt_Xu%C3%A2n_Th%C3%AC_%C4%90%E1%BB%83_Ch%E1%BB%9D_Nhau_w7qpyu.mp3",
        "trackNumber": 10,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746279251/elnrlzd5dgkcl4euioqe_t4knrs.webp",
        "tempo": 72,
        "mood": "Romantic",
        "key": "A",
        "scale": "minor",
        "danceability": 0.48,
        "energy": 0.45,
        "genres": [
          "V-Pop",
          "Ballad",
          "Singer-Songwriter"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Wren Evans",
    "title": "LOI CHOI: The Neo Pop Punk",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [
      "Alternative",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-02-24'),
    "tracks": [
      {
        "title": "Quyền Anh",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276621/Quy%E1%BB%81n_Anh_oshath.mp3",
        "trackNumber": 1,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 130,
        "mood": "Powerful",
        "key": "G",
        "scale": "minor",
        "danceability": 0.8,
        "energy": 0.88,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Lối Chơi (Interlude)",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276623/L%E1%BB%91i_Ch%C6%A1i_Interlude_wifhgb.mp3",
        "trackNumber": 2,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 110,
        "mood": "Atmospheric",
        "key": "G",
        "scale": "minor",
        "danceability": 0.6,
        "energy": 0.55,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Việt Kiều",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276617/Vi%E1%BB%87t_Ki%E1%BB%81u_mfa6i7.mp3",
        "trackNumber": 3,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 135,
        "mood": "Bold",
        "key": "D",
        "scale": "minor",
        "danceability": 0.82,
        "energy": 0.85,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "ĐĐĐ",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276621/%C4%90%C4%90%C4%90_fhp5py.mp3",
        "trackNumber": 4,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 140,
        "mood": "Intense",
        "key": "F#",
        "scale": "minor",
        "danceability": 0.85,
        "energy": 0.9,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "bé ơi từ từ",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276619/b%C3%A9_%C6%A1i_t%E1%BB%AB_t%E1%BB%AB_o8tl7q.mp3",
        "trackNumber": 5,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 120,
        "mood": "Playful",
        "key": "F",
        "scale": "major",
        "danceability": 0.78,
        "energy": 0.75,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Tò Te Tí",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276623/T%C3%B2_Te_T%C3%AD_aqvkxg.mp3",
        "trackNumber": 6,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 125,
        "mood": "Playful",
        "key": "C",
        "scale": "major",
        "danceability": 0.85,
        "energy": 0.82,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Cầu Vĩnh Tuy",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276616/C%E1%BA%A7u_V%C4%A9nh_Tuy_cxas2h.mp3",
        "trackNumber": 7,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 130,
        "mood": "Nostalgic",
        "key": "D",
        "scale": "major",
        "danceability": 0.8,
        "energy": 0.85,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Phóng Đổ Tim Em",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276623/Ph%C3%B3ng_%C4%90%E1%BB%95_Tim_Em_hhkpr8.mp3",
        "trackNumber": 8,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 145,
        "mood": "Energetic",
        "key": "E",
        "scale": "major",
        "danceability": 0.88,
        "energy": 0.92,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Call Me",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276616/Call_Me_id3iie.mp3",
        "trackNumber": 9,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 140,
        "mood": "Upbeat",
        "key": "A",
        "scale": "minor",
        "danceability": 0.85,
        "energy": 0.9,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Tình Yêu Vĩ Mô",
        "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746276617/T%C3%ACnh_Y%C3%AAu_V%C4%A9_M%C3%B4_ilxt4k.mp3",
        "trackNumber": 10,
        "featuredArtists": [
          "itsnk"
        ],
        "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746277814/LOICHOI_uvydmv.webp",
        "tempo": 125,
        "mood": "Romantic",
        "key": "B",
        "scale": "major",
        "danceability": 0.75,
        "energy": 0.8,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  },
  {
    "artistName": "Wren Evans",
    "title": "Chiều Hôm Ấy Anh Thấy Màu Đỏ",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
    "type": AlbumType.ALBUM,
    "labelName": null,
    "genreNames": [
      "Alternative",
      "V-Pop"
    ],
    "releaseDate": new Date('2025-02-19'),
    "tracks": [
      {
        "title": "Trao",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745728523/Trao_hkvjpz.mp3",
        "trackNumber": 1,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
        "tempo": 105,
        "mood": "Gentle",
        "key": "F",
        "scale": "major",
        "danceability": 0.7,
        "energy": 0.65,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Chiều Hôm Ấy (Intro)",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745729627/Chi%E1%BB%81u_H%C3%B4m_%E1%BA%A4y_Intro_xzzfkh.mp3",
        "trackNumber": 2,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
        "tempo": 85,
        "mood": "Atmospheric",
        "key": "G",
        "scale": "minor",
        "danceability": 0.45,
        "energy": 0.4,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Mấy Khi",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745728507/M%E1%BA%A5y_Khi_jgc28s.mp3",
        "trackNumber": 3,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
        "tempo": 115,
        "mood": "Wistful",
        "key": "Bb",
        "scale": "major",
        "danceability": 0.75,
        "energy": 0.7,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Màu Đỏ (Interlude)",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745728506/M%C3%A0u_%C4%90%E1%BB%8F_Interlude_vqifhe.mp3",
        "trackNumber": 4,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
        "tempo": 88,
        "mood": "Mysterious",
        "key": "E",
        "scale": "minor",
        "danceability": 0.5,
        "energy": 0.45,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Cơn Đau",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745728507/C%C6%A1n_%C4%90au_bvpv0s.mp3",
        "trackNumber": 5,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
        "tempo": 125,
        "mood": "Intense",
        "key": "D",
        "scale": "minor",
        "danceability": 0.78,
        "energy": 0.85,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Anh Thấy (Interlude)",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745729621/Anh_Th%E1%BA%A5y_Interlude_e4ac0g.mp3",
        "trackNumber": 6,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
        "tempo": 90,
        "mood": "Reflective",
        "key": "A",
        "scale": "minor",
        "danceability": 0.55,
        "energy": 0.48,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      },
      {
        "title": "Gặp May",
        "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745728522/G%E1%BA%B7p_May_zwzesf.mp3",
        "trackNumber": 7,
        "featuredArtists": [],
        "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745807806/chieuhomay_qj4ql8.jpg",
        "tempo": 120,
        "mood": "Hopeful",
        "key": "C",
        "scale": "major",
        "danceability": 0.8,
        "energy": 0.75,
        "genres": [
          "Alternative",
          "V-Pop"
        ]
      }
    ],
    "featuredArtistNames": []
  }
];
