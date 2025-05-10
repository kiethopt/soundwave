import { Role } from '@prisma/client';

export interface ArtistData {
  user: { email: string; username: string; name: string; };
  profile: { artistName: string; bio: string; avatar: string; socialMediaLinks?: { facebook?: string; instagram?: string; }; labelName?: string; };
}

export const artists: ArtistData[] = [
  {
    "user": {
      "email": "amee@soundwave.com",
      "username": "amee_artist",
      "name": "AMEE"
    },
    "profile": {
      "artistName": "AMEE",
      "bio": "AMEE (tên thật: Trần Huyền My) là ca sĩ người Việt Nam. Cô được biết đến nhiều hơn sau khi phát hành ca khúc \"Anh Nhà Ở Đâu Thế\" đạt hơn 100 triệu lượt xem trên YouTube.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860145/amee_bqf6zt.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/ameest319",
        "instagram": "https://www.instagram.com/ameemee_m"
      },
      "labelName": "Warner Music Vietnam"
    }
  },
  {
    "user": {
      "email": "andree@soundwave.com",
      "username": "andree_artist",
      "name": "Andree Right Hand"
    },
    "profile": {
      "artistName": "Andree Right Hand",
      "bio": "Andree Right Hand là một nhà sản xuất âm nhạc và rapper người Việt Nam. Anh nổi tiếng với vai trò là thành viên của SpaceSpeakers và nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743874323/andree_bpcik4.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/andreerighthand",
        "instagram": "https://www.instagram.com/andreerighthand"
      },
      "labelName": "SPACESPEAKERS LABEL"
    }
  },
  {
    "user": {
      "email": "bigdaddy@soundwave.com",
      "username": "bigdaddy_artist",
      "name": "BigDaddy"
    },
    "profile": {
      "artistName": "BigDaddy",
      "bio": "BigDaddy (tên thật: Trần Tất Vũ) là một rapper, ca sĩ người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436100/seed/artists/p2froifvqaanlnnln9pn.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/bigdaddy.official",
        "instagram": "https://www.instagram.com/bigdaddyofficial"
      },
      "labelName": "SPACESPEAKERS LABEL"
    }
  },
  {
    "user": {
      "email": "binz@soundwave.com",
      "username": "binz_artist",
      "name": "Binz"
    },
    "profile": {
      "artistName": "Binz",
      "bio": "Binz là một ca sĩ, nhạc sĩ người Việt Nam, được biết đến sau khi tham gia chương trình Giọng hát Việt 2015.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435226/seed/artists/hedfsp76waayhtmlheea.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/binz.official",
        "instagram": "https://www.instagram.com/binz.official"
      }
    }
  },
  {
    "user": {
      "email": "bray@soundwave.com",
      "username": "bray_artist",
      "name": "B Ray"
    },
    "profile": {
      "artistName": "B Ray",
      "bio": "B Ray tên thật là Trần Thiện Thanh Bảo, là một nam rapper người Mỹ gốc Việt.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743868367/Bray_rmfple.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/yunbray110",
        "instagram": "https://www.instagram.com/yunbray110"
      }
    }
  },
  {
    "user": {
      "email": "dalab@soundwave.com",
      "username": "dalab_group_artist",
      "name": "Da LAB"
    },
    "profile": {
      "artistName": "Da LAB",
      "bio": "Da LAB là một nhóm nhạc rap/pop nổi tiếng của Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437218/seed/artists/lt9szwlbowicbszcmr3l.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/dalab.official",
        "instagram": "https://www.instagram.com/dalab.official"
      }
    }
  },
  {
    "user": {
      "email": "den@soundwave.com",
      "username": "den_artist",
      "name": "Đen"
    },
    "profile": {
      "artistName": "Đen",
      "bio": "Đen (tên thật: Nguyễn Đức Cường) là một nam rapper, nhạc sĩ người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436100/seed/artists/o7ba5g0bwho2hyiyqada.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/den.vau.official",
        "instagram": "https://www.instagram.com/den.vau"
      }
    }
  },
  {
    "user": {
      "email": "duongdomic@soundwave.com",
      "username": "duongdomic_artist",
      "name": "Dương Domic"
    },
    "profile": {
      "artistName": "Dương Domic",
      "bio": "Dương Domic là một ca sĩ, nhạc sĩ người Việt Nam, được biết đến sau khi tham gia chương trình Giọng hát Việt 2015.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435226/seed/artists/hedfsp76waayhtmlheea.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/duongdomic.official",
        "instagram": "https://www.instagram.com/duongdomic.official"
      }
    }
  },
  {
    "user": {
      "email": "duymanh@soundwave.com",
      "username": "duymanh_artist",
      "name": "Duy Mạnh"
    },
    "profile": {
      "artistName": "Duy Mạnh",
      "bio": "Duy Mạnh là một ca sĩ/nhạc sĩ nổi tiếng người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435097/seed/artists/cmh4t9es4o3cex4rd5pi.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/duymanh.official",
        "instagram": "https://www.instagram.com/duymanh.official"
      }
    }
  },
  {
    "user": {
      "email": "emceel.dalab@soundwave.com",
      "username": "emceel_dalab_artist",
      "name": "Emcee L (Da LAB)"
    },
    "profile": {
      "artistName": "Emcee L (Da LAB)",
      "bio": "Emcee L (tên thật: Nguyễn Hoàng Long) là thành viên của nhóm nhạc Da LAB.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437170/seed/artists/p73vypvzevnclbznwgb7.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/emceel.dalab",
        "instagram": "https://www.instagram.com/emceel.dalab"
      }
    }
  },
  {
    "user": {
      "email": "giangnguyen@soundwave.com",
      "username": "giangnguyen_artist",
      "name": "Giang Nguyễn"
    },
    "profile": {
      "artistName": "Giang Nguyễn",
      "bio": "Giang Nguyễn là một nghệ sĩ.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437450/seed/artists/tn47evfkrjnizguscjzx.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/giangnguyen.music",
        "instagram": "https://www.instagram.com/giangnguyen.music"
      }
    }
  },
  {
    "user": {
      "email": "giangpham@soundwave.com",
      "username": "giangpham_artist",
      "name": "Giang Phạm"
    },
    "profile": {
      "artistName": "Giang Phạm",
      "bio": "Giang Phạm là một nghệ sĩ.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437791/seed/artists/fiujck5nz4efdge47edn.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/giangpham.music",
        "instagram": "https://www.instagram.com/giangpham.music"
      }
    }
  },
  {
    "user": {
      "email": "greyd@soundwave.com",
      "username": "greyd_artist",
      "name": "Grey D"
    },
    "profile": {
      "artistName": "GREY D",
      "bio": "Grey D (tên thật: Đoàn Thế Lân) là một ca sĩ, nhạc sĩ trẻ người Việt Nam, cựu thành viên nhóm Monstar.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435226/seed/artists/hedfsp76waayhtmlheea.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/official.greyd",
        "instagram": "https://www.instagram.com/greyd.official"
      }
    }
  },
  {
    "user": {
      "email": "haanhtuan@soundwave.com",
      "username": "haanhtuan_artist",
      "name": "Hà Anh Tuấn"
    },
    "profile": {
      "artistName": "Hà Anh Tuấn",
      "bio": "Hà Anh Tuấn là một nam ca sĩ người Việt Nam, được biết đến sau khi tham gia cuộc thi Sao Mai điểm hẹn 2006.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435645/seed/artists/jxj0vpoj5khtovnvoie8.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/haanhtuan.official",
        "instagram": "https://www.instagram.com/haanhtuan.official"
      }
    }
  },
  {
    "user": {
      "email": "hieuthuhai@soundwave.com",
      "username": "hieuthuhai_artist",
      "name": "HIEUTHUHAI"
    },
    "profile": {
      "artistName": "HIEUTHUHAI",
      "bio": "HIEUTHUHAI tên thật Trần Minh Hiếu, là một rapper và ca sĩ người Việt Nam. Anh được biết đến rộng rãi qua chương trình King of Rap và Rap Việt mùa 2.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743867958/HIEUTHUHAI_bh8xzk.webp",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/HIEUTHUHAIOFFICIAL",
        "instagram": "https://www.instagram.com/hieuthuhai"
      }
    }
  },
  {
    "user": {
      "email": "hoangdung@soundwave.com",
      "username": "hoangdung_artist",
      "name": "Hoàng Dũng"
    },
    "profile": {
      "artistName": "Hoàng Dũng",
      "bio": "Hoàng Dũng là một nam ca sĩ, nhạc sĩ người Việt Nam, được biết đến sau khi tham gia chương trình Giọng hát Việt 2015.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436100/seed/artists/j0lg1ewlfdgi2p4aesg4.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/hoangdunglive",
        "instagram": "https://www.instagram.com/hoangdunglive"
      }
    }
  },
  {
    "user": {
      "email": "hoangton@soundwave.com",
      "username": "hoangton_artist",
      "name": "Hoàng Tôn"
    },
    "profile": {
      "artistName": "Hoàng Tôn",
      "bio": "Nguyễn Hoàng Tôn là một nam ca sĩ, nhạc sĩ và nhà sản xuất âm nhạc người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743867515/Hoang_Ton_i6mzhx.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/hoangton.official",
        "instagram": "https://www.instagram.com/hoangton.official"
      }
    }
  },
  {
    "user": {
      "email": "itsnk@soundwave.com",
      "username": "itsnk_artist",
      "name": "itsnk"
    },
    "profile": {
      "artistName": "itsnk",
      "bio": "itsnk là một nghệ sĩ/producer âm nhạc trẻ tài năng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743498099/testAlbum/itsnk/e1m4ffov0faqob52fhqp.avif",
      "socialMediaLinks": {}
    }
  },
  {
    "user": {
      "email": "jgkid.dalab@soundwave.com",
      "username": "jgkid_dalab_artist",
      "name": "JGKiD (Da LAB)"
    },
    "profile": {
      "artistName": "JGKiD (Da LAB)",
      "bio": "JGKiD (tên thật: Võ Việt Phương) là thành viên của nhóm nhạc Da LAB.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437170/seed/artists/h2detkblxgzvbduzd6px.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/jgkid.dalab",
        "instagram": "https://www.instagram.com/jgkid.dalab"
      }
    }
  },
  {
    "user": {
      "email": "justatee@soundwave.com",
      "username": "justatee_artist",
      "name": "JustaTee"
    },
    "profile": {
      "artistName": "JustaTee",
      "bio": "JustaTee (tên thật: Nguyễn Thanh Tuấn) là một nam ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435646/seed/artists/ykrdfrtrkl5fub0smtph.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/JustaTeeMusic",
        "instagram": "https://www.instagram.com/justatee"
      }
    }
  },
  {
    "user": {
      "email": "karik@soundwave.com",
      "username": "karik_artist",
      "name": "Karik"
    },
    "profile": {
      "artistName": "Karik",
      "bio": "Karik (tên thật: Phạm Hoàng Khoa) là một rapper, nhạc sĩ người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436100/seed/artists/eq6c8fvi4r609zfmza9z.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/karik.official",
        "instagram": "https://www.instagram.com/karik.koniz"
      }
    }
  },
  {
    "user": {
      "email": "krisv@soundwave.com",
      "username": "krisv_artist",
      "name": "Kris V"
    },
    "profile": {
      "artistName": "Kris V",
      "bio": "Kris V là một nghệ sĩ trẻ trong làng nhạc Việt, với phong cách âm nhạc đặc trưng của mình.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743874348/kris_v_nucwck.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/krisv.official",
        "instagram": "https://www.instagram.com/krisv.official"
      }
    }
  },
  {
    "user": {
      "email": "langld@soundwave.com",
      "username": "langld_artist",
      "name": "Lăng LD"
    },
    "profile": {
      "artistName": "Lăng LD",
      "bio": "Lăng LD là một rapper Việt Nam, thành viên nhóm Rap nhạc GrimReaper Team.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860556/lang_ld_v0pbr0.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/langld.westside",
        "instagram": "https://www.instagram.com/langld.vn"
      }
    }
  },
  {
    "user": {
      "email": "lehieu@soundwave.com",
      "username": "lehieu_artist",
      "name": "Lê Hiếu"
    },
    "profile": {
      "artistName": "Lê Hiếu",
      "bio": "Lê Hiếu là một nam ca sĩ/nhạc sĩ.",
      "avatar": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745432001/lehieu_ixrrtx.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/lehieu.official",
        "instagram": "https://www.instagram.com/lehieu.official"
      }
    }
  },
  {
    "user": {
      "email": "linhcao@soundwave.com",
      "username": "linhcao_artist",
      "name": "Linh Cáo"
    },
    "profile": {
      "artistName": "Linh Cáo",
      "bio": "Linh Cáo là một nữ ca sĩ/nhạc sĩ.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437588/seed/artists/okk0pthyl5mgjpcvt7yi.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/linhcao.official",
        "instagram": "https://www.instagram.com/linhcao.official"
      }
    }
  },
  {
    "user": {
      "email": "lowg@soundwave.com",
      "username": "lowg_artist",
      "name": "Low G"
    },
    "profile": {
      "artistName": "Low G",
      "bio": "Low G là 1 rapper nổi tiếng Việt Nam. Anh có giọng rap đặc trưng cũng như khả năng rap mượt vượt trội so với nhiều rapper trẻ thế hệ mới.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439236/testAlbum/tlinh%2C%20Low%20G/FLVR/fwt1lfhfrzqq6dchl8nw.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/low.to.the.g",
        "instagram": "https://www.instagram.com/lf.low.g"
      }
    }
  },
  {
    "user": {
      "email": "marzuz@soundwave.com",
      "username": "marzuz_artist",
      "name": "marzuz"
    },
    "profile": {
      "artistName": "marzuz",
      "bio": "marzuz tên thật là Trần My Anh, là một ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743868415/marzuz_cf4kcy.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/marzuzisntreal",
        "instagram": "https://www.instagram.com/marzuzisntreal"
      }
    }
  },
  {
    "user": {
      "email": "mono@soundwave.com",
      "username": "mono_artist",
      "name": "MONO"
    },
    "profile": {
      "artistName": "MONO",
      "bio": "MONO (tên thật: Nguyễn Việt Hoàng) là một nam ca sĩ trẻ người Việt Nam, em trai của Sơn Tùng M-TP.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436100/seed/artists/dtszf3obqaveuyffavla.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/mono.official",
        "instagram": "https://www.instagram.com/mono.official"
      }
    }
  },
  {
    "user": {
      "email": "mrsiro@soundwave.com",
      "username": "mrsiro_artist",
      "name": "Mr. Siro"
    },
    "profile": {
      "artistName": "Mr. Siro",
      "bio": "Mr. Siro (tên thật: Vương Quốc Tuân) là một ca sĩ, nhạc sĩ người Việt Nam, nổi tiếng với các bản ballad buồn.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435645/seed/artists/rifivsaygmhujwcjytby.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/mrsiro.official",
        "instagram": "https://www.instagram.com/mrsiro.official"
      }
    }
  },
  {
    "user": {
      "email": "noophuocthinh@soundwave.com",
      "username": "noophuocthinh_artist",
      "name": "Noo Phước Thịnh"
    },
    "profile": {
      "artistName": "Noo Phước Thịnh",
      "bio": "Noo Phước Thịnh là một nam ca sĩ nổi tiếng người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436100/seed/artists/bglhujn8yinpi6zkqzyu.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/NooPhuocThinh",
        "instagram": "https://www.instagram.com/noophuocthinh"
      }
    }
  },
  {
    "user": {
      "email": "obito@soundwave.com",
      "username": "obito_artist",
      "name": "Obito"
    },
    "profile": {
      "artistName": "Obito",
      "bio": "Obito là một nghệ sĩ hip hop Việt Nam nổi tiếng với phong cách âm nhạc lo-fi và lyric sâu sắc.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743859970/Obito_rmccxb.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/youngtobiedasick",
        "instagram": "https://www.instagram.com/youngtobieedasick"
      }
    }
  },
  {
    "user": {
      "email": "onionn@soundwave.com",
      "username": "onionn_producer",
      "name": "Onionn"
    },
    "profile": {
      "artistName": "Onionn",
      "bio": "Onionn là một nhà sản xuất âm nhạc tài năng người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436817/seed/artists/sf0nzczbuougxsssmpd6.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/onionn.official",
        "instagram": "https://www.instagram.com/onionn.official"
      }
    }
  },
  {
    "user": {
      "email": "onlyc@soundwave.com",
      "username": "onlyc_artist",
      "name": "Only C"
    },
    "profile": {
      "artistName": "Only C",
      "bio": "Only C (tên thật: Nguyễn Phúc Thạch) là một nam ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745436100/seed/artists/dnewgaqju5px6eyippya.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/onlyc.official",
        "instagram": "https://www.instagram.com/onlyc.official"
      }
    }
  },
  {
    "user": {
      "email": "phandinhtung@soundwave.com",
      "username": "phandinhtung_artist",
      "name": "Phan Đinh Tùng"
    },
    "profile": {
      "artistName": "Phan Đinh Tùng",
      "bio": "Phan Đinh Tùng là một ca sĩ, nhạc sĩ nổi tiếng người Việt Nam, cựu thành viên nhóm nhạc MTV.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743442756/testAlbum/Phan%20%C4%90inh%20T%C3%B9ng/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/Kh%C3%BAc%20H%C3%A1t%20M%E1%BB%ABng%20Sinh%20Nh%E1%BA%ADt/tomj0zyas6grk3zft230.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/phandinhtungsinger"
      }
    }
  },
  {
    "user": {
      "email": "phanmanhquynh@soundwave.com",
      "username": "phanmanhquynh_artist",
      "name": "Phan Mạnh Quỳnh"
    },
    "profile": {
      "artistName": "Phan Mạnh Quỳnh",
      "bio": "Phan Mạnh Quỳnh là một ca sĩ, nhạc sĩ người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435646/seed/artists/ugm8jo9timzrdwdhvy8p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/phanmanhquynh.official",
        "instagram": "https://www.instagram.com/phanmanhquynh_official"
      }
    }
  },
  {
    "user": {
      "email": "phungkhanhlinh@soundwave.com",
      "username": "phungkhanhlinh_artist",
      "name": "Phùng Khánh Linh"
    },
    "profile": {
      "artistName": "Phùng Khánh Linh",
      "bio": "Phùng Khánh Linh là một nữ ca sĩ, nhạc sĩ người Việt Nam, được biết đến sau khi tham gia Giọng hát Việt 2015.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435645/seed/artists/nblqt7xqps1qe4j4x3ed.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/phungkhanhlinh.official",
        "instagram": "https://www.instagram.com/phungkhanhlinh.official"
      }
    }
  },
  {
    "user": {
      "email": "phuongly@soundwave.com",
      "username": "phuongly_artist",
      "name": "Phương Ly"
    },
    "profile": {
      "artistName": "Phương Ly",
      "bio": "Phương Ly là một nữ ca sĩ người Việt Nam, em gái của ca sĩ Phương Linh.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435646/seed/artists/jjklaskdmipjsuugowwu.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/phuongly.official",
        "instagram": "https://www.instagram.com/may__lily"
      }
    }
  },
  {
    "user": {
      "email": "phuongmychi@soundwave.com",
      "username": "phuongmychi_artist",
      "name": "Phương Mỹ Chi"
    },
    "profile": {
      "artistName": "Phương Mỹ Chi",
      "bio": "Phương Mỹ Chi là một nữ ca sĩ trẻ người Việt Nam chuyên hát thể loại nhạc dân ca Nam bộ, được biết đến sau khi tham gia chương trình Giọng hát Việt nhí mùa đầu tiên.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/tyvn4dzaq02ihyfi4qxx.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/phuongmychi.official",
        "instagram": "https://www.instagram.com/phuongmychi_official"
      }
    }
  },
  {
    "user": {
      "email": "rhymastic@soundwave.com",
      "username": "rhymastic_artist",
      "name": "Rhymastic"
    },
    "profile": {
      "artistName": "Rhymastic",
      "bio": "Rhymastic (tên thật: Vũ Đức Thiện) là một rapper, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam, thành viên của SpaceSpeakers.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435646/seed/artists/xaklw3dk0u6q3haumzab.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/RhymasticOfficial",
        "instagram": "https://www.instagram.com/rhymastic.official"
      }
    }
  },
  {
    "user": {
      "email": "mck@soundwave.com",
      "username": "mck_artist",
      "name": "MCK"
    },
    "profile": {
      "artistName": "RPT MCK",
      "bio": "RPT MCK (tên thật: Nghiêm Vũ Hoàng Long) là một rapper người Việt Nam, thành viên của Rapital và Gerdnang. Anh nổi tiếng khi tham gia King Of Rap và đạt được vị trí á quân.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860346/rpt_mck_fjkaou.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/hoanglongmck",
        "instagram": "https://www.instagram.com/rpt.mckeyyyyy"
      }
    }
  },
  {
    "user": {
      "email": "seachains@soundwave.com",
      "username": "seachains_artist",
      "name": "Seachains"
    },
    "profile": {
      "artistName": "Seachains",
      "bio": "Seachains là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745439987/seachains_kmptms.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/seachains",
        "instagram": "https://www.instagram.com/seachains"
      }
    }
  },
  {
    "user": {
      "email": "shayda@soundwave.com",
      "username": "shayda_artist",
      "name": "Shayda"
    },
    "profile": {
      "artistName": "Shayda",
      "bio": "Shayda là một nghệ sĩ với phong cách âm nhạc đặc trưng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743870424/Shayda_n0vdby.webp",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/shaydaofficial",
        "instagram": "https://www.instagram.com/shaydaofficial"
      }
    }
  },
  {
    "user": {
      "email": "shiki@soundwave.com",
      "username": "shiki_artist",
      "name": "Shiki"
    },
    "profile": {
      "artistName": "Shiki",
      "bio": "Shiki (tên thật: Huỳnh Nhật Hào) là một trong những gương mặt mới xứng đáng được tỏa sáng hơn.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439433/testAlbum/Shiki/L%E1%BA%B7ng/hkbmzyo4vngqrrdmb0az.webp",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/shikirising",
        "instagram": "https://www.instagram.com/shikidaspirit"
      }
    }
  },
  {
    "user": {
      "email": "slimv@soundwave.com",
      "username": "slimv_artist",
      "name": "SlimV"
    },
    "profile": {
      "artistName": "SlimV",
      "bio": "SlimV là một ca sĩ, nhạc sĩ người Việt Nam, được biết đến sau khi tham gia chương trình Giọng hát Việt 2015.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435226/seed/artists/hedfsp76waayhtmlheea.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/slimv.official",
        "instagram": "https://www.instagram.com/slimv.official"
      }
    }
  },
  {
    "user": {
      "email": "sontungmtp@soundwave.com",
      "username": "sontungmtp_artist",
      "name": "Sơn Tùng M-TP"
    },
    "profile": {
      "artistName": "Sơn Tùng M-TP",
      "bio": "Sơn Tùng M-TP (tên thật: Nguyễn Thanh Tùng) là một ca sĩ, nhạc sĩ và diễn viên nổi tiếng hàng đầu Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435226/seed/artists/rbgyzislbocq2xrqjfj6.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/MTP.Fan",
        "instagram": "https://www.instagram.com/sontungmtp"
      }
    }
  },
  {
    "user": {
      "email": "soobin@soundwave.com",
      "username": "soobin_artist",
      "name": "SOOBIN"
    },
    "profile": {
      "artistName": "SOOBIN",
      "bio": "SOOBIN là một ca sĩ, nhạc sĩ nổi tiếng người Việt Nam. Anh là thành viên nhóm SpaceSpeakers và đã phát hành nhiều ca khúc hit.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743874021/Soobin_eo3d2y.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/soobinhoangson",
        "instagram": "https://www.instagram.com/soobinhoangson"
      }
    }
  },
  {
    "user": {
      "email": "tage@soundwave.com",
      "username": "tage_artist",
      "name": "Tage"
    },
    "profile": {
      "artistName": "Tage",
      "bio": "Tage tên thật là Vũ Tuấn Huy, là một rapper, ca sĩ, nhạc sĩ người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743868350/Tage_pcmon9.webp",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/ta.gekun",
        "instagram": "https://www.instagram.com/ta.gekun"
      }
    }
  },
  {
    "user": {
      "email": "thinhsuy@soundwave.com",
      "username": "thinhsuy_artist",
      "name": "Thịnh Suy"
    },
    "profile": {
      "artistName": "Thịnh Suy",
      "bio": "Thịnh Suy là một ca sĩ, nhạc sĩ indie nổi tiếng tại Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435098/seed/artists/ntsuedaz9q0es7lpehut.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/thinhsuy.official",
        "instagram": "https://www.instagram.com/thinhsuy.official"
      }
    }
  },
  {
    "user": {
      "email": "tientien@soundwave.com",
      "username": "tientien_artist",
      "name": "Tiên Tiên"
    },
    "profile": {
      "artistName": "Tiên Tiên",
      "bio": "Tiên Tiên (tên thật: Huỳnh Nữ Thủy Tiên) là một nữ ca sĩ, nhạc sĩ người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/hifdaqxdymoiu8yqgit3.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/tien.tien.official",
        "instagram": "https://www.instagram.com/tien.tien.official"
      }
    }
  },
  {
    "user": {
      "email": "tlinh@soundwave.com",
      "username": "tlinh_artist",
      "name": "tlinh"
    },
    "profile": {
      "artistName": "tlinh",
      "bio": "tlinh tên thật là Nguyễn Thảo Linh, là một nữ rapper, ca sĩ và nhạc sĩ người Việt Nam. Cô được biết đến sau khi tham gia chương trình Rap Việt mùa 1.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743439252/testAlbum/tlinh%2C%20Low%20G/FLVR/yhujw5bifxyhncqddgiw.png",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/lf.tlinh",
        "instagram": "https://www.instagram.com/tlinhww"
      }
    }
  },
  {
    "user": {
      "email": "tripled@soundwave.com",
      "username": "tripled_producer",
      "name": "Triple D"
    },
    "profile": {
      "artistName": "Triple D",
      "bio": "Triple D là một nhà sản xuất âm nhạc người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745437588/seed/artists/rswogy8xwesfionetgtd.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/tripled.official",
        "instagram": "https://www.instagram.com/tripled.official"
      }
    }
  },
  {
    "user": {
      "email": "trungtran@soundwave.com",
      "username": "trungtran_artist",
      "name": "Trung Trần"
    },
    "profile": {
      "artistName": "Trung Trần",
      "bio": "",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743867463/Trung_Tran_ys1ply.webp",
      "socialMediaLinks": {}
    }
  },
  {
    "user": {
      "email": "vanmaihuong@soundwave.com",
      "username": "vanmaihuong_artist",
      "name": "Văn Mai Hương"
    },
    "profile": {
      "artistName": "Văn Mai Hương",
      "bio": "Văn Mai Hương là một nữ ca sĩ người Việt Nam, được biết đến sau khi giành vị trí Á quân tại cuộc thi Vietnam Idol 2010.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435227/seed/artists/ndhktqvi8fncnrukyj63.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/vanmaihuong.official",
        "instagram": "https://www.instagram.com/vanmaihuong.official"
      }
    }
  },
  {
    "user": {
      "email": "vstra@soundwave.com",
      "username": "vstra_artist",
      "name": "VSTRA"
    },
    "profile": {
      "artistName": "VSTRA",
      "bio": "VSTRA là nghệ danh của rapper Việt Nam Nguyễn Hải Đăng, được biết đến với phong cách rap melodic.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743860648/vstra_ff8nu2.webp",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/embequocdann",
        "instagram": "https://www.instagram.com/vstra____official"
      }
    }
  },
  {
    "user": {
      "email": "vu@soundwave.com",
      "username": "vu_artist",
      "name": "Vũ"
    },
    "profile": {
      "artistName": "Vũ.",
      "bio": "Hoàng Thái Vũ, thường được biết đến với nghệ danh Vũ., là một ca sĩ, nhạc sĩ sáng tác ca khúc người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743497776/testAlbum/V%C5%A9/ed4krbq1pbqzepsv6l7e.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/hoangthaivuofficial",
        "instagram": "https://www.instagram.com/toilavu"
      }
    }
  },
  {
    "user": {
      "email": "wean@soundwave.com",
      "username": "wean_artist",
      "name": "WEAN"
    },
    "profile": {
      "artistName": "WEAN",
      "bio": "WEAN là một rapper/nghệ sĩ trẻ nổi tiếng trong cộng đồng underground Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/weantodale",
        "instagram": "https://www.instagram.com/weantodale"
      }
    }
  },
  {
    "user": {
      "email": "wokeup@soundwave.com",
      "username": "wokeup_artist",
      "name": "WOKEUP"
    },
    "profile": {
      "artistName": "WOKEUP",
      "bio": "WOKEUP là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dbwhalglx/image/upload/v1745440097/wokeup_wnwnoy.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/wokeupmusic",
        "instagram": "https://www.instagram.com/wokeupmusic"
      }
    }
  },
  {
    "user": {
      "email": "wrenevans@soundwave.com",
      "username": "wrenevans_artist",
      "name": "Wren Evans"
    },
    "profile": {
      "artistName": "Wren Evans",
      "bio": "Wren Evans tên thật là Lê Phan, là một ca sĩ, nhạc sĩ, nhà sản xuất âm nhạc người Việt Nam.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743497966/testAlbum/Wren%20Evans/eyaniumxu7fui8ygdvsl.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/wren.evans11",
        "instagram": "https://www.instagram.com/wrenevans____"
      }
    }
  },
  {
    "user": {
      "email": "zev@soundwave.com",
      "username": "zev_artist",
      "name": "Z'EV"
    },
    "profile": {
      "artistName": "Z'EV",
      "bio": "Z'EV là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859180/ZEV_mon8pg.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/zev.official",
        "instagram": "https://www.instagram.com/zev.official"
      }
    }
  },

  {
    "user": {
      "email": "themen@soundwave.com",
      "username": "themen_artist",
      "name": "The Men"
    },
    "profile": {
      "artistName": "The Men",
      "bio": "The Men là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859180/TheMen_owgfkj.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/themen.official",
        "instagram": "https://www.instagram.com/themen.official"
      }
    }
  },
  {
    "user": {
      "email": "thedeath@soundwave.com",
      "username": "thedeath_artist",
      "name": "The Death Set"
    },
    "profile": {
      "artistName": "The Death Set",
      "bio": "The Death là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/thedeath.official",
        "instagram": "https://www.instagram.com/thedeath.official"
      }
    }
  },
  {
    "user": {
      "email": "thecozylofi@soundwave.com",
      "username": "thecozylofi_artist",
      "name": "the cozy lofi"
    },
    "profile": {
      "artistName": "the cozy lofi",
      "bio": "The Cozy LoFi là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859167/cozylofi_ir0zwt.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/thecozylofi.official",
        "instagram": "https://www.instagram.com/thecozylofi.official"
      }
    }
  },
  {
    "user": {
      "email": "thechainsmokers@soundwave.com",
      "username": "thechainsmokers_artist",
      "name": "The Chainsmokers"
    },
    "profile": {
      "artistName": "The Chainsmokers",
      "bio": "The Chainsmokers là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746853048/thechainsmokers_hys72c.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/thechainsmokers.official",
        "instagram": "https://www.instagram.com/thechainsmokers.official"
      }
    }
  },
  {
    "user": {
      "email": "tri@soundwave.com",
      "username": "tri_artist",
      "name": "T.R.I"
    },
    "profile": {
      "artistName": "T.R.I",
      "bio": "T.R.I là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/tri.official",
        "instagram": "https://www.instagram.com/tri.official"
      }
    }
  },
  {
    "user": {
      "email": "suni@soundwave.com",
      "username": "suni",
      "name": "SUNI"
    },
    "profile": {
      "artistName": "SUNI",
      "bio": "SUNI là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/suni.official",
        "instagram": "https://www.instagram.com/suni.official"
      }
    }
  },
  {
    "user": {
      "email": "sixtyuptown@soundwave.com",
      "username": "sixtyuptown_artist",
      "name": "SIXTYUPTOWN"
    },
    "profile": {
      "artistName": "SIXTYUPTOWN",
      "bio": "SIXTYUPTOWN là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/sixtyuptown.official",
        "instagram": "https://www.instagram.com/sixtyuptown.official"
      }
    }
  },
  {
    "user": {
      "email": "shurkn@soundwave.com",
      "username": "shurkn_artist",
      "name": "Shurkn"
    },
    "profile": {
      "artistName": "Shurkn Pap",
      "bio": "Shurkn là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/shurkn.official",
        "instagram": "https://www.instagram.com/shurkn.official"
      }
    }
  },
  {
    "user": {
      "email": "shrimpnose@soundwave.com",
      "username": "shrimpnose_artist",
      "name": "Shrimpnose"
    },
    "profile": {
      "artistName": "Shrimpnose",
      "bio": "Shrimpnos là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/shrimpnose.official",
        "instagram": "https://www.instagram.com/shrimpnose.official"
      }
    }
  },
  {
    "user": {
      "email": "phucdu@soundwave.com",
      "username": "phucdu_artist",
      "name": "Phuc Du"
    },
    "profile": {
      "artistName": "Phuc Du",
      "bio": "Phuc Du là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859180/phucdu_tqbmra.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/phucdu.official",
        "instagram": "https://www.instagram.com/phucdu.official"
      }
    }
  },
  {
    "user": {
      "email": "myanh@soundwave.com",
      "username": "myanh_artist",
      "name": "My Anh"
    },
    "profile": {
      "artistName": "My Anh",
      "bio": "My An là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746853049/myanh_ipiwya.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/myanh.official",
        "instagram": "https://www.instagram.com/myanh.official"
      }
    }
  },
  {
    "user": {
      "email": "lakayinspired@soundwave.com",
      "username": "lakayinspired_artist",
      "name": "LAKEY INSPIRED"
    },
    "profile": {
      "artistName": "LAKEY INSPIRED",
      "bio": "LAKEY INSPIRE là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746853056/lakey_px8qkc.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/lakayinspired.official",
        "instagram": "https://www.instagram.com/lakayinspired.official"
      }
    }
  },
  {
    "user": {
      "email": "kadinh@soundwave.com",
      "username": "kadinh_artist",
      "name": "Kai Dinh"
    },
    "profile": {
      "artistName": "Kai Đinh",
      "bio": "Kai Dinh là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/kadinh.official",
        "instagram": "https://www.instagram.com/kadinh.official"
      }
    }
  },
  {
    "user": {
      "email": "thedeli@soundwave.com",
      "username": "thedeli_artist",
      "name": "The Deli"
    },
    "profile": {
      "artistName": "The Deli",
      "bio": "The Deli là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859167/thedeli_wes4u0.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/thedeli.official",
        "instagram": "https://www.instagram.com/thedeli.official"
      }
    }
  },
  {
    "user": {
      "email": "chief@soundwave.com",
      "username": "chief_artist",
      "name": "chief."
    },
    "profile": {
      "artistName": "chief.",
      "bio": "chief. là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/chief.official",
        "instagram": "https://www.instagram.com/chief.official"
      }
    }
  },
  {
    "user": {
      "email": "lequyen@soundwave.com",
      "username": "lequyen_artist",
      "name": "Lệ Quyên"
    },
    "profile": {
      "artistName": "Lệ Quyên",
      "bio": "Lệ Quyên là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859168/lequyen_fywxhu.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/lequyen.official",
        "instagram": "https://www.instagram.com/lequyen.official"
      }
    }
  },
  {
    "user": {
      "email": "mytam@soundwave.com",
      "username": "mytam_artist",
      "name": "Mỹ Tâm"
    },
    "profile": {
      "artistName": "Mỹ Tâm",
      "bio": "Mỹ Tâm là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859168/mytam_uyp8qv.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/mytam.official",
        "instagram": "https://www.instagram.com/mytam.official"
      }
    }
  },
  {
    "user": {
      "email": "touliver@soundwave.com",
      "username": "touliver_artist",
      "name": "Touliver"
    },
    "profile": {
      "artistName": "Touliver",
      "bio": "Toulive là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859167/touliver_cr9anr.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/touliver.official",
        "instagram": "https://www.instagram.com/touliver.official"
      }
    }
  },
  {
    "user": {
      "email": "hukimtuyen@soundwave.com",
      "username": "hukimtuyen_artist",
      "name": "Hứa Kim Tuyền"
    },
    "profile": {
      "artistName": "Hứa Kim Tuyền",
      "bio": "Hứa Kim Tuyền là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1745435350/seed/artists/kpayx0u1zckduv1hjm4p.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/hukimtuyen.official",
        "instagram": "https://www.instagram.com/hukimtuyen.official"
      }
    }
  },
  {
    "user": {
      "email": "hoangyenchibi@soundwave.com",
      "username": "hoangyenchibi_artist",
      "name": "Hoàng Yến Chibi"
    },
    "profile": {
      "artistName": "Hoàng Yến Chibi",
      "bio": "Hoàng Yến Chibi là một nghệ sĩ trẻ nổi bật trong làng nhạc Việt Nam, với nhiều sản phẩm âm nhạc chất lượng.",
      "avatar": "https://res.cloudinary.com/dtvrby0wr/image/upload/v1746859167/hoangyenchibi_c5phrk.jpg",
      "socialMediaLinks": {
        "facebook": "https://www.facebook.com/hoangyenchibi.official",
        "instagram": "https://www.instagram.com/hoangyenchibi.official"
      }
    }
  }
];
