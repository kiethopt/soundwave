import { AlbumType } from '@prisma/client';

export interface SingleTrackData {
  artistName: string; title: string; coverUrl: string; audioUrl: string; genreNames: string[]; labelName: string | null; featuredArtistNames: string[]; playCount?: number; releaseDate?: Date; tempo?: number; mood?: string; key?: string; scale?: string; danceability?: number; energy?: number;
}

export const singles: SingleTrackData[] = [
  {
    "artistName": "2pillz",
    "title": "tình wá akk",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811953/covers/sow80fp3prhjx7cjwoxa.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811952/tracks/hbcziecrn9sx9g8n18kr.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 121,
    "mood": "Melancholic",
    "key": "G",
    "scale": "major",
    "danceability": 0.4159,
    "energy": 0.2161
  },
  {
    "artistName": "AMEE",
    "title": "ưng quá chừng",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813751/covers/qaedghpmgxdjiz3i0mad.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813750/tracks/dfszsyl0vh6a1gsfhutd.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 107,
    "mood": "Happy",
    "key": "E",
    "scale": "minor",
    "danceability": 0.7888,
    "energy": 0.3344
  },
  {
    "artistName": "AMEE",
    "title": "tone up your heart",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813746/covers/ju8alg5snn7xhoetthzj.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813745/tracks/pkhkwlip8wd9vxp8sdud.mp3",
    "genreNames": [
      "Dance",
      "New Wave"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 120,
    "mood": "Energetic",
    "key": "F#",
    "scale": "major",
    "danceability": 0.8238,
    "energy": 0.7418
  },
  {
    "artistName": "AMEE",
    "title": "thay mọi cô gái yêu anh",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813741/covers/olwtb8jhad3x3gcdlclx.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813739/tracks/wnvqsbu5cgugrq1pnqdh.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 91,
    "mood": "Melancholic",
    "key": "G",
    "scale": "minor",
    "danceability": 0.4671,
    "energy": 0.1489
  },
  {
    "artistName": "AMEE",
    "title": "Shay nắnggg",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813732/covers/mepobu9qzltpw3iurwq1.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813731/tracks/flmi6fd1u8eol669tshj.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 128,
    "mood": "Melancholic",
    "key": "F",
    "scale": "minor",
    "danceability": 0.6123,
    "energy": 0.2599
  },
  {
    "artistName": "AMEE",
    "title": "Nói Hoặc Không Nói",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813722/covers/tkqdpabbmirsgydcubx4.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813720/tracks/htlde0tdtxgvb2eh5njm.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 124,
    "mood": "Moderate",
    "key": "D",
    "scale": "minor",
    "danceability": 0.6994,
    "energy": 0.5431
  },
  {
    "artistName": "AMEE",
    "title": "Mưa Nào Mà Hông Tạnh",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813711/covers/mdffnhbefdgmvat0hxzj.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813710/tracks/mb6muoqxrmm7lrm09tqf.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 97,
    "mood": "Melancholic",
    "key": "D#",
    "scale": "minor",
    "danceability": 0.4748,
    "energy": 0.2799
  },
  {
    "artistName": "AMEE",
    "title": "Happy Birthday To You",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813702/covers/lspsxcwigl6jscjbayum.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813700/tracks/a46h8lahfjoldofgbint.mp3",
    "genreNames": [
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 99,
    "mood": "Energetic",
    "key": "C",
    "scale": "minor",
    "danceability": 0.5359,
    "energy": 0.7303
  },
  {
    "artistName": "AMEE",
    "title": "Em Bé",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813674/covers/ijum4ycnbddj9taqjdsz.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813672/tracks/ti9engkc6oydkywmhnix.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 107,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "minor",
    "danceability": 0.9143,
    "energy": 0.286
  },
  {
    "artistName": "AMEE",
    "title": "Chủ nhật boy",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813655/covers/lpsyrkhnrsqyrm5nmfs5.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813654/tracks/ehfl7yslty3jsm38lrfa.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 104,
    "mood": "Energetic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.701,
    "energy": 0.6046
  },
  {
    "artistName": "AMEE",
    "title": "Bài Ca Bầu Cử 2021",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811083/covers/a1g2dnzk9g7aotkzbae8.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811082/tracks/tpnww3yxymabcfidwwrz.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 110,
    "mood": "Moderate",
    "key": "D#",
    "scale": "minor",
    "danceability": 0.604,
    "energy": 0.3858
  },
  {
    "artistName": "Andiez",
    "title": "Anh Đánh Rơi Người Yêu Này",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813634/covers/owsrj6ykjfhyayorfehb.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813632/tracks/motkqh8onu8i7hztijff.mp3",
    "genreNames": [
      "V-Pop",
      "Bolero"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 79,
    "mood": "Melancholic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.5128,
    "energy": 0.2367
  },
  {
    "artistName": "B Ray",
    "title": "Do For Love (feat. AMEE)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813268/covers/xqfjobgv35oqsivbphap.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813266/tracks/oddngsbed7ceqc4td2oo.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 112,
    "mood": "Happy",
    "key": "D",
    "scale": "major",
    "danceability": 0.7684,
    "energy": 0.4338
  },
  {
    "artistName": "BigDaddy",
    "title": "Mưa Thâm Lặng Giời",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811201/covers/e49aoeucxd46f2umvvl0.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811200/tracks/ijwrekhkr4ywkdjyi0nq.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 87,
    "mood": "Melancholic",
    "key": "D",
    "scale": "minor",
    "danceability": 0.4528,
    "energy": 0.1317
  },
  {
    "artistName": "Binz",
    "title": "SO FAR",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807938/covers/umk2xitbgzo8accrzjp8.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807936/tracks/iof1xso5zwvjuk5awhzd.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 91,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.5132,
    "energy": 0.2642
  },
  {
    "artistName": "Binz",
    "title": "Sao Cũng Được",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807922/covers/oiuwzh3ezpxnggptmmye.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807921/tracks/fkxjcqa984pgs8dmxe5v.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 108,
    "mood": "Melancholic",
    "key": "G",
    "scale": "major",
    "danceability": 0.3827,
    "energy": 0.1064
  },
  {
    "artistName": "Binz",
    "title": "Quên Anh Đi",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807906/covers/nsycgubtn7egdebkbmhh.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807905/tracks/wzuipqfr9sqsf28ozo7q.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 70,
    "mood": "Calm",
    "key": "A",
    "scale": "major",
    "danceability": 0.5146,
    "energy": 0.3439
  },
  {
    "artistName": "Binz",
    "title": "LoveNote",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807884/covers/cb5ikxu1m33dhfibwbtq.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807882/tracks/j7f1aeqbosekvaavvhct.mp3",
    "genreNames": [
      "Soul",
      "R&B"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 105,
    "mood": "Melancholic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.777,
    "energy": 0.3468
  },
  {
    "artistName": "Binz",
    "title": "Gene",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807869/covers/uw7kft6ptldcacheop4v.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807867/tracks/dhvauhid9tsjpux2iwnc.mp3",
    "genreNames": [
      "Jazz"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Calm",
    "key": "B",
    "scale": "minor",
    "danceability": 0.5216,
    "energy": 0.3454
  },
  {
    "artistName": "Binz",
    "title": "Don't Break My Heart (TINLE Remix)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807853/covers/c0pmisswx2keg7ciafiy.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807851/tracks/s94d4hnbodpggssnphky.mp3",
    "genreNames": [
      "Soul",
      "R&B"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Melancholic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.6644,
    "energy": 0.3895
  },
  {
    "artistName": "Binz",
    "title": "Don't Break My Heart",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807815/covers/ls6wl62qwtqjxnpqbtyc.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807814/tracks/h9caydx5bzxssacqikwn.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Melancholic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.3282,
    "energy": 0.2474
  },
  {
    "artistName": "Binz",
    "title": "Cho Mình Em",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807719/covers/dljs5xwm6nt5v1hpcsbf.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807718/tracks/mw1skiva5hdxvyrk7n9q.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.4991,
    "energy": 0.1862
  },
  {
    "artistName": "chief.",
    "title": "No One's Awake",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852400/covers/bdiu3pqleixuojgkvy18.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852399/tracks/arskrebzsh7jinpajuue.mp3",
    "genreNames": [
      "Classical"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 78,
    "mood": "Melancholic",
    "key": "B",
    "scale": "major",
    "danceability": 0.3538,
    "energy": 0.1066
  },
  {
    "artistName": "chief.",
    "title": "ride in the park",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852385/covers/ij9xjjbz3wtr4w3clrxe.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852384/tracks/f4xa59oe0jkzyxmeqojx.mp3",
    "genreNames": [
      "Classical"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 85,
    "mood": "Melancholic",
    "key": "E",
    "scale": "major",
    "danceability": 0.4243,
    "energy": 0.0675
  },
  {
    "artistName": "chief.",
    "title": "time travel",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852342/covers/pobghiklkg6hb464rjjl.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852339/tracks/xibdweppms02deymi2us.mp3",
    "genreNames": [
      "Classical"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 78,
    "mood": "Melancholic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.3328,
    "energy": 0.1247
  },
  {
    "artistName": "Đen",
    "title": "Ta Cứ Đi Cùng Nhau",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746287181/TaCuDiCungNhau_mr0xxr.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746287186/Ta_C%E1%BB%A9_%C4%90i_C%C3%B9ng_Nhau_xnn9yy.mp3",
    "genreNames": [
      "Pop",
      "Hip-Hop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Linh Cáo"
    ],
    "playCount": 0,
    "releaseDate": new Date('2025-04-29'),
    "tempo": 100,
    "mood": "Uplifting",
    "key": "A",
    "scale": "minor",
    "danceability": 0.72,
    "energy": 0.68
  },
  {
    "artistName": "Đen",
    "title": "Đi Theo Bóng Mặt Trời",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746287006/DiTheoBongMatTroi_flz7ba.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746287010/%C4%90i_Theo_B%C3%B3ng_M%E1%BA%B7t_Tr%E1%BB%9Di_vxabn1.mp3",
    "genreNames": [
      "Hip-Hop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Giang Nguyễn"
    ],
    "playCount": 0,
    "releaseDate": new Date('2025-04-12'),
    "tempo": 95,
    "mood": "Reflective",
    "key": "Bb",
    "scale": "minor",
    "danceability": 0.68,
    "energy": 0.62
  },
  {
    "artistName": "Đen",
    "title": "Dưới Hiên Nhà",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746285393/DuoiHienNha_ppt0cy.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746285398/D%C6%B0%E1%BB%9Bi_Hi%C3%AAn_Nh%C3%A0_dxqiwq.mp3",
    "genreNames": [
      "Hip-Hop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Emcee L (Da LAB)",
      "JGKiD (Da LAB)"
    ],
    "playCount": 0,
    "releaseDate": new Date('2025-03-01'),
    "tempo": 92,
    "mood": "Chill",
    "key": "G",
    "scale": "minor",
    "danceability": 0.65,
    "energy": 0.6
  },
  {
    "artistName": "Đen",
    "title": "Ngày Khác Lạ",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746287578/NgayKhacLa_jjjnja.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746287582/Ng%C3%A0y_Kh%C3%A1c_L%E1%BA%A1_ji7jt3.mp3",
    "genreNames": [
      "Hip-Hop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Giang Phạm",
      "Triple D"
    ],
    "playCount": 0,
    "releaseDate": new Date('2025-02-23'),
    "tempo": 87,
    "mood": "Inspirational",
    "key": "E",
    "scale": "minor",
    "danceability": 0.7,
    "energy": 0.75
  },
  {
    "artistName": "Dương Domic",
    "title": "A đến Ă",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779504/covers/t3sdcjexyrgyy3sztug6.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779503/tracks/onar5gmscth3lwmnygon.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Happy",
    "key": "Ab",
    "scale": "major",
    "danceability": 0.6785,
    "energy": 0.2396
  },
  {
    "artistName": "Dương Domic",
    "title": "A Đến Ă (Remix)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779485/covers/w87mzasntag87dfgwhei.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779484/tracks/isln10z2secob5cldrt5.mp3",
    "genreNames": [
      "V-Pop",
      "Electronic",
      "Dance"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 136,
    "mood": "Energetic",
    "key": "Bb",
    "scale": "minor",
    "danceability": 0.7766,
    "energy": 0.6942
  },
  {
    "artistName": "Dương Domic",
    "title": "A Đến Ă (Remix House)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779468/covers/r87vdvto7tl4ytjob0m9.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779466/tracks/hdhhiiexgjbnem6mxlvz.mp3",
    "genreNames": [
      "V-Pop",
      "Dance",
      "House"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 129,
    "mood": "Energetic",
    "key": "Bb",
    "scale": "minor",
    "danceability": 0.8215,
    "energy": 0.6937
  },
  {
    "artistName": "Dương Domic",
    "title": "A đến Ă (Live at ZLAB)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779454/covers/qtzfvutu5yazjzppm6fo.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779452/tracks/vjredcjpvnyjqazcpaub.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Happy",
    "key": "Ab",
    "scale": "major",
    "danceability": 0.6633,
    "energy": 0.2627
  },
  {
    "artistName": "Dương Domic",
    "title": "Là Em, Chính Em",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745731659/laemlachinhem_wzepft.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745731671/L%C3%A0_Em_Ch%C3%ADnh_Em_ki38w0.mp3",
    "genreNames": [
      "V-Pop",
      "Ballad"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 25,
    "releaseDate": new Date('2025-04-25'),
    "tempo": 80,
    "mood": "Romantic",
    "key": "Bb",
    "scale": "major",
    "danceability": 0.6,
    "energy": 0.55
  },
  {
    "artistName": "Dương Domic",
    "title": "Yêu Em 2 Ngày",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745731856/yeuem2ngay_mwvqxx.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745731859/Y%C3%AAu_Em_2_Ng%C3%A0y_tgdmi8.mp3",
    "genreNames": [
      "R&B",
      "V-Pop",
      "Ballad"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 25,
    "releaseDate": new Date('2025-02-19'),
    "tempo": 90,
    "mood": "Sensual",
    "key": "F",
    "scale": "minor",
    "danceability": 0.68,
    "energy": 0.58
  },
  {
    "artistName": "GREY D",
    "title": "no rules, all welcome",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811927/covers/vej59h9owjwdbt0taebf.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811925/tracks/b6auov1jbjgww9r0m6dj.mp3",
    "genreNames": [
      "Soul",
      "R&B"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 90,
    "mood": "Happy",
    "key": "A",
    "scale": "minor",
    "danceability": 0.7972,
    "energy": 0.3323
  },
  {
    "artistName": "GREY D",
    "title": "nhạt-fine",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811877/covers/xp1svvvbcqko8nkc5w9e.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811876/tracks/c4xy0rhhtyklkypxmru7.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 119,
    "mood": "Happy",
    "key": "F#",
    "scale": "major",
    "danceability": 0.7009,
    "energy": 0.3992
  },
  {
    "artistName": "GREY D",
    "title": "đưa em về nhàa",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811126/covers/m4pcahhmh9bdtgt3ygqu.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811124/tracks/fn5qovbm9ell1ob2yhqn.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 96,
    "mood": "Melancholic",
    "key": "G#",
    "scale": "minor",
    "danceability": 0.2752,
    "energy": 0.2328
  },
  {
    "artistName": "HIEUTHUHAI",
    "title": "ngủ một mình",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779684/covers/vuapixdciew1ifil9jmu.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779683/tracks/az3tuph0myeflhnziht6.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 106,
    "mood": "Moderate",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.4821,
    "energy": 0.4127
  },
  {
    "artistName": "HIEUTHUHAI",
    "title": "ngủ một mình (tình rất tình)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779669/covers/afppsriu1fnqfto5033l.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779668/tracks/dgkgbinqnhhprxeuf93t.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Melancholic",
    "key": "C",
    "scale": "minor",
    "danceability": 0.4343,
    "energy": 0.2824
  },
  {
    "artistName": "HIEUTHUHAI",
    "title": "CUA (Live at GENfest 24)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779646/covers/i0cpj1vpsnmnqftdo2sh.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779645/tracks/m0cblcnugwiaufqy4cd3.mp3",
    "genreNames": [
      "Alternative",
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 1,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 101,
    "mood": "Moderate",
    "key": "E",
    "scale": "minor",
    "danceability": 0.6909,
    "energy": 0.5817
  },
  {
    "artistName": "HIEUTHUHAI",
    "title": "Cua - Remix",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779624/covers/wsv3potnxmseaxlroiq0.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779623/tracks/lezqagmssuip0jxvint6.mp3",
    "genreNames": [
      "Alternative",
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 2,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 104,
    "mood": "Melancholic",
    "key": "Ab",
    "scale": "minor",
    "danceability": 0.6986,
    "energy": 0.3252
  },
  {
    "artistName": "HIEUTHUHAI",
    "title": "Chơi - Remix",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779607/covers/sp02fw4tztbbnudfpnex.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779606/tracks/sej2i2i0vtswotuoginm.mp3",
    "genreNames": [
      "V-Pop",
      "Electronic",
      "Dance"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 107,
    "mood": "Moderate",
    "key": "G",
    "scale": "minor",
    "danceability": 0.7467,
    "energy": 0.443
  },
  {
    "artistName": "HIEUTHUHAI",
    "title": "Ai Cũng Phải Bắt Đầu Từ Đâu Đó",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779586/covers/dvw6ifu5vdauqfeggkpc.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779585/tracks/v1kcpd016tz9xpohgsbw.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 66,
    "mood": "Melancholic",
    "key": "F",
    "scale": "minor",
    "danceability": 0.3265,
    "energy": 0.2927
  },
  {
    "artistName": "HIEUTHUHAI",
    "title": "TRÌNH",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745432929/TRINH_ap6p2g.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745432905/TR%C3%8CNH_iobw5p.mp3",
    "genreNames": [
      "Hip-Hop",
      "V-Pop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 45,
    "releaseDate": new Date('2025-02-26'),
    "tempo": 140,
    "mood": "Confident",
    "key": "D",
    "scale": "minor",
    "danceability": 0.85,
    "energy": 0.9
  },
  {
    "artistName": "Hoài Lâm, Hồ Văn Cường, Nguyễn Minh Cường",
    "title": "Đôi Chút Tâm Tư",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779403/covers/fjzksbgvnh4vluz8brk9.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779401/tracks/efifi7oyqwi8lymxan5m.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 110,
    "mood": "Melancholic",
    "key": "F",
    "scale": "minor",
    "danceability": 0.3948,
    "energy": 0.2108
  },
  {
    "artistName": "Hoàng Yến Chibi",
    "title": "Yêu Thầm",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779835/covers/w2oxf4yagiabida0inff.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779833/tracks/np5zkrxqizhzyghec7zg.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 96,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.455,
    "energy": 0.1689
  },
  {
    "artistName": "Hoàng Yến Chibi",
    "title": "Yêu Thầm - Beat",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779819/covers/n6c2k3grn4d5un2qcyyf.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779818/tracks/e4njtrovca5ecz8yevbj.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 96,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.3941,
    "energy": 0.2099
  },
  {
    "artistName": "Hoàng Yến Chibi",
    "title": "Yêu Thầm - Live Performance",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779804/covers/ipqwcjeceg5f4bgb1y1f.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779803/tracks/iynxi493i3yeouyqklla.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 96,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.3844,
    "energy": 0.1442
  },
  {
    "artistName": "Hứa Kim Tuyền",
    "title": "hai mươi hai (22)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813692/covers/dqmpfnnwtwjzo9nk3xnd.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813691/tracks/yqxvv1c75tylbtjtua6m.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 120,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "minor",
    "danceability": 0.5624,
    "energy": 0.1395
  },
  {
    "artistName": "Hứa Kim Tuyền",
    "title": "anh sẽ đến cùng cơn mưa",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811077/covers/tylvhycea3pms3m97cvu.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811076/tracks/qfizkkqvv8f24bzzzbfq.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 93,
    "mood": "Melancholic",
    "key": "F",
    "scale": "minor",
    "danceability": 0.4852,
    "energy": 0.0615
  },
  {
    "artistName": "JustaTee",
    "title": "Cơn Mưa Cuối",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746807735/covers/pxgdhcphph5wv0sc8pyf.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746807734/tracks/ehnnjq2yxmexqgwo5aby.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 122,
    "mood": "Melancholic",
    "key": "Bb",
    "scale": "major",
    "danceability": 0.4943,
    "energy": 0.2047
  },
  {
    "artistName": "Kai Đinh",
    "title": "baby you are not alone",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813647/covers/hycwwpnhwg8hiyv0it5o.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813645/tracks/iyt3bddgh44bmvfzc4zu.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 98,
    "mood": "Melancholic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.4465,
    "energy": 0.1697
  },
  {
    "artistName": "Kai Đinh",
    "title": "Trái đất ôm Mặt trời",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811965/covers/xbpe7qvn5uokdbhbztee.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811964/tracks/pjxmbx2gskviqbv41dqh.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 138,
    "mood": "Melancholic",
    "key": "F",
    "scale": "minor",
    "danceability": 0.5019,
    "energy": 0.3321
  },
  {
    "artistName": "LAKEY INSPIRED",
    "title": "The Process",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851976/covers/zpwgb4eecdzmn0wqkwql.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851974/tracks/b3lxvqifckefptft2k1s.mp3",
    "genreNames": [
      "Jazz"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 131,
    "mood": "Melancholic",
    "key": "Bb",
    "scale": "minor",
    "danceability": 0.7862,
    "energy": 0.275
  },
  {
    "artistName": "LAKEY INSPIRED",
    "title": "Thinking Of You",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851955/covers/voq9ijmas3p5asibrbdj.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851953/tracks/yijoireozzynfgzbgpzi.mp3",
    "genreNames": [
      "Instrumental",
      "Lo-fi"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 85,
    "mood": "Melancholic",
    "key": "D",
    "scale": "minor",
    "danceability": 0.4114,
    "energy": 0.1163
  },
  {
    "artistName": "LAKEY INSPIRED",
    "title": "This Feeling",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851943/covers/rldmxyp0ophu8li80xkv.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851942/tracks/kn6xhr1vvasf2yzxezsx.mp3",
    "genreNames": [
      "Alternative",
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 76,
    "mood": "Calm",
    "key": "F",
    "scale": "minor",
    "danceability": 0.6045,
    "energy": 0.3027
  },
  {
    "artistName": "LAKEY INSPIRED",
    "title": "Visions",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851925/covers/dg4zxb3ry7qdjkboi2e2.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851924/tracks/odarjawdzqihbqgkmzew.mp3",
    "genreNames": [
      "Instrumental"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 70,
    "mood": "Moderate",
    "key": "C",
    "scale": "major",
    "danceability": 0.6369,
    "energy": 0.4561
  },
  {
    "artistName": "LAKEY INSPIRED",
    "title": "Warm Nights",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851910/covers/yd8f14vvfvrzoseyjkyb.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851908/tracks/wsgcpwe2zvhkla4ms5lk.mp3",
    "genreNames": [
      "Instrumental",
      "Lo-fi"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 86,
    "mood": "Melancholic",
    "key": "E",
    "scale": "major",
    "danceability": 0.7212,
    "energy": 0.3879
  },
  {
    "artistName": "LAKEY INSPIRED",
    "title": "Watching The Clouds",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746851894/covers/h9wskywk0aeelpuookge.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746851893/tracks/apmbohhs2g9uxozkhgjf.mp3",
    "genreNames": [
      "Jazz"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 75,
    "mood": "Melancholic",
    "key": "Eb",
    "scale": "minor",
    "danceability": 0.4451,
    "energy": 0.0913
  },
  {
    "artistName": "Lê Hiếu",
    "title": "Ngày Mai Em Đi",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780120/covers/khhh33qrydlomwxtxklk.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780119/tracks/gzrpc3byzajv1mkqnfzr.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Happy",
    "key": "C",
    "scale": "minor",
    "danceability": 0.7212,
    "energy": 0.3546
  },
  {
    "artistName": "Low G",
    "title": "Fashion Tán Gái",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746782780/covers/azwemgwcnzbhvqxdfe53.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782778/tracks/yyrglhuxgoompgeizhpu.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 116,
    "mood": "Melancholic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.8878,
    "energy": 0.2044
  },
  {
    "artistName": "MONO",
    "title": "Stay Cool 2",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810946/covers/qjjuccxk2e6bf8ebtqmr.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810944/tracks/amomfclxusqzsp4katxn.mp3",
    "genreNames": [
      "Soul",
      "R&B"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 103,
    "mood": "Happy",
    "key": "A",
    "scale": "major",
    "danceability": 0.8629,
    "energy": 0.6674
  },
  {
    "artistName": "MONO",
    "title": "Stay Cool",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810942/covers/x9jtufsml8dxpqun9xbe.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810940/tracks/tfdjwqlr83wigfgfshvb.mp3",
    "genreNames": [
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 117,
    "mood": "Happy",
    "key": "E",
    "scale": "major",
    "danceability": 0.8387,
    "energy": 0.5813
  },
  {
    "artistName": "MONO",
    "title": "Purple Lightning",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810938/covers/kcpw3hnmsgxtfnziu9bq.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810937/tracks/bi87alkdmzjaunksasjm.mp3",
    "genreNames": [
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 126,
    "mood": "Happy",
    "key": "C#",
    "scale": "major",
    "danceability": 0.737,
    "energy": 0.5742
  },
  {
    "artistName": "MONO",
    "title": "Đi Tìm Tình Yêu",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810930/covers/nnthyc9dc9vpaicprgbo.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810928/tracks/ttfg8mza9uglvxymgw6m.mp3",
    "genreNames": [
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 115,
    "mood": "Happy",
    "key": "G#",
    "scale": "major",
    "danceability": 0.8925,
    "energy": 0.5508
  },
  {
    "artistName": "MONO",
    "title": "Cool Thứ Thiệt",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746810853/covers/bcqgm2ditf70vxrh2vf9.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746810842/tracks/z2kkhdvvxoumauhmc04y.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 103,
    "mood": "Happy",
    "key": "E",
    "scale": "minor",
    "danceability": 0.8445,
    "energy": 0.5459
  },
  {
    "artistName": "MONO",
    "title": "Chăm Hoa",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746284998/ChamHoa_d3cygc.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746285002/Ch%C4%83m_Hoa_t6qo04.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-03-14'),
    "tempo": 105,
    "mood": "Upbeat",
    "key": "F",
    "scale": "major",
    "danceability": 0.75,
    "energy": 0.7
  },
  {
    "artistName": "MONO",
    "title": "Ôm Em Thật Lâu",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746284604/OmEmThatLau_itnwlk.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746284606/%C3%94m_Em_Th%E1%BA%ADt_L%C3%A2u_h02ka9.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-02-25'),
    "tempo": 98,
    "mood": "Romantic",
    "key": "D",
    "scale": "major",
    "danceability": 0.7,
    "energy": 0.65
  },
  {
    "artistName": "My Anh",
    "title": "gentle, baby",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852150/covers/qkouqsrrl3rqkfweqzti.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852149/tracks/nae9tia0liiv8lyu2y8u.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 62,
    "mood": "Melancholic",
    "key": "Ab",
    "scale": "minor",
    "danceability": 0.5165,
    "energy": 0.2459
  },
  {
    "artistName": "My Anh",
    "title": "letting go",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852111/covers/lxc0nqxttwmzfbwd8mso.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852110/tracks/t2kzbgswfrpuzhox9fdk.mp3",
    "genreNames": [
      "Soul",
      "R&B"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 95,
    "mood": "Happy",
    "key": "A",
    "scale": "minor",
    "danceability": 0.6866,
    "energy": 0.342
  },
  {
    "artistName": "My Anh",
    "title": "Yên",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852098/covers/flqasa4ureab9dvcieov.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852096/tracks/pjtqnjjvr2tr6xkybruk.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 110,
    "mood": "Melancholic",
    "key": "G",
    "scale": "major",
    "danceability": 0.3561,
    "energy": 0.2621
  },
  {
    "artistName": "Obito",
    "title": "Simple Love",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745439839/simplelove_hm8scr.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745439837/Simple_Love_eznpfm.mp3",
    "genreNames": [
      "Hip-Hop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Seachains"
    ],
    "playCount": 40,
    "releaseDate": new Date('2025-03-17'),
    "tempo": 110,
    "mood": "Dreamy",
    "key": "B",
    "scale": "major",
    "danceability": 0.75,
    "energy": 0.65
  },
  {
    "artistName": "Obito",
    "title": "When You Look at Me",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745440519/whenyoulookatme_az7yye.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745440528/When_You_Look_at_Me_feat._Seachains_hw4whz.mp3",
    "genreNames": [
      "V-Pop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Seachains"
    ],
    "playCount": 20,
    "releaseDate": new Date('2025-03-11'),
    "tempo": 105,
    "mood": "Chill",
    "key": "D",
    "scale": "minor",
    "danceability": 0.72,
    "energy": 0.6
  },
  {
    "artistName": "Obito",
    "title": "Phong Long",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745440114/phonglong_dclnox.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745440211/Phong_Long_zt4pc3.mp3",
    "genreNames": [
      "V-Pop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Low G",
      "WOKEUP"
    ],
    "playCount": 30,
    "releaseDate": new Date('2025-02-11'),
    "tempo": 125,
    "mood": "Energetic",
    "key": "G",
    "scale": "minor",
    "danceability": 0.82,
    "energy": 0.78
  },
  {
    "artistName": "Phan Đinh Tùng",
    "title": "Khúc Hát Mừng Sinh Nhật",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746284252/khuchatmungsinhnhat_kxetsa.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746284266/Kh%C3%BAc_H%C3%A1t_M%E1%BB%ABng_Sinh_Nh%E1%BA%ADt_wfpthb.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 90,
    "releaseDate": new Date('2025-01-15'),
    "tempo": 120,
    "mood": "Happy",
    "key": "C",
    "scale": "major",
    "danceability": 0.85,
    "energy": 0.75
  },
  {
    "artistName": "Phuc Du",
    "title": "dỗi ít thôi ôm đê",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813299/covers/eojp6imfovuhfujzvwoh.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813298/tracks/cof3rjcslblrejij5dzp.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Happy",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.8175,
    "energy": 0.3723
  },
  {
    "artistName": "Rhymastic",
    "title": "Nhanh lên nhé! (feat. Touliver & SlimV)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780136/covers/zpcv97obdj1hxsdz3hza.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780135/tracks/woe0cw6s7ytxsrgloqzu.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 108,
    "mood": "Moderate",
    "key": "B",
    "scale": "major",
    "danceability": 0.5215,
    "energy": 0.404
  },
  {
    "artistName": "Shrimpnose",
    "title": "Snowed In",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852372/covers/t8wn5i5v5nsfbhehhwdz.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852371/tracks/ziaux4oipcwlwjp1hc3c.mp3",
    "genreNames": [
      "Acoustic",
      "Instrumental"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 77,
    "mood": "Melancholic",
    "key": "G",
    "scale": "major",
    "danceability": 0.4445,
    "energy": 0.2525
  },
  {
    "artistName": "Shrimpnose",
    "title": "Sundials",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852354/covers/xabp03h3sbbfq9whpb1w.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852352/tracks/idxsbbpcgdfrsbvzinwc.mp3",
    "genreNames": [
      "Classical"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 77,
    "mood": "Melancholic",
    "key": "E",
    "scale": "major",
    "danceability": 0.2626,
    "energy": 0.025
  },
  {
    "artistName": "Shurkn Pap",
    "title": "蜜蜂 - MITSUBACHI",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779791/covers/sgzg6bzxiwfgur2veeyf.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779789/tracks/rq5ovcoj3bt6tpgac6dh.mp3",
    "genreNames": [
      "Alternative",
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 1,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 67,
    "mood": "Moderate",
    "key": "Ab",
    "scale": "minor",
    "danceability": 0.7647,
    "energy": 0.4442
  },
  {
    "artistName": "SIXTYUPTOWN",
    "title": "em sẽ vui thôi mà",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852164/covers/kyehuf9fcgsrxdk8pate.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852163/tracks/nmou8gl17cjy3e0xu00u.mp3",
    "genreNames": [
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 138,
    "mood": "Happy",
    "key": "C#",
    "scale": "major",
    "danceability": 0.6944,
    "energy": 0.533
  },
  {
    "artistName": "Sơn Tùng M-TP",
    "title": "Making My Way",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745435260/makingmyway_j07fyn.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745435297/MAKING_MY_WAY_s7hrju.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 81,
    "releaseDate": new Date('2025-03-22'),
    "tempo": 125,
    "mood": "Upbeat",
    "key": "A",
    "scale": "major",
    "danceability": 0.88,
    "energy": 0.85
  },
  {
    "artistName": "Sơn Tùng M-TP",
    "title": "Chạy Ngay Đi",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745435171/chayngaydi_q2tbv1.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745435167/Ch%E1%BA%A1y_Ngay_%C4%90i_av6kxz.mp3",
    "genreNames": [
      "Hip-Hop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 101,
    "releaseDate": new Date('2025-03-19'),
    "tempo": 128,
    "mood": "Intense",
    "key": "F",
    "scale": "minor",
    "danceability": 0.92,
    "energy": 0.88
  },
  {
    "artistName": "Sơn Tùng M-TP",
    "title": "Hãy Trao Cho Anh",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745435426/haytraochoanh_fcmixd.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745435429/H%C3%A3y_Trao_Cho_Anh_q8cm6x.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 90,
    "releaseDate": new Date('2025-01-29'),
    "tempo": 118,
    "mood": "Vibrant",
    "key": "D",
    "scale": "major",
    "danceability": 0.9,
    "energy": 0.8
  },
  {
    "artistName": "SOOBIN",
    "title": "Và Thế Là Hết (Lalala Version 2)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780179/covers/axrrlxdezbdvhu3bk4h7.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780178/tracks/elufbjic3xegbyolfw8w.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 110,
    "mood": "Happy",
    "key": "A",
    "scale": "minor",
    "danceability": 0.7116,
    "energy": 0.4961
  },
  {
    "artistName": "SOOBIN",
    "title": "Tiến Tới Ước Mơ (feat. Rhymastic & SlimV)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780163/covers/aih7xi9rrutskyiexdne.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780162/tracks/g7zxkbc5zpe881kbjfeg.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 87,
    "mood": "Melancholic",
    "key": "C",
    "scale": "minor",
    "danceability": 0.4994,
    "energy": 0.2653
  },
  {
    "artistName": "SOOBIN",
    "title": "Em Ơi, Anh Nhớ Nhà",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780093/covers/qhbuxqeloia34zycvtl7.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780092/tracks/pgtybpg1ojhofdyttigt.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 120,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "major",
    "danceability": 0.607,
    "energy": 0.1341
  },
  {
    "artistName": "SOOBIN",
    "title": "Điều Ta Muốn",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780078/covers/xidslr6koqoo57f1j5s5.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780077/tracks/rs6czkvej4ybhx1e9mc1.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 74,
    "mood": "Melancholic",
    "key": "Ab",
    "scale": "major",
    "danceability": 0.5762,
    "energy": 0.2161
  },
  {
    "artistName": "SOOBIN",
    "title": "Di Va Yeu",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780064/covers/ohlinmxgid1ofzolczqw.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780062/tracks/twsatukme1zwhhoktqf0.mp3",
    "genreNames": [
      "Blues"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 109,
    "mood": "Happy",
    "key": "C",
    "scale": "major",
    "danceability": 0.7554,
    "energy": 0.512
  },
  {
    "artistName": "SOOBIN",
    "title": "Đi Để Trở Về",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746780047/covers/qycwz4wxu2f615ejcgqc.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746780046/tracks/uklumak8g74opjdko2rp.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 96,
    "mood": "Melancholic",
    "key": "G",
    "scale": "major",
    "danceability": 0.4871,
    "energy": 0.2675
  },
  {
    "artistName": "SOOBIN",
    "title": "Ngày Mai Em Đi",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745432092/ngaymaiemdi_s00edy.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745432073/Ng%C3%A0y_Mai_Em_%C4%90i_z2ll3z.mp3",
    "genreNames": [
      "V-Pop",
      "Acoustic"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Lê Hiếu"
    ],
    "playCount": 16,
    "releaseDate": new Date('2025-04-17'),
    "tempo": 85,
    "mood": "Gentle",
    "key": "G",
    "scale": "major",
    "danceability": 0.58,
    "energy": 0.52
  },
  {
    "artistName": "SOOBIN",
    "title": "Vài Lần Đón Đưa",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745431592/vailandondua_dgnhah.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745431587/Vai_Lan_Don_Dua_jiecy2.mp3",
    "genreNames": [
      "V-Pop",
      "Ballad"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 15,
    "releaseDate": new Date('2025-01-30'),
    "tempo": 82,
    "mood": "Nostalgic",
    "key": "C",
    "scale": "major",
    "danceability": 0.55,
    "energy": 0.45
  },
  {
    "artistName": "SOOBIN",
    "title": "Vẫn Nhớ",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745431465/vannho_yh3ama.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745431285/V%E1%BA%ABn_Nh%E1%BB%9B_e8qiqi.mp3",
    "genreNames": [
      "V-Pop",
      "Ballad"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 38,
    "releaseDate": new Date('2025-01-13'),
    "tempo": 75,
    "mood": "Melancholic",
    "key": "Eb",
    "scale": "minor",
    "danceability": 0.45,
    "energy": 0.38
  },
  {
    "artistName": "SOOBIN",
    "title": "Say Goodbye",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745431779/saygoodbye_im75o4.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745431784/Say_Goodbye_rhpmv9.mp3",
    "genreNames": [
      "V-Pop",
      "Acoustic",
      "Ballad"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 25,
    "releaseDate": new Date('2025-01-12'),
    "tempo": 78,
    "mood": "Sad",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.48,
    "energy": 0.4
  },
  {
    "artistName": "SUNI",
    "title": "Sự Mập Mờ",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746811933/covers/t28f04c62tulnih9rdnf.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746811932/tracks/mctia1f6i1eonsulg4xt.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 65,
    "mood": "Melancholic",
    "key": "A",
    "scale": "major",
    "danceability": 0.4018,
    "energy": 0.0835
  },
  {
    "artistName": "T.R.I",
    "title": "Si Mê (Speed Up)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813047/covers/p2u1e1l3ssbxguicporo.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813045/tracks/rmtcn9filb7vkcuf9izy.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 101,
    "mood": "Moderate",
    "key": "C",
    "scale": "minor",
    "danceability": 0.6781,
    "energy": 0.4326
  },
  {
    "artistName": "T.R.I",
    "title": "Nhịp Đôi",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813031/covers/jodelzkpnxqkzpbzdvdu.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813030/tracks/py1fmofyvzdsnzm3j8qc.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Happy",
    "key": "E",
    "scale": "minor",
    "danceability": 0.7344,
    "energy": 0.394
  },
  {
    "artistName": "T.R.I",
    "title": "Nhạc Buồn Ngày 2",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813027/covers/jlxtsqqpdcjcdibebk7m.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813025/tracks/wdahl1krlyheuxdgrbod.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 108,
    "mood": "Melancholic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.4483,
    "energy": 0.094
  },
  {
    "artistName": "T.R.I",
    "title": "Ngày Em Nói",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813021/covers/rjdhox1necelmp8mxk6k.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813019/tracks/k5ls6won80uzshkokyfv.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 97,
    "mood": "Melancholic",
    "key": "B",
    "scale": "minor",
    "danceability": 0.4432,
    "energy": 0.0767
  },
  {
    "artistName": "T.R.I",
    "title": "New Days",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813016/covers/rwatbjkiw5l2mtytmcua.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813015/tracks/pldo5sncguj8fohbttat.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 110,
    "mood": "Moderate",
    "key": "D#",
    "scale": "minor",
    "danceability": 0.4434,
    "energy": 0.3508
  },
  {
    "artistName": "T.R.I",
    "title": "một bài hát không vui mấy",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813007/covers/mt5qnvzdfial8rcwi9us.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746813006/tracks/jzc8kjkladym79lsfdwu.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 113,
    "mood": "Melancholic",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.6642,
    "energy": 0.0682
  },
  {
    "artistName": "T.R.I",
    "title": "Lose You (Làm Lại)",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746813000/covers/tbc8csojewssxpgf18e6.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812999/tracks/qu3vkqrunec97sofsaek.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 97,
    "mood": "Melancholic",
    "key": "C",
    "scale": "minor",
    "danceability": 0.4053,
    "energy": 0.079
  },
  {
    "artistName": "T.R.I",
    "title": "Lễ Đường Của Em",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812995/covers/j6rqxf9rpxbtapgnj8be.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812994/tracks/vbgu8nkngxyrzx4lvyon.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 92,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "minor",
    "danceability": 0.4864,
    "energy": 0.0712
  },
  {
    "artistName": "T.R.I",
    "title": "I Don't Need You Anymore",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812833/covers/pibdke5iaqgwhdw7fsek.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812832/tracks/erahocsfulhcr0cxkawo.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 91,
    "mood": "Melancholic",
    "key": "G",
    "scale": "minor",
    "danceability": 0.7243,
    "energy": 0.192
  },
  {
    "artistName": "T.R.I",
    "title": "Horizon",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812828/covers/rgojd3jafhmiimku2ojf.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812827/tracks/jdkohqkjj1o1xm6rzmeg.mp3",
    "genreNames": [
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 116,
    "mood": "Melancholic",
    "key": "A#",
    "scale": "minor",
    "danceability": 0.7606,
    "energy": 0.3562
  },
  {
    "artistName": "T.R.I",
    "title": "Homie Party",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812823/covers/aaz0wwgozyyp7hpatspc.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812821/tracks/lc57gxhj5hiynaud5dax.mp3",
    "genreNames": [
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 122,
    "mood": "Happy",
    "key": "C#",
    "scale": "major",
    "danceability": 0.794,
    "energy": 0.4232
  },
  {
    "artistName": "T.R.I",
    "title": "Hoa Bấy Bì",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812818/covers/o1n1yllnbd941p49ehcw.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812817/tracks/dcwcw8d2nntofqw4k3gn.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 109,
    "mood": "Melancholic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.4653,
    "energy": 0.1324
  },
  {
    "artistName": "T.R.I",
    "title": "Điên",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812814/covers/b7xxu79sz7ecw8hhrsvg.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812813/tracks/b4igr1pxrdfbmxfa6v9p.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 95,
    "mood": "Happy",
    "key": "E",
    "scale": "minor",
    "danceability": 0.6967,
    "energy": 0.1007
  },
  {
    "artistName": "T.R.I",
    "title": "Dâu",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812810/covers/l3dlkiijk6stdve4jejy.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812809/tracks/dci2jksgt0hixziorukj.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 124,
    "mood": "Happy",
    "key": "B",
    "scale": "minor",
    "danceability": 0.7472,
    "energy": 0.1674
  },
  {
    "artistName": "T.R.I",
    "title": "Cuộc Gọi Cuối",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812806/covers/lkpftehruaf8nacjozsi.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812805/tracks/dv3xdckyf8qiunlhtkej.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 130,
    "mood": "Melancholic",
    "key": "D",
    "scale": "minor",
    "danceability": 0.5472,
    "energy": 0.1286
  },
  {
    "artistName": "T.R.I",
    "title": "Coming Back",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812803/covers/hygh8hxwq6udtow60csn.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812801/tracks/wodgeuproxgvkffeilgd.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 97,
    "mood": "Melancholic",
    "key": "C",
    "scale": "minor",
    "danceability": 0.5315,
    "energy": 0.156
  },
  {
    "artistName": "T.R.I",
    "title": "Chúng Ta Sau Này",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812799/covers/zfd6yfqnuhhrbcytfbd4.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812798/tracks/pfgemaf70kognn0lumgy.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 98,
    "mood": "Melancholic",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.43,
    "energy": 0.0507
  },
  {
    "artistName": "T.R.I",
    "title": "Cho Ngày Không Còn Nhau",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812795/covers/vqbxjgi72vlwg6gvtfzs.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812794/tracks/ngvh7dcfj8bexgfkmshn.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 96,
    "mood": "Melancholic",
    "key": "F",
    "scale": "minor",
    "danceability": 0.4325,
    "energy": 0.0349
  },
  {
    "artistName": "T.R.I",
    "title": "Ánh Sao Và Bầu Trời",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812766/covers/bqvxgtoujlub9lgvjaxq.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812765/tracks/qjtd77umkj8yqlwyqsxv.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 92,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "minor",
    "danceability": 0.2877,
    "energy": 0.1362
  },
  {
    "artistName": "T.R.I",
    "title": "9 8 7",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746812747/covers/ctnmlq1wv4tty0su22k1.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746812746/tracks/tj0ozviwb5yp1pb1xpsw.mp3",
    "genreNames": [
      "Instrumental",
      "Lo-fi"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.3785,
    "energy": 0.0921
  },
  {
    "artistName": "The Chainsmokers",
    "title": "Addicted (ਆਦੀ)",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1746852514/covers/qspoazedxayqpy2p9vj8.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1746852512/tracks/wjldgkslhwytd9iyzkzh.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-10'),
    "tempo": 120,
    "mood": "Happy",
    "key": "F",
    "scale": "minor",
    "danceability": 0.6877,
    "energy": 0.3562
  },
  {
    "artistName": "the cozy lofi",
    "title": "past is past",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746795413/covers/xbuwwsolc3ls0aszfhdc.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746795412/tracks/ffln2k2ekeu25ezpnhl1.mp3",
    "genreNames": [
      "Lo-fi",
      "Classical"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 84,
    "mood": "Happy",
    "key": "A",
    "scale": "minor",
    "danceability": 0.6924,
    "energy": 0.1847
  },
  {
    "artistName": "the cozy lofi",
    "title": "echoes of peace",
    "coverUrl": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746801011/covers/zlgewgmneughdvo8qyhl.jpg",
    "audioUrl": "https://res.cloudinary.com/dtvrby0wr/video/upload/v1746801010/tracks/mu9rzz3d9subqtirl3j8.mp3",
    "genreNames": [
      "Lo-fi",
      "Classical"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 62,
    "mood": "Melancholic",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.4271,
    "energy": 0.157
  },
  {
    "artistName": "The Death Set",
    "title": "Boys/Girls",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Death%20Set-Boys%2FGirls&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783016/tracks/nhor15fg03uykzqqthq4.mp3",
    "genreNames": [
      "Rock",
      "Punk"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 114,
    "mood": "Energetic",
    "key": "E",
    "scale": "major",
    "danceability": 0.438,
    "energy": 0.91
  },
  {
    "artistName": "The Death Set",
    "title": "Negative Thinking",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Death%20Set-Negative%20Thinking&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783011/tracks/pgy2n3xdi3fa4am4xzpc.mp3",
    "genreNames": [
      "Rock",
      "Metal"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 185,
    "mood": "Energetic",
    "key": "G",
    "scale": "major",
    "danceability": 0.5427,
    "energy": 0.8707
  },
  {
    "artistName": "The Death Set",
    "title": "Impossible",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Death%20Set-Impossible&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783004/tracks/iaape3bpzmkmvdphit1q.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 86,
    "mood": "Energetic",
    "key": "C#",
    "scale": "major",
    "danceability": 0.5574,
    "energy": 0.9001
  },
  {
    "artistName": "The Death Set",
    "title": "Zombie",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Death%20Set-Zombie&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782999/tracks/q2itsvg6uomz2kewf5sm.mp3",
    "genreNames": [
      "Rock",
      "Punk"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 127,
    "mood": "Energetic",
    "key": "F",
    "scale": "major",
    "danceability": 0.458,
    "energy": 0.9535
  },
  {
    "artistName": "The Death Set",
    "title": "Around the World",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Death%20Set-Around%20the%20World&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782993/tracks/hua8myafq2lumkmvknjq.mp3",
    "genreNames": [
      "World",
      "Hip-Hop",
      "Trap"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 185,
    "mood": "Energetic",
    "key": "G",
    "scale": "minor",
    "danceability": 0.5802,
    "energy": 0.6028
  },
  {
    "artistName": "The Death Set",
    "title": "Intermission",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Death%20Set-Intermission&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782989/tracks/qg5v16mjyureij6ofjuu.mp3",
    "genreNames": [
      "Rock",
      "Punk"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 103,
    "mood": "Energetic",
    "key": "B",
    "scale": "major",
    "danceability": 0.5922,
    "energy": 0.9527
  },
  {
    "artistName": "The Death Set",
    "title": "Paranoia",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Death%20Set-Paranoia&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782984/tracks/ircrxeja518bnlmwxo5p.mp3",
    "genreNames": [
      "Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 134,
    "mood": "Energetic",
    "key": "D",
    "scale": "major",
    "danceability": 0.4264,
    "energy": 0.7808
  },
  {
    "artistName": "The Men",
    "title": "Think",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Men-Think&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783206/tracks/co8pcuapt28oilvdus1g.mp3",
    "genreNames": [
      "Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 123,
    "mood": "Energetic",
    "key": "B",
    "scale": "minor",
    "danceability": 0.2875,
    "energy": 0.6959
  },
  {
    "artistName": "The Men",
    "title": "Open Your Heart",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Men-Open%20Your%20Heart&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783199/tracks/ylqyxf5eejnc0oebiw7y.mp3",
    "genreNames": [
      "Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 88,
    "mood": "Energetic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.2513,
    "energy": 0.722
  },
  {
    "artistName": "The Men",
    "title": "Bataille",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Men-Bataille&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783191/tracks/qemk4dakpsoqg81lisvv.mp3",
    "genreNames": [
      "Hip-Hop",
      "Trap"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 140,
    "mood": "Energetic",
    "key": "G#",
    "scale": "minor",
    "danceability": 0.2066,
    "energy": 0.7147
  },
  {
    "artistName": "The Men",
    "title": "Take Me To The Other Side",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Men-Take%20Me%20To%20The%20Other%20Side&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783184/tracks/q94n2pdp2rzizx1y2ncm.mp3",
    "genreNames": [
      "Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 99,
    "mood": "Energetic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.2205,
    "energy": 0.7893
  },
  {
    "artistName": "The Men",
    "title": "Nikkis Cube",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=The%20Men-Nikkis%20Cube&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783177/tracks/eobyn5jp2v3ftmxf646n.mp3",
    "genreNames": [
      "Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 100,
    "mood": "Intense",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.2701,
    "energy": 0.7775
  },
  {
    "artistName": "tlinh",
    "title": "Em Là Châu Báu",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779910/covers/g6cmnp9psrvtqajwmv8l.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779908/tracks/jf3ms45gvetw1tc0ykqs.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 127,
    "mood": "Happy",
    "key": "D",
    "scale": "minor",
    "danceability": 0.8159,
    "energy": 0.5364
  },
  {
    "artistName": "tlinh",
    "title": "nữ siêu anh hùng - slowed + reverb",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779894/covers/vn6zio3yapkvxgj5vwwa.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779892/tracks/ruhb0evncx3i2ydgmvfm.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 95,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "major",
    "danceability": 0.4287,
    "energy": 0.2777
  },
  {
    "artistName": "tlinh",
    "title": "Out Of Body (Live at GENfest 24)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779876/covers/knj1gzwacbszgfcaczqx.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779875/tracks/y8xvttbyhan7nbhory0m.mp3",
    "genreNames": [
      "Instrumental",
      "Lo-fi"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 88,
    "mood": "Melancholic",
    "key": "G",
    "scale": "minor",
    "danceability": 0.1564,
    "energy": 0.2877
  },
  {
    "artistName": "tlinh",
    "title": "Mắt Xanh (Live at GENfest 24)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779863/covers/mwfsf88or3su8rwau8oq.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779862/tracks/nmjuejw3anhlcy6z7jpy.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 105,
    "mood": "Moderate",
    "key": "F",
    "scale": "major",
    "danceability": 0.5021,
    "energy": 0.5616
  },
  {
    "artistName": "tlinh",
    "title": "Xui Hay Vui",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746779851/covers/xp4igigcizim7pyh5plk.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746779850/tracks/wvg3mjngvch0zhpspx5x.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 95,
    "mood": "Happy",
    "key": "E",
    "scale": "major",
    "danceability": 0.7219,
    "energy": 0.5252
  },
  {
    "artistName": "tlinh",
    "title": "Vài Câu Nói Có Khiến Người Thay Đổi",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745438765/vaicaunoicokhiennguoithaydoi_mlo7k0.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745438771/vaicaunoicokhiennguoithaydoi_aqkrcc.mp3",
    "genreNames": [
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "GREY D"
    ],
    "playCount": 50,
    "releaseDate": new Date('2025-03-25'),
    "tempo": 95,
    "mood": "Emotional",
    "key": "Ab",
    "scale": "major",
    "danceability": 0.65,
    "energy": 0.6
  },
  {
    "artistName": "tlinh",
    "title": "Vứt Zác",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745438553/vutzac_d0drbh.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745438570/V%E1%BB%A9t_Z%C3%A1c_rzwagg.mp3",
    "genreNames": [
      "Hip-Hop",
      "V-Pop",
      "Rap"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "Low G"
    ],
    "playCount": 41,
    "releaseDate": new Date('2025-02-13'),
    "tempo": 132,
    "mood": "Bold",
    "key": "C",
    "scale": "minor",
    "danceability": 0.83,
    "energy": 0.85
  },
  {
    "artistName": "Unknown Artist",
    "title": "Chiá»u HÃ´m áº¤y (Intro)",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Unknown%20Artist-Chi%C3%A1%C2%BB%C2%81u%20H%C3%83%C2%B4m%20%C3%A1%C2%BA%C2%A4y%20(Intro)&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746788216/tracks/ktqcevns4abxpst41lsp.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 85,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.3358,
    "energy": 0.206
  },
  {
    "artistName": "Vũ.",
    "title": "ĐÃ TỪNG LÀ",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781830/covers/rbegq9ead1ky4m6fj5e6.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781829/tracks/ugljxiiak57rwtikkho1.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 86,
    "mood": "Melancholic",
    "key": "G",
    "scale": "minor",
    "danceability": 0.3679,
    "energy": 0.1351
  },
  {
    "artistName": "Vũ.",
    "title": "ĐÃ TỪNG LÀ - Acoustic Version",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781826/covers/jncod0samuv547blyxa8.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781824/tracks/ddiwyhop1usn9ts3tjgx.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 88,
    "mood": "Melancholic",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.3682
  },
  {
    "artistName": "Vũ.",
    "title": "Đợi - 2023 Version",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781821/covers/yv21zxkp4dfzyx9s3rai.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781820/tracks/dotuy6b9bvtygfizupyq.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 113,
    "mood": "Melancholic",
    "key": "D#",
    "scale": "minor",
    "danceability": 0.5744,
    "energy": 0.137
  },
  {
    "artistName": "Vũ.",
    "title": "Lời Yêu Em",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781795/covers/k9vh8vovzgyuuvudkozw.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781794/tracks/vxamkn9rs8bqdknqw3qq.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 56,
    "mood": "Melancholic",
    "key": "E",
    "scale": "major",
    "danceability": 0.4044,
    "energy": 0.0142
  },
  {
    "artistName": "Vũ.",
    "title": "Một Giấc Mơ (feat. Kimmese)",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781769/covers/twj4u7qfoemfi4qu32ky.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781768/tracks/myp5kmmjeyjbl6medbpp.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 66,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.5668,
    "energy": 0.2318
  },
  {
    "artistName": "Vũ.",
    "title": "Mùa Mưa Ngâu Nằm Cạnh",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781744/covers/gegy2xkii8wcy3guup7t.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781743/tracks/kzcfflu2qfwhsopcc5ya.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 148,
    "mood": "Melancholic",
    "key": "F",
    "scale": "major",
    "danceability": 0.4972,
    "energy": 0.0741
  },
  {
    "artistName": "Vũ.",
    "title": "Ngỡ Như Là",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781722/covers/ubyjigvs3rvjfws4eclb.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781721/tracks/crlln6lnzar20fit9g3l.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop",
      "Indie"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 60,
    "mood": "Melancholic",
    "key": "G",
    "scale": "major",
    "danceability": 0.574,
    "energy": 0.1824
  },
  {
    "artistName": "Vũ.",
    "title": "Phút Ban Đầu",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781705/covers/yvd4e9oog8hjimkl73be.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781703/tracks/lgpjhbctarzohkc4uzvd.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 69,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "major",
    "danceability": 0.5047,
    "energy": 0.0625
  },
  {
    "artistName": "Vũ.",
    "title": "Tâm Sự Của Ta",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781689/covers/h1ync8dyzm15cofggbvy.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781687/tracks/wegmdqffaiizkbpjopfh.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 78,
    "mood": "Melancholic",
    "key": "C",
    "scale": "major",
    "danceability": 0.3983,
    "energy": 0.0115
  },
  {
    "artistName": "Vũ.",
    "title": "Thằng Nam Khóc",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746781669/covers/x2pvl8tfepsshyttjfst.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746781667/tracks/tiip4xpefjvoizjos3cv.mp3",
    "genreNames": [
      "Ballad",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 69,
    "mood": "Melancholic",
    "key": "Ab",
    "scale": "major",
    "danceability": 0.3984,
    "energy": 0.1177
  },
  {
    "artistName": "Vũ.",
    "title": "Đông Kiếm Em",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746280306/dongkiemem_nstwin_tuqq71.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746280251/%C4%90%C3%B4ng_Ki%E1%BA%BFm_Em_knvcpg.mp3",
    "genreNames": [
      "V-Pop",
      "Ballad"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 81,
    "releaseDate": new Date('2025-04-05'),
    "tempo": 101,
    "mood": "Chill",
    "key": "E",
    "scale": "minor",
    "danceability": 0.65,
    "energy": 0.35
  },
  {
    "artistName": "Vũ.",
    "title": "Lạ Lùng",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746280313/lalung_jspxir_pthcam.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746280265/L%E1%BA%A1_L%C3%B9ng_jmt6ay.mp3",
    "genreNames": [
      "Indie",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 91,
    "releaseDate": new Date('2025-03-19'),
    "tempo": 73,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "major",
    "danceability": 0.72,
    "energy": 0.4
  },
  {
    "artistName": "Vũ.",
    "title": "Vì Anh Đâu Có Biết",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746280308/frou2hv5xqhghbnlervy_cbhi9q.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746280279/V%C3%AC_Anh_%C4%90%C3%A2u_C%C3%B3_Bi%E1%BA%BFt_zfawia.mp3",
    "genreNames": [
      "V-Pop",
      "Ballad"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 100,
    "releaseDate": new Date('2025-01-31'),
    "tempo": 117,
    "mood": "Energetic",
    "key": "Eb",
    "scale": "minor",
    "danceability": 0.98,
    "energy": 0.82
  },
  {
    "artistName": "Wren Evans",
    "title": "Vùng Trời Bình Yên - 25th Làn Sóng Xanh",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746782792/covers/idb24dsbl0pu0qsqynoc.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782791/tracks/cy7zpcjgnjwhxnqfwnbs.mp3",
    "genreNames": [
      "Pop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 108,
    "mood": "Melancholic",
    "key": "E",
    "scale": "minor",
    "danceability": 0.7359,
    "energy": 0.2842
  },
  {
    "artistName": "Wren Evans",
    "title": "Việt Kiều Đi Vào Club - DXY Remix",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746782788/covers/npsdl3zjosatk97cnalq.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782786/tracks/oskel9fn7muoftnnt9g5.mp3",
    "genreNames": [
      "V-Pop",
      "Electronic",
      "Dance"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 130,
    "mood": "Energetic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.6352,
    "energy": 0.9589
  },
  {
    "artistName": "Wren Evans",
    "title": "Fever",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746782784/covers/epej7bgdlgsnnbtkisel.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782783/tracks/qggyz7dvcfm3knfh7w48.mp3",
    "genreNames": [
      "Country"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 1,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 117,
    "mood": "Happy",
    "key": "C#",
    "scale": "major",
    "danceability": 0.8089,
    "energy": 0.4267
  },
  {
    "artistName": "Wren Evans",
    "title": "FASHION NOVA",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746782775/covers/ztmbp2u4foviz3makl0g.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782774/tracks/qfnno7ozqfkxrrsnx9tr.mp3",
    "genreNames": [
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 128,
    "mood": "Happy",
    "key": "G#",
    "scale": "minor",
    "danceability": 0.8678,
    "energy": 0.3379
  },
  {
    "artistName": "Wren Evans",
    "title": "FASHION 3",
    "coverUrl": "https://res.cloudinary.com/dafdgvrgo/image/upload/v1746782771/covers/gy1bcbwhrsueado5zwyz.jpg",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746782769/tracks/k0mmujhufvkamjdjb3yc.mp3",
    "genreNames": [
      "Rap",
      "Hip-Hop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 129,
    "mood": "Happy",
    "key": "B",
    "scale": "minor",
    "danceability": 0.8924,
    "energy": 0.3195
  },
  {
    "artistName": "Wren Evans",
    "title": "Cứu Lấy Âm Nhạc",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745434174/cuulayamnhac_lic7qy.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745434167/C%E1%BB%A9u_L%E1%BA%A5y_%C3%82m_Nh%E1%BA%A1c_f0y2xf.mp3",
    "genreNames": [
      "Hip-Hop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "itsnk"
    ],
    "playCount": 70,
    "releaseDate": new Date('2025-05-01'),
    "tempo": 135,
    "mood": "Energetic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.85,
    "energy": 0.8
  },
  {
    "artistName": "Wren Evans",
    "title": "Để Ý",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746282404/dey_jognc1.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746282342/%C4%90%E1%BB%83_%C3%9D_qrwsbs.mp3",
    "genreNames": [
      "R&B",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 76,
    "releaseDate": new Date('2025-03-04'),
    "tempo": 95,
    "mood": "Smooth",
    "key": "F",
    "scale": "minor",
    "danceability": 0.78,
    "energy": 0.65
  },
  {
    "artistName": "Wren Evans",
    "title": "Từng Quen",
    "coverUrl": "https://res.cloudinary.com/dwln9t6dv/image/upload/v1746282419/tungquen_tjrtqe.jpg",
    "audioUrl": "https://res.cloudinary.com/dwln9t6dv/video/upload/v1746281549/T%E1%BB%ABng_Quen_hyfhiq.mp3",
    "genreNames": [
      "Hip-Hop",
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [
      "itsnk"
    ],
    "playCount": 80,
    "releaseDate": new Date('2025-02-24'),
    "tempo": 150,
    "mood": "Energetic",
    "key": "C",
    "scale": "major",
    "danceability": 0.81,
    "energy": 0.88
  },
  {
    "artistName": "Wren Evans",
    "title": "Thích Em Hơi Nhiều",
    "coverUrl": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745433944/thichemhoinhieu_n1befr.jpg",
    "audioUrl": "https://res.cloudinary.com/dbwhalglx/video/upload/v1745433941/Th%C3%ADch_Em_H%C6%A1i_Nhi%E1%BB%81u_-_The_Goodboi_Flip_jhiypj.mp3",
    "genreNames": [
      "V-Pop"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 70,
    "releaseDate": new Date('2025-02-19'),
    "tempo": 110,
    "mood": "Romantic",
    "key": "G",
    "scale": "major",
    "danceability": 0.76,
    "energy": 0.68
  },
  {
    "artistName": "Z'EV",
    "title": "Ninth Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Ninth%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783105/tracks/oki03dguobcqnbpimhmg.mp3",
    "genreNames": [
      "Jazz"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 109,
    "mood": "Moderate",
    "key": "C#",
    "scale": "minor",
    "danceability": 0.1973,
    "energy": 0.4671
  },
  {
    "artistName": "Z'EV",
    "title": "Eighth Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Eighth%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783102/tracks/hbrc4meyr58g5e16sxzh.mp3",
    "genreNames": [
      "Jazz"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 118,
    "mood": "Moderate",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.1853,
    "energy": 0.5424
  },
  {
    "artistName": "Z'EV",
    "title": "Seventh Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Seventh%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783100/tracks/zn1iawmyaggljka8zc9u.mp3",
    "genreNames": [
      "Jazz"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 99,
    "mood": "Melancholic",
    "key": "A",
    "scale": "minor",
    "danceability": 0.2073,
    "energy": 0.2578
  },
  {
    "artistName": "Z'EV",
    "title": "Sixth Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Sixth%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783097/tracks/jh7in7cpcegdemftrath.mp3",
    "genreNames": [
      "Experimental"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 101,
    "mood": "Intense",
    "key": "C",
    "scale": "minor",
    "danceability": 0.2493,
    "energy": 0.8207
  },
  {
    "artistName": "Z'EV",
    "title": "Fifth Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Fifth%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783095/tracks/kgpjm7kizepitqixoipk.mp3",
    "genreNames": [
      "Jazz"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 105,
    "mood": "Intense",
    "key": "G",
    "scale": "minor",
    "danceability": 0.2597,
    "energy": 0.8241
  },
  {
    "artistName": "Z'EV",
    "title": "Fourth Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Fourth%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783092/tracks/fiulkndyt2onxugilx8a.mp3",
    "genreNames": [
      "Instrumental"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 93,
    "mood": "Moderate",
    "key": "F#",
    "scale": "minor",
    "danceability": 0.1856,
    "energy": 0.4442
  },
  {
    "artistName": "Z'EV",
    "title": "Third Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Third%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783090/tracks/dqyse4r4dhryhrbfzbco.mp3",
    "genreNames": [
      "Ambient",
      "Instrumental"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 112,
    "mood": "Melancholic",
    "key": "C#",
    "scale": "minor",
    "danceability": 0.0838
  },
  {
    "artistName": "Z'EV",
    "title": "Second Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-Second%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783088/tracks/idzdyok7imlxzdabsa8m.mp3",
    "genreNames": [
      "Instrumental"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 88,
    "mood": "Moderate",
    "key": "G",
    "scale": "minor",
    "danceability": 0.2111,
    "energy": 0.5609
  },
  {
    "artistName": "Z'EV",
    "title": "First Movement",
    "coverUrl": "https://api.dicebear.com/8.x/shapes/svg?seed=Z'EV-First%20Movement&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360",
    "audioUrl": "https://res.cloudinary.com/dafdgvrgo/video/upload/v1746783085/tracks/qmygx5tcqlq4ii9qownp.mp3",
    "genreNames": [
      "Electronic",
      "Instrumental"
    ],
    "labelName": null,
    "featuredArtistNames": [],
    "playCount": 0,
    "releaseDate": new Date('2025-05-09'),
    "tempo": 91,
    "mood": "Intense",
    "key": "D",
    "scale": "minor",
    "danceability": 0.3065,
    "energy": 0.9006
  }
];
