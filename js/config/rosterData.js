/**
 * ONYXPURE — JKT48 3D MOBA × OPEN-WORLD ARENA
 * js/config/rosterData.js
 * 
 * Master Roster Database:
 * - 6 Active 3D Heroes (Christy, Marsha, Freya, Erine, Fiony, Michie) with exact MLBB math & quantitative kits
 * - 36 Preview Members with full weapon, skill, audio, and visual metadata
 * - Dual-Crop portrait support, team themes, role/lane mappings, and helper queries.
 */

export const TEAMS = {
    team_dream: {
        id: "team_dream",
        key: "team_dream",
        name: "TEAM DREAM",
        theme: "Cyan (Langit & Bulan)",
        color: "#38bdf8",
        colorRgb: [56, 189, 248],
        accentGlow: "rgba(56, 189, 248, 0.45)",
        crestIcon: "crest_team_dream.webp",
        badge: "🌙"
    },
    team_love: {
        id: "team_love",
        key: "team_love",
        name: "TEAM LOVE",
        theme: "Magenta (Hati & Cinta)",
        color: "#ec4899",
        colorRgb: [236, 72, 153],
        accentGlow: "rgba(236, 72, 153, 0.45)",
        crestIcon: "crest_team_love.webp",
        badge: "💖"
    },
    team_passion: {
        id: "team_passion",
        key: "team_passion",
        name: "TEAM PASSION",
        theme: "Amber (Api & Semangat)",
        color: "#f59e0b",
        colorRgb: [245, 158, 11],
        accentGlow: "rgba(245, 158, 11, 0.45)",
        crestIcon: "crest_team_passion.webp",
        badge: "🔥"
    }
};

export const ACTIVE_HERO_IDS = ['christy', 'marsha', 'freya', 'erine', 'fiony', 'michie'];

export const HEROES = [
  // ==========================================
  // TEAM DREAM (13 HERO) — Tema: Cyan
  // ==========================================
  {
    id: "marsha",
    name: "Marsha",
    title: "Luna of the Dream Center",
    team: "team_dream",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Lunar Prism Scepter",
    stats: { hp: 2350, mana: 520, attack: 145, armor: 48, moveSpeed: 4.8 },
    passive: {
      name: "Anticipation of Luna",
      desc: "Setiap skill Marsha yang mengenai musuh menumpuk 1 lapis Lunar Slice (maks 4 lapis). Pada tumpukan penuh, serangan berikutnya meledakkan energi bulan purnama ber-damage magis besar."
    },
    skill1: {
      key: "Q",
      name: "Crescent Pizza Arc",
      cd: 5,
      cost: 45,
      type: "projectile",
      desc: "Mengayunkan tongkat untuk melontarkan proyektil bulan sabit melengkung yang membelah barisan minion dan meledak pada target pertama dengan efek kilau perak."
    },
    skill2: {
      key: "W",
      name: "Stargaze Blink",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Meluncur cepat ke arah yang dituju dalam lintasan cahaya bintang, meninggalkan segmen prisma bulan yang memperlambat (Slow 40%) lawan di belakangnya."
    },
    ultimate: {
      key: "R",
      name: "Eclipse of the Dream Center",
      cd: 22,
      cost: 110,
      type: "aoe_burst",
      desc: "Mengangkat tongkat ke langit malam untuk memanggil gerhana bulan raksasa di area target, menghujani lawan dengan 6 laser bulan beruntun dan menceraiberaikan formasi musuh."
    }
  },
  {
    id: "freya",
    name: "Freya",
    title: "Agile Valkyrie Bruiser",
    team: "team_dream",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Valkyrie Twin Skyblades",
    stats: { hp: 3100, mana: 380, attack: 195, armor: 78, moveSpeed: 5.0 },
    passive: {
      name: "Caramel Cholerics",
      desc: "Setiap kombo serangan berturut-turut menambah 20% Attack Speed dan Movement Speed, sekaligus memulihkan sebagian HP pada tiap serangan ke-4."
    },
    skill1: {
      key: "Q",
      name: "Skyfall Strike",
      cd: 6,
      cost: 40,
      type: "projectile",
      desc: "Melompat tinggi ke udara lalu menghunjam tanah dengan kedua pedang, memicu ledakan gelombang angin cyan yang mementalkan musuh (Knockup)."
    },
    skill2: {
      key: "W",
      name: "Vortex Guard",
      cd: 7,
      cost: 45,
      type: "dash_shield",
      desc: "Memutar kedua pedang membentuk perisai pusaran angin selama 1,5 detik yang memantulkan damage proyektil musuh dan memberi perisai kokoh."
    },
    ultimate: {
      key: "R",
      name: "Captain's Valkyrie Ascendance",
      cd: 24,
      cost: 100,
      type: "aoe_burst",
      desc: "Membentangkan sayap malaikat langit bercahaya cyan-karamel, mengubah tebasan menjadi badai kilat area luas dan memberikan aura +15% Movement Speed ke seluruh tim."
    }
  },
  {
    id: "greesel",
    name: "Greesel",
    title: "Firefly Vision Carry",
    team: "team_dream",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Nocturne Firefly Dual Pistols",
    stats: { hp: 2200, mana: 440, attack: 210, armor: 42, moveSpeed: 4.9 },
    passive: {
      name: "Firefly Gaze",
      desc: "Setiap 3 tembakan meninggalkan pendar kunang-kunang pada musuh yang membuka pandangan (Vision) mereka selama 3 detik meski bersembunyi di semak."
    },
    skill1: {
      key: "Q",
      name: "Straightforward Shot",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Menembakkan peluru cahaya berkecepatan tinggi lurus yang menembus target pertama dan menghasilkan Critical Damage tambahan jika target berstatus kunang-kunang."
    },
    skill2: {
      key: "W",
      name: "Midnight Flutter",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Melakukan dash menyamping sambil menebarkan kawanan kunang-kunang di posisi awal yang meledak ringan dan membutakan (Blind singkat) penyerang jarak dekat."
    },
    ultimate: {
      key: "R",
      name: "Constellation Barrage",
      cd: 20,
      cost: 95,
      type: "aoe_burst",
      desc: "Melompat mundur ke udara lalu melepaskan rentetan 12 tembakan kunang-kunang ke area kerucut depan yang memotong cooldown dash untuk kiting berkelanjutan."
    }
  },
  {
    id: "ella",
    name: "Ella",
    title: "Chrono-Sky Stance Mage",
    team: "team_dream",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Horizon Astrolabe",
    stats: { hp: 2280, mana: 550, attack: 140, armor: 44, moveSpeed: 4.7 },
    passive: {
      name: "Every Hour With You",
      desc: "Setiap penggunaan skill memutar siklus langit Ella melalui tiga fase: Ohayo (+Speed), Konnichiwa (+Magic Pen), dan Oyasumi (memberi efek Slow/Drowsy)."
    },
    skill1: {
      key: "Q",
      name: "Skyward Pulse",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Menembakkan bola cahaya langit yang berubah efek sesuai fase aktif: gelombang angin cepat, ledakan surya tajam, atau kabut tidur bulan."
    },
    skill2: {
      key: "W",
      name: "Fantasy Horizon",
      cd: 9,
      cost: 55,
      type: "dash_shield",
      desc: "Menggambar garis cakrawala berkilau di tanah yang memunculkan pilar cahaya langit setelah jeda 0,8 detik untuk memberi Root pada lawan yang terjebak."
    },
    ultimate: {
      key: "R",
      name: "Blue Sky Unison",
      cd: 25,
      cost: 110,
      type: "aoe_burst",
      desc: "Membentangkan kubah langit biru fantasi di area war; semua fase aktif bersamaan selama 5 detik, memberi musuh Slow berat, hujan cahaya, dan efek Sleep."
    }
  },
  {
    id: "gita",
    name: "Gita",
    title: "Stealth Illusion Assassin",
    team: "team_dream",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Silent Crescent Daggers",
    stats: { hp: 2450, mana: 400, attack: 225, armor: 50, moveSpeed: 5.2 },
    passive: {
      name: "Silent Observer",
      desc: "Jika Gita tidak menyerang selama 2 detik, ia memasuki kamuflase parsial dan menandai hero musuh terdekat untuk menerima +25% Burst Damage pada serangan pembuka."
    },
    skill1: {
      key: "Q",
      name: "Loki's Mirage",
      cd: 6,
      cost: 45,
      type: "projectile",
      desc: "Melemparkan belati bayangan ke depan; menekan skill ini kembali akan memindahkan Gita secara instan ke posisi belati untuk tebasan fatal."
    },
    skill2: {
      key: "W",
      name: "Precision Formation",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Melakukan dash melingkar dengan kecepatan tinggi, memberikan damage ke semua lawan di lintasan dan memperoleh perisai siluet selama 2 detik."
    },
    ultimate: {
      key: "R",
      name: "Moonless Execution",
      cd: 21,
      cost: 100,
      type: "aoe_burst",
      desc: "Mengunci target bertanda lalu melakukan rentetan 5 tikaman bayangan mematikan tanpa bisa ditarget (Untargetable) selama eksekusi berlangsung."
    }
  },
  {
    id: "olla",
    name: "Olla",
    title: "Sky-Mechanic Striker",
    team: "team_dream",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Aero-Wrench Hammer",
    stats: { hp: 3250, mana: 360, attack: 180, armor: 82, moveSpeed: 4.9 },
    passive: {
      name: "Mechanic Girl's Overhaul",
      desc: "Memperbaiki armor diri sendiri saat menerima damage berat, mengubah 15% damage yang diterima menjadi energi regenerasi HP selama 4 detik."
    },
    skill1: {
      key: "Q",
      name: "Turbo Wrench Slam",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Menghantamkan palu hidrolik ke tanah, melepaskan gelombang kejut getaran logam yang memicu Slow dan memecahkan perisai musuh."
    },
    skill2: {
      key: "W",
      name: "Sky-Drone Pitstop",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Memanggil drone mekanik mini yang mengelilingi Olla, memberikan perisai kinetik dan mempercepat larinya sebesar 35% selama 2,5 detik."
    },
    ultimate: {
      key: "R",
      name: "Wartak Nitro Overdrive",
      cd: 23,
      cost: 95,
      type: "aoe_burst",
      desc: "Mengaktifkan pendorong roket di palu raksasanya, berputar kencang seperti topan mesin jet yang menghancurkan semua musuh di sekitarnya."
    }
  },
  {
    id: "oline",
    name: "Oline",
    title: "Starlight Ballet Acrobat",
    team: "team_dream",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Starlight Ribbon Blades",
    stats: { hp: 2400, mana: 420, attack: 220, armor: 48, moveSpeed: 5.2 },
    passive: {
      name: "Full Tank Gas-Oline",
      desc: "Setiap langkah gerak mengisi meteran Gas-Oline; pada muatan penuh, serangan berikutnya melesat dengan daya dorong tinggi dan memicu critical hit."
    },
    skill1: {
      key: "Q",
      name: "Pirouette Dash",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Melakukan putaran balet akrobatik sambil mengibaskan pita pedang bercahaya yang mengiris barisan musuh di garis lurus."
    },
    skill2: {
      key: "W",
      name: "Starry Rain Step",
      cd: 7,
      cost: 45,
      type: "dash_shield",
      desc: "Melompat lincah ke arah target sambil menghindar dari semua proyektil selama 0,5 detik dan meninggalkan jejak bintang penambah movement speed."
    },
    ultimate: {
      key: "R",
      name: "Grand Swan Finale",
      cd: 22,
      cost: 100,
      type: "aoe_burst",
      desc: "Tarian angsa angkasa spektakuler yang menenun kurungan pita konstelasi, menjerat semua musuh di dalamnya dan meledakkannya dalam kilatan cahaya cyan."
    }
  },
  {
    id: "eli",
    name: "Eli",
    title: "Twilight Guardian Angel",
    team: "team_dream",
    role: "Healer",
    lane: "Roamer",
    weapon: "Twilight Sky Chime Staff",
    stats: { hp: 2850, mana: 580, attack: 130, armor: 65, moveSpeed: 4.8 },
    passive: {
      name: "Warmth of Dusk",
      desc: "Aura senja Eli secara pasif memulihkan HP rekan setim terdekat sebesar 2% dari Max HP mereka setiap 3 detik saat berada di dekatnya."
    },
    skill1: {
      key: "Q",
      name: "Senja Resonance",
      cd: 6,
      cost: 45,
      type: "projectile",
      desc: "Membunyikan lonceng langit untuk melepaskan gelombang senja yang memberi damage pada musuh dan menyembuhkan sekutu pertama yang disentuh."
    },
    skill2: {
      key: "W",
      name: "Cabin Crew Gale",
      cd: 9,
      cost: 60,
      type: "dash_shield",
      desc: "Mengayunkan tongkat untuk memanggil hembusan angin pelindung yang memberikan perisai tebal serta kekebalan terhadap efek Slow selama 2 detik."
    },
    ultimate: {
      key: "R",
      name: "Lembayung Sanctuary",
      cd: 26,
      cost: 120,
      type: "aoe_burst",
      desc: "Menciptakan suaka lembayung raksasa di tanah: semua rekan di dalamnya menerima regenerasi HP masif serta pengurangan damage 30% dari serangan musuh."
    }
  },
  {
    id: "delynn",
    name: "Delynn",
    title: "Lunar Drone Medic",
    team: "team_dream",
    role: "Healer",
    lane: "Roamer",
    weapon: "Pyong-Pyong Lunar Drone",
    stats: { hp: 2750, mana: 560, attack: 135, armor: 60, moveSpeed: 4.9 },
    passive: {
      name: "Scam Charm",
      desc: "Tingkah menggemaskan Delynn mengurangi damage yang diterimanya sebesar 12% dan memikat (Charm 0,5 detik) musuh pertama yang menyerangnya."
    },
    skill1: {
      key: "Q",
      name: "Pyong-Pyong Hop",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Memerintahkan drone kelinci Pyong-Pyong meluncur ke depan, memantul di antara 3 musuh dan memberikan efek Slow serta damage magis."
    },
    skill2: {
      key: "W",
      name: "Nightwing Batarang",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Melempar bumerang batarang mini berputar yang kembali ke tangan Delynn sambil membentuk perisai kelinci di sekeliling tubuhnya."
    },
    ultimate: {
      key: "R",
      name: "Angel's Global Link",
      cd: 28,
      cost: 125,
      type: "aoe_burst",
      desc: "Menghubungkan sinyal satelit bulan ke seluruh sekutu di medan perang, menyembuhkan mereka secara instan dan memberi buff +20% Attack Speed."
    }
  },
  {
    id: "nachia",
    name: "Nachia",
    title: "Cheerful Panda Martialist",
    team: "team_dream",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Cloud-Bamboo Bo Staff",
    stats: { hp: 3200, mana: 350, attack: 185, armor: 80, moveSpeed: 5.0 },
    passive: {
      name: "Cheerful Panda Resilience",
      desc: "Ketangguhan panda membuat Nachia memperoleh kekebalan Crowd Control selama 1 detik setiap kali kehilangan 25% HP maksimalnya."
    },
    skill1: {
      key: "Q",
      name: "Cloud Roll",
      cd: 5,
      cost: 35,
      type: "projectile",
      desc: "Berguling cepat ke depan seperti bola awan, menghantam musuh pertama dan mengangkat mereka ke udara (Knockup)."
    },
    skill2: {
      key: "W",
      name: "Bamboo Spin Parry",
      cd: 7,
      cost: 45,
      type: "dash_shield",
      desc: "Memutar tongkat bambu di depan dada untuk menangkis 50% damage masuk, lalu membalas dengan pukulan dorong yang memukul mundur lawan."
    },
    ultimate: {
      key: "R",
      name: "Happy Stage Dome",
      cd: 23,
      cost: 95,
      type: "aoe_burst",
      desc: "Mendirikan kubah panggung bambu keceriaan yang mengurung hero lawan di arena tertutup dan meningkatkan Attack Damage Nachia sebesar 40%."
    }
  },
  {
    id: "lyn",
    name: "Lyn",
    title: "Moonlit Tide Siren",
    team: "team_dream",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Moonlit Tide Harp",
    stats: { hp: 2300, mana: 530, attack: 150, armor: 46, moveSpeed: 4.8 },
    passive: {
      name: "Calm Before the Sweep",
      desc: "Setiap mantra yang diarahkan dengan tenang menumpuk konsentrasi ombak; pada tumpukan ke-3, skill berikutnya memiliki area ganda dan efek Stun 1 detik."
    },
    skill1: {
      key: "Q",
      name: "Crescent Ripple",
      cd: 5,
      cost: 45,
      type: "projectile",
      desc: "Memetik dawai harpa untuk melepaskan riak air bercahaya bulan sabit yang mengalir lurus menembus minion dan musuh."
    },
    skill2: {
      key: "W",
      name: "Yoga Balance Wave",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Mengambil pose meditasi seimbang sambil melepaskan gelombang air melingkar yang menolak musuh mendekat dan menyembuhkan diri."
    },
    ultimate: {
      key: "R",
      name: "Sudden Moon-Tsunami",
      cd: 24,
      cost: 110,
      type: "aoe_burst",
      desc: "Memanggil gelombang tsunami raksasa setinggi langit yang menyapu seluruh area pertempuran, menyeret musuh ke pusat pusaran air."
    }
  },
  {
    id: "nala",
    name: "Nala",
    title: "Celestial Lion Striker",
    team: "team_dream",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Celestial Lion Gauntlets",
    stats: { hp: 2500, mana: 390, attack: 230, armor: 52, moveSpeed: 5.3 },
    passive: {
      name: "Lioness Silat Stance",
      desc: "Sikap pasang silat singa langit memberikan 15% Physical Penetration permanen dan menambah kecepatan lari saat mengejar target ber-HP di bawah 40%."
    },
    skill1: {
      key: "Q",
      name: "Roar Pounce",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Menerjang mangsa dari jarak jauh dengan auman singa langit, mencakar target dan memicu efek Stun singkat 0,6 detik."
    },
    skill2: {
      key: "W",
      name: "Pantomime Wall",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Membentuk dinding ilusi tak kasat mata di hadapannya yang memblokir proyektil lawan sekaligus memberikan dorongan dash kilat ke samping."
    },
    ultimate: {
      key: "R",
      name: "Sovereign Silat Flurry",
      cd: 20,
      cost: 90,
      type: "aoe_burst",
      desc: "Melancarkan jurus pukulan silat singa beruntun 8 pukulan berdaya hancur tinggi ke musuh yang ditargetkan tanpa memberi ampun."
    }
  },
  {
    id: "chelsea",
    name: "Chelsea",
    title: "Rockstar Starry Marksman",
    team: "team_dream",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Shooting Star Electric Guitar-Rifle",
    stats: { hp: 2250, mana: 460, attack: 215, armor: 44, moveSpeed: 4.9 },
    passive: {
      name: "Starry Night Riff",
      desc: "Setiap petikan gitar listrik menembakkan gelombang sonik bintang; serangan dasar ke-4 meledak menghasilkan damage area dan memantul ke target lain."
    },
    skill1: {
      key: "Q",
      name: "Meteor Chord",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Memetik akor gitar nada tinggi untuk menembakkan proyektil laser meteor bintang yang menembus target dalam garis lurus."
    },
    skill2: {
      key: "W",
      name: "Power Slide Backstep",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Melakukan power slide mundur dengan gitar menyala, meninggalkan jejak panggung berapi neon yang membakar musuh yang melintasinya."
    },
    ultimate: {
      key: "R",
      name: "Shooting Star Encore",
      cd: 21,
      cost: 100,
      type: "aoe_burst",
      desc: "Melompat ke atas panggung melayang lalu memainkan solo gitar elektrik spektakuler yang menghujani arena dengan bintang jatuh ber-damage kritikal masif."
    }
  },

  // ==========================================
  // TEAM LOVE (15 HERO) — Tema: Magenta
  // ==========================================
  {
    id: "fiony",
    name: "Fiony",
    title: "Heartstring Maestro",
    team: "team_love",
    role: "Healer",
    lane: "Roamer",
    weapon: "Heartstring Conductor Baton",
    stats: { hp: 2900, mana: 590, attack: 125, armor: 68, moveSpeed: 4.8 },
    passive: {
      name: "Calming Symphony",
      desc: "Irama baton Fiony meredakan ketegangan rekan setim, memberikan pengurangan konsumsi mana sebesar 20% bagi sekutu di sekitarnya."
    },
    skill1: {
      key: "Q",
      name: "Illustrated Crescendo",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Mengayunkan tongkat konduktor untuk melukis not balok melodi hati magenta yang bergerak maju menyembuhkan sekutu dan memberi damage pada musuh."
    },
    skill2: {
      key: "W",
      name: "Harmony Barrier",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Menciptakan perisai partitur musik di sekeliling hero terdekat dengan HP terendah, menyerap damage dan meningkatkan Movement Speed mereka."
    },
    ultimate: {
      key: "R",
      name: "Grand Symphony of Love",
      cd: 26,
      cost: 115,
      type: "aoe_burst",
      desc: "Memimpin orkestra cinta megah yang menggetarkan seluruh arena: musuh terkena Stun selama 1,5 detik karena terpukau alunan simfoni, sementara sekutu pulih penuh."
    }
  },
  {
    id: "michie",
    name: "Michie",
    title: "Infinity Heart Archer",
    team: "team_love",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Infinity Heart Bow",
    stats: { hp: 2200, mana: 430, attack: 220, armor: 40, moveSpeed: 5.0 },
    passive: {
      name: "Till Infinity and Beyond",
      desc: "Setiap serangan dasar yang mengenai target menumpuk simbol infinity; pada 3 tumpukan, panah berikutnya memiliki jarak tembak tak terhingga."
    },
    skill1: {
      key: "Q",
      name: "Number One Arrow",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Menembakkan anak panah hati berenergi tinggi yang menusuk target pertama dan memperlambat langkahnya sebesar 30%."
    },
    skill2: {
      key: "W",
      name: "Marathon Stride",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Melesat lari cepat seperti pelari maraton profesional, meningkatkan kelincahan sebesar 40% dan melepaskan diri dari segala efek slow."
    },
    ultimate: {
      key: "R",
      name: "Heartbreak Comet",
      cd: 20,
      cost: 95,
      type: "aoe_burst",
      desc: "Menarik busur infinity maksimal lalu melepaskan panah komet hati raksasa melintasi arena yang meledak hebat di lokasi sasaran."
    }
  },
  {
    id: "trisha",
    name: "Trisha",
    title: "Dreamweaver Artist",
    team: "team_love",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Dreamweaver Paintbrush",
    stats: { hp: 2320, mana: 540, attack: 145, armor: 46, moveSpeed: 4.7 },
    passive: {
      name: "One, Two, Three...sha!",
      desc: "Mantra ketiga Trisha selalu memicu lukisan hidup yang memberikan damage magis ganda dan meninggalkan kolam cat magenta di tanah."
    },
    skill1: {
      key: "Q",
      name: "Palette Splash",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Memercikkan cat akrilik energi magenta ke depan, menyilaukan musuh dan mengurangi pertahanan sihir mereka sebesar 15%."
    },
    skill2: {
      key: "W",
      name: "Malamute Spirit Sketch",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Menggambar sketsa anjing malamute setia di tanah yang melompat melindungi Trisha, menyerap serangan dan membalas menggigit penyerang."
    },
    ultimate: {
      key: "R",
      name: "Museum of Sweet Dreams",
      cd: 24,
      cost: 110,
      type: "aoe_burst",
      desc: "Melukis galeri mimpi indah raksasa di area war: kanvas magis menyerap semua damage musuh lalu membalikkannya kembali sebagai ledakan seni warna-warni."
    }
  },
  {
    id: "fritzy",
    name: "Fritzy",
    title: "Arcane Heart Illusionist",
    team: "team_love",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Arcane Heart Tarot Deck",
    stats: { hp: 2280, mana: 560, attack: 148, armor: 44, moveSpeed: 4.8 },
    passive: {
      name: "Sleight of Hand",
      desc: "Setiap kartu yang dilempar memicu trik sulap acak: kartu merah (Damage ekstra), kartu emas (Stun 0,5s), atau kartu cinta (Shield)."
    },
    skill1: {
      key: "Q",
      name: "Abracadabra Cards",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Melemparkan 3 kartu tarot melayang dalam formasi kipas menyebar yang menusuk musuh dengan bilah kartu bercahaya merah muda."
    },
    skill2: {
      key: "W",
      name: "Vanishing Top Hat",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Menjatuhkan topi pesulap di tanah lalu berteleportasi seketika 5 meter ke belakang, meninggalkan boneka kelinci kejutan yang meledak."
    },
    ultimate: {
      key: "R",
      name: "Grand Mentalist",
      cd: 23,
      cost: 105,
      type: "aoe_burst",
      desc: "Mantra ilusi tingkat tinggi yang memanipulasi pikiran seluruh hero lawan di area target, membalikkan arah kontrol gerakan mereka (Confuse) selama 2 detik."
    }
  },
  {
    id: "lia",
    name: "Lia",
    title: "Papillon Dual Dancer",
    team: "team_love",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Papillon Twin Fans",
    stats: { hp: 2460, mana: 410, attack: 228, armor: 52, moveSpeed: 5.2 },
    passive: {
      name: "Social Butterfly",
      desc: "Lia memperoleh +5% Attack Damage untuk setiap hero lawan di dekatnya (hingga maksimal +25% saat teamfight 5 lawan 5)."
    },
    skill1: {
      key: "Q",
      name: "Flutter Slash",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Mengepakkan kipas kembarnya untuk menembakkan tornado kupu-kupu magenta tajam yang merobek armor lawan."
    },
    skill2: {
      key: "W",
      name: "Cheerful Kick-Off",
      cd: 7,
      cost: 45,
      type: "dash_shield",
      desc: "Melakukan tendangan akrobatik ceria ke depan, melompat di atas kepala lawan untuk merestart cooldown skill dan mendarat di belakang target."
    },
    ultimate: {
      key: "R",
      name: "Swarm of Papillons",
      cd: 21,
      cost: 100,
      type: "aoe_burst",
      desc: "Menari anggun memanggil badai ribuan kupu-kupu kaca bersayap pisau yang berputar mencabik musuh di area luas dan memberinya kekebalan sementara."
    }
  },
  {
    id: "gracie",
    name: "Gracie",
    title: "Cotton-Candy Ninja",
    team: "team_love",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Cotton-Candy Kunai",
    stats: { hp: 2420, mana: 400, attack: 232, armor: 48, moveSpeed: 5.3 },
    passive: {
      name: "Sweet Exterior, Spicy Bite",
      desc: "Penampilan manis menyembunyikan serangan pedas: serangan dasar dari semak memicu efek luka terbakar pedas yang memotong regenerasi HP musuh sebesar 50%."
    },
    skill1: {
      key: "Q",
      name: "Bunny Vault",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Melemparkan kunai permen kapas yang menempel pada lawan, lalu melesat menerjang target seketika dengan tebasan silang mematikan."
    },
    skill2: {
      key: "W",
      name: "Sugar-Spice Snare",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Menebar perangkap gula lengket di tanah yang mengikat kaki musuh yang menginjaknya dan memberi Gracie kecepatan lari kilat."
    },
    ultimate: {
      key: "R",
      name: "Cie-Cie-Cie Rampage",
      cd: 22,
      cost: 95,
      type: "aoe_burst",
      desc: "Mengamuk lincah sambil melontarkan 10 kunai pedas ke segala arah dengan suara tawa riang, menghabisi hero musuh yang sekarat seketika."
    }
  },
  {
    id: "lana",
    name: "Lana",
    title: "Crimson Moon Enchanter",
    team: "team_love",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Moonlight Compact Scepter",
    stats: { hp: 2310, mana: 570, attack: 142, armor: 45, moveSpeed: 4.8 },
    passive: {
      name: "Lunar Glamour",
      desc: "Pesona cermin kosmetik Lana menyilaukan musuh penyerang, menurunkan akurasi tembakan mereka sebesar 20% selama pertempuran."
    },
    skill1: {
      key: "Q",
      name: "Charming Prism Beam",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Memancarkan sinar prisma cinta magenta dari tongkat kosmetiknya yang membakar musuh dalam garis lurus panjang."
    },
    skill2: {
      key: "W",
      name: "Vanity Mirror",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Mendirikan cermin rias berkilau yang memantulkan kembali proyektil musuh pertama yang menabraknya ke arah penembak."
    },
    ultimate: {
      key: "R",
      name: "Set Sail, Crimson Moon",
      cd: 25,
      cost: 115,
      type: "aoe_burst",
      desc: "Memanggil kapal layar bulan merah megah yang berlayar melintasi arena pertempuran, menabrak dan memporakporandakan seluruh barisan musuh."
    }
  },
  {
    id: "indah",
    name: "Indah",
    title: "Calligraphy Feather Striker",
    team: "team_love",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Calligraphy Feather Crossbow",
    stats: { hp: 2240, mana: 450, attack: 218, armor: 42, moveSpeed: 4.9 },
    passive: {
      name: "Stories Through Writing",
      desc: "Tiap anak panah bulu angsa menorehkan tinta emas pada musuh; musuh dengan 4 goresan tinta menerima ledakan syair puitis yang menghasilkan True Damage."
    },
    skill1: {
      key: "Q",
      name: "Ink Bolt",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Menembakkan anak panah kaligrafi bertinta tajam yang menembus minion dan meninggalkan jejak tinta mempercepat langkah kawan."
    },
    skill2: {
      key: "W",
      name: "Graceful Margin",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Melangkah anggun ke belakang seperti menulis garis tepi buku, menghindar dari serangan dan mengisi ulang seluruh amunisi panah."
    },
    ultimate: {
      key: "R",
      name: "Chapter of the Undergirls Center",
      cd: 20,
      cost: 95,
      type: "aoe_burst",
      desc: "Membuka lembaran naskah emas raksasa di udara yang menembakkan hujan 16 panah pena bulu ke area target, menghujani musuh tanpa jeda."
    }
  },
  {
    id: "lily",
    name: "Lily",
    title: "Alchemical Blaster",
    team: "team_love",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Alchemi-Shot Blaster",
    stats: { hp: 2260, mana: 470, attack: 212, armor: 44, moveSpeed: 4.9 },
    passive: {
      name: "Chemical Reaction",
      desc: "Tembakan Lily mencampurkan ramuan kimia: cairan merah menghasilkan ledakan bakar, cairan biru memberi efek slow, cairan hijau memulihkan sedikit HP."
    },
    skill1: {
      key: "Q",
      name: "Free-Fire Jump Shot",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Melompat ke depan sambil menembakkan meriam kimia berdaya dorong besar yang meledakkan area depan dan memukul mundur musuh."
    },
    skill2: {
      key: "W",
      name: "Brachiosaurus Flask",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Melemparkan labu kimia berbentuk dinosaurus mini yang menciptakan kubah asap asam pelindung, menyembunyikan Lily dari serangan lawan."
    },
    ultimate: {
      key: "R",
      name: "Papipapipum Overcharge",
      cd: 22,
      cost: 100,
      type: "aoe_burst",
      desc: "Meng-overcharge tabung reaksi senjatanya lalu menembakkan bola plasma alkimia raksasa yang meledak bertahap menghasilkan damage area dahsyat."
    }
  },
  {
    id: "nayla",
    name: "Nayla",
    title: "Katakana Blade Rapper",
    team: "team_love",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Katakana Dual Blades",
    stats: { hp: 2470, mana: 390, attack: 235, armor: 50, moveSpeed: 5.3 },
    passive: {
      name: "Katakana Flow",
      desc: "Rima lagu rap Nayla selaras dengan ayunan pedangnya: setiap penggunaan skill menambah Attack Speed sebesar 25% untuk 3 serangan berikutnya."
    },
    skill1: {
      key: "Q",
      name: "Moshi-Moshi Dash",
      cd: 5,
      cost: 35,
      type: "projectile",
      desc: "Menyapa musuh dengan sambaran tebasan kilat ke depan yang memotong armor lawan dan dapat digunakan kembali jika mengenai hero."
    },
    skill2: {
      key: "W",
      name: "Spicy Rap Cadence",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Mengeluarkan rap bertempo cepat yang menciptakan gelombang bunyi pelindung di sekelilingnya, menolak musuh dan memberi perisai."
    },
    ultimate: {
      key: "R",
      name: "Welcome to Naylalaland: Bakkyun!",
      cd: 20,
      cost: 95,
      type: "aoe_burst",
      desc: "Mengeksekusi jurus pamungkas 'Bakkyun!'—sambaran tebasan cinta berkecepatan suara yang mengunci target tunggal dengan ledakan kritikal mematikan."
    }
  },
  {
    id: "alya",
    name: "Alya",
    title: "Taekwondo Prism Brawler",
    team: "team_love",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Prism Greaves",
    stats: { hp: 3150, mana: 370, attack: 190, armor: 76, moveSpeed: 5.1 },
    passive: {
      name: "Tomboy Endurance",
      desc: "Semangat tomboy pantang menyerah: semakin rendah HP Alya, semakin tinggi armor dan lifesteal fisiknya (hingga +30%)."
    },
    skill1: {
      key: "Q",
      name: "Taekwondo Crescent Kick",
      cd: 5,
      cost: 35,
      type: "projectile",
      desc: "Melancarkan tendangan sabit taekwondo berputar ke atas yang melepaskan bilah angin magenta dan meluncurkan musuh ke udara."
    },
    skill2: {
      key: "W",
      name: "Full-Throttle Ride",
      cd: 7,
      cost: 45,
      type: "dash_shield",
      desc: "Menerjang maju dengan kecepatan penuh menabrak musuh pertama, mendapatkan perisai tebal dan menghentikan pergerakan lawan (Stun 0,8s)."
    },
    ultimate: {
      key: "R",
      name: "Rainbow After the Rain",
      cd: 22,
      cost: 95,
      type: "aoe_burst",
      desc: "Melompat tinggi ke langit lalu menghunjam tanah dengan tendangan meteor prisma pelangi yang memecahkan tanah arena pertempuran."
    }
  },
  {
    id: "elin",
    name: "Elin",
    title: "Lavender Dream Medic",
    team: "team_love",
    role: "Healer",
    lane: "Roamer",
    weapon: "Lavender Cotton-Candy Censer",
    stats: { hp: 2800, mana: 600, attack: 120, armor: 64, moveSpeed: 4.8 },
    passive: {
      name: "Miracle Healer",
      desc: "Aroma dupa lavender Elin melipatgandakan efek penyembuhan pada rekan setim yang HP-nya kritis di bawah 30% sebesar 50% lebih tinggi."
    },
    skill1: {
      key: "Q",
      name: "Cotton-Candy Mist",
      cd: 5,
      cost: 45,
      type: "projectile",
      desc: "Meniupkan kabut wangi permen kapas manis yang menenangkan musuh (Slow 35%) dan menyembuhkan sekutu di jalurnya."
    },
    skill2: {
      key: "W",
      name: "Lavender Lullaby",
      cd: 9,
      cost: 55,
      type: "dash_shield",
      desc: "Memutar dupa lavender di sekeliling diri, membentuk gelembung pelindung wangi yang memulihkan HP diri sendiri dan rekan terdekat."
    },
    ultimate: {
      key: "R",
      name: "Bloom of Pure Healing",
      cd: 26,
      cost: 120,
      type: "aoe_burst",
      desc: "Mekarkan bunga lavender raksasa di medan perang yang melepaskan gelombang kesembuhan murni seketika ke seluruh hero satu tim di arena."
    }
  },
  {
    id: "cynthia",
    name: "Cynthia",
    title: "Architect Prism Fighter",
    team: "team_love",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Prism Drafting Gauntlets",
    stats: { hp: 3180, mana: 360, attack: 188, armor: 78, moveSpeed: 5.0 },
    passive: {
      name: "POP! POP! Momentum",
      desc: "Tiap skill yang berhasil mendarat memberikan tumpukan POP!; pada 3 tumpukan, pukulan berikutnya memicu ledakan kinetik beruntun."
    },
    skill1: {
      key: "Q",
      name: "Interior Partition",
      cd: 6,
      cost: 40,
      type: "projectile",
      desc: "Memproyeksikan dinding partisi arsitektur prisma di tanah yang menghalangi pergerakan musuh dan memberikan damage saat terbentuk."
    },
    skill2: {
      key: "W",
      name: "All-Rounder Dash",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Meluncur taktis ke arah mana pun sambil memperkuat sarung tangan prismanya dengan perisai pelindung berdurasi 2,5 detik."
    },
    ultimate: {
      key: "R",
      name: "Grand Theater Blueprint",
      cd: 24,
      cost: 100,
      type: "aoe_burst",
      desc: "Menghamparkan denah panggung teater bercahaya di lantai pertempuran, mengurung musuh dan menjatuhkan balok pilar panggung ke atas mereka."
    }
  },
  {
    id: "anindya",
    name: "Anindya",
    title: "Golden Nectar Chime",
    team: "team_love",
    role: "Healer",
    lane: "Roamer",
    weapon: "Golden Mango Nectar Bell",
    stats: { hp: 2880, mana: 570, attack: 128, armor: 66, moveSpeed: 4.8 },
    passive: {
      name: "Disciplined Efficiency",
      desc: "Efisiensi manajemen waktu Anindya memotong cooldown seluruh skill rekan setim di sekitarnya sebesar 10% secara pasif."
    },
    skill1: {
      key: "Q",
      name: "Sweet Mango Nectar",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Melontarkan tetesan nektar mangga emas yang meledak manis, memberi damage pada lawan dan menyembuhkan kawan di area cipratan."
    },
    skill2: {
      key: "W",
      name: "Tiny Evade Chime",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Membunyikan lonceng emas untuk melakukan langkah menghindar lincah ke samping sambil memberi perisai nektar kepada diri dan satu kawan."
    },
    ultimate: {
      key: "R",
      name: "Teamwork Rally",
      cd: 25,
      cost: 110,
      type: "aoe_burst",
      desc: "Membunyikan lonceng emas berkekuatan penuh: seluruh tim menerima peningkatan 30% Attack Damage dan perisai nektar emas selama 5 detik."
    }
  },
  {
    id: "cathy",
    name: "Cathy",
    title: "Fairy-Lord Duelist",
    team: "team_love",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Tring! Fairy-Lord Rapier",
    stats: { hp: 3050, mana: 380, attack: 198, armor: 72, moveSpeed: 5.1 },
    passive: {
      name: "Lord Cathy's Mischief",
      desc: "Serangan Cathy dari samping atau belakang menghasilkan suara 'Tring!' khas yang menjamin serangan tersebut 100% Critical Hit."
    },
    skill1: {
      key: "Q",
      name: "Tring! Lunge",
      cd: 4,
      cost: 30,
      type: "projectile",
      desc: "Menusuk pedang rapier dengan presisi kilat ke depan, menembus armor musuh dan memicu efek bleeding selama 3 detik."
    },
    skill2: {
      key: "W",
      name: "Fairy Dust Taunt",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Menebar serbuk peri berkilau sambil bersalto anggun, memprovokasi musuh terdekat untuk menyerang perisai peri yang baru terbentuk."
    },
    ultimate: {
      key: "R",
      name: "Reign of Lord Cathy",
      cd: 22,
      cost: 95,
      type: "aoe_burst",
      desc: "Memproklamirkan tahta peri magis, melakukan tusukan rapier berkecepatan cahaya ke seluruh hero lawan di area melingkar dengan gaya bangsawan peri."
    }
  },

  // ==========================================
  // TEAM PASSION (14 HERO) — Tema: Amber
  // ==========================================
  {
    id: "christy",
    name: "Christy",
    title: "Solar Flare Crossbow",
    team: "team_passion",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Blazing Sun Crossbow",
    stats: { hp: 2220, mana: 440, attack: 222, armor: 42, moveSpeed: 5.0 },
    passive: {
      name: "Ignited Bolts",
      desc: "Setiap panah Christy menimbun panas matahari pada target; pada 3 tumpukan, panah membakar musuh menghasilkan true damage per detik."
    },
    skill1: {
      key: "Q",
      name: "Rapid Volley",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Menembakkan rentetan 5 panah api cepat ke arah target yang mengikis armor lawan dengan daya tembus tinggi."
    },
    skill2: {
      key: "W",
      name: "Inferno Trap",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Memasang jebakan api amber di tanah sambil melompat mundur; musuh yang menginjaknya akan terkena root dan terbakar."
    },
    ultimate: {
      key: "R",
      name: "Supernova Barrage",
      cd: 21,
      cost: 100,
      type: "aoe_burst",
      desc: "Menembakkan anak panah matahari raksasa ke angkasa yang membelah diri menjadi badai hujan api supernova meluluhlantakkan area musuh."
    }
  },
  {
    id: "muthe",
    name: "Muthe",
    title: "Crimson Flame Tailor",
    team: "team_passion",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Crimson Flame Needles & Spools",
    stats: { hp: 2440, mana: 410, attack: 230, armor: 48, moveSpeed: 5.3 },
    passive: {
      name: "Tailor's Agility",
      desc: "Kelincahan penjahit busana membuat Muthe dapat menembus unit minion dan hero tanpa tabrakan, memperoleh +15% Move Speed di pertempuran."
    },
    skill1: {
      key: "Q",
      name: "Needle Dash",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Melesat maju seperti jarum jahit yang menembus kain, menusuk musuh dan meninggalkan benang sutra berapi di jalurnya."
    },
    skill2: {
      key: "W",
      name: "Seam Pull",
      cd: 7,
      cost: 45,
      type: "dash_shield",
      desc: "Menarik kembali semua benang sutra berapi yang ada di arena, menyeret lawan yang tersangkut ke arah Muthe dan memberinya perisai."
    },
    ultimate: {
      key: "R",
      name: "Mu-Mu-Mu-The Tapestry",
      cd: 20,
      cost: 95,
      type: "aoe_burst",
      desc: "Menenun jaring sutra api raksasa di sekeliling target, mencabik mereka dalam sangkar benang merah menyala ber-damage masif."
    }
  },
  {
    id: "jessi",
    name: "Jessi",
    title: "Breakdance Rhythm Bruiser",
    team: "team_passion",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Ignite Rhythm Tonfas",
    stats: { hp: 3220, mana: 360, attack: 186, armor: 80, moveSpeed: 5.0 },
    passive: {
      name: "Source of Energy",
      desc: "Energi tarian breakdance Jessi terus berdenyut: setiap serangan fisik berturut-turut memulihkan 5% energi dan meningkatkan pertahanan."
    },
    skill1: {
      key: "Q",
      name: "Rhythm Combo",
      cd: 5,
      cost: 35,
      type: "projectile",
      desc: "Melancarkan pukulan tonfa ganda mengikuti ketukan musik drum yang melepaskan gelombang kejut getaran amber ke depan."
    },
    skill2: {
      key: "W",
      name: "Breakdance Flare",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Melakukan putaran kaki breakdance di lantai membentuk lingkaran api yang menangkis serangan dan menjatuhkan musuh di sekitarnya."
    },
    ultimate: {
      key: "R",
      name: "Dancing Queen Overdrive",
      cd: 22,
      cost: 95,
      type: "aoe_burst",
      desc: "Memasuki mode overdrive ratu dansa: kecepatan gerak dan serang meningkat drastis, serta setiap pukulan memicu ledakan ritme berapi."
    }
  },
  {
    id: "kathrina",
    name: "Kathrina",
    title: "Solar-Storm Sniper",
    team: "team_passion",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Katrina Solar-Storm Rifle",
    stats: { hp: 2210, mana: 450, attack: 226, armor: 40, moveSpeed: 4.9 },
    passive: {
      name: "Never Miss a Chance",
      desc: "Mata tajam Kathrina menandai titik lemah musuh; tembakan ke arah titik lemah tersebut memberikan bonus 40% Critical Damage."
    },
    skill1: {
      key: "Q",
      name: "Katrina Vortex Bullet",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Menembakkan peluru pusaran badai surya yang melesat kencang menembus barisan minion dan meledak di ujung jarak tembak."
    },
    skill2: {
      key: "W",
      name: "Valkyrie Reposition",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Melakukan manuver reposisi taktis mundur dengan melompat ke belakang, mendapatkan perisai optik dan pandangan semak."
    },
    ultimate: {
      key: "R",
      name: "Starlock Precision",
      cd: 23,
      cost: 105,
      type: "aoe_burst",
      desc: "Mengunci target terjauh dengan teropong bidik satelit lalu melepaskan tembakan railgun berkekuatan badai matahari yang memusnahkan target."
    }
  },
  {
    id: "oniel",
    name: "Oniel",
    title: "Mystery Flame Jester",
    team: "team_passion",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Ember Riddle Ukulele",
    stats: { hp: 2340, mana: 550, attack: 144, armor: 46, moveSpeed: 4.8 },
    passive: {
      name: "Enigma Spark",
      desc: "Teka-teki api Oniel membingungkan lawan: setiap serangan skill Oniel memiliki peluang 30% memicu ledakan kejutan ekstra secara acak."
    },
    skill1: {
      key: "Q",
      name: "Mystery Flame Box",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Melemparkan kotak api misteri yang meletup di area sasaran, memancarkan kembang api amber yang membingungkan arah gerak musuh."
    },
    skill2: {
      key: "W",
      name: "Dad-Joke Shockwave",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Memetik ukulele dengan nada jenaka yang melepaskan gelombang kejut komedi, membuat musuh tertegun (Stun 0,8s) dan memberinya perisai."
    },
    ultimate: {
      key: "R",
      name: "Labyrinth of Embers",
      cd: 24,
      cost: 110,
      type: "aoe_burst",
      desc: "Mendirikan labirin api bara misterius di area war: musuh di dalamnya tersesat, menerima damage bara berkelanjutan dan kehilangan penglihatan peta."
    }
  },
  {
    id: "lulu",
    name: "Lulu",
    title: "Starfire Melodist",
    team: "team_passion",
    role: "Healer",
    lane: "Roamer",
    weapon: "Starfire Lyre",
    stats: { hp: 2860, mana: 580, attack: 126, armor: 65, moveSpeed: 4.8 },
    passive: {
      name: "Bright as the Stars",
      desc: "Cahaya bintang api Lulu menerangi pertempuran: rekan setim di dekat Lulu menerima regenerasi HP ekstra sebesar 15% dari semua sumber."
    },
    skill1: {
      key: "Q",
      name: "Warm Melody Wave",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Memetik harpa api bintang untuk memancarkan gelombang melodi hangat yang menyembuhkan rekan dan melukai musuh di garis lintasannya."
    },
    skill2: {
      key: "W",
      name: "Sweet Mochi Lantern",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Menempatkan lentera mochi manis yang memancarkan perisai hangat bagi sekutu yang mendekatinya dan meningkatkan armor mereka."
    },
    ultimate: {
      key: "R",
      name: "Encore of Eight Stars",
      cd: 25,
      cost: 115,
      type: "aoe_burst",
      desc: "Memainkan lagu encore 8 bintang suci yang memulihkan HP seluruh tim secara bertahap dan menganugerahkan kekebalan kematian selama 1,5 detik."
    }
  },
  {
    id: "kimmy",
    name: "Kimmy",
    title: "Pyro-Ribbon Acrobat",
    team: "team_passion",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Pyro-Ribbon Chakrams",
    stats: { hp: 2430, mana: 400, attack: 230, armor: 48, moveSpeed: 5.3 },
    passive: {
      name: "Baby Hamster Sprint",
      desc: "Kelincahan hamster kecil membuat Kimmy bergerak 10% lebih cepat dan dapat melakukan sprint cepat setiap kali melompati rintangan."
    },
    skill1: {
      key: "Q",
      name: "Cartwheel Double-Throw",
      cd: 5,
      cost: 35,
      type: "projectile",
      desc: "Melakukan putaran roda akrobatik sambil melempar sepasang cakram berapi yang menyayat musuh lalu kembali ke tangannya."
    },
    skill2: {
      key: "W",
      name: "Mimit & Memet Dash",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Meluncur lincah ke arah depan bersama roh pelindung Mimit & Memet yang memberinya perisai api dan kecepatan serangan ekstra."
    },
    ultimate: {
      key: "R",
      name: "Fierce Gymnastics Finale",
      cd: 21,
      cost: 95,
      type: "aoe_burst",
      desc: "Rangkaian tarian senam akrobatik mematikan di udara, melempar cakram api spiral ke tanah yang membelah pertahanan hero lawan."
    }
  },
  {
    id: "erine",
    name: "Erine",
    title: "Flame Chess Grandmaster",
    team: "team_passion",
    role: "Mage",
    lane: "Mid Lane",
    weapon: "Checkmate Flame Chessboard",
    stats: { hp: 2330, mana: 560, attack: 146, armor: 46, moveSpeed: 4.8 },
    passive: {
      name: "Fiery Temper",
      desc: "Kemarahan api catur Erine meningkatkan Magic Damage-nya sebesar 3% setiap kali skill-nya mengenai target (dapat ditumpuk hingga 10x)."
    },
    skill1: {
      key: "Q",
      name: "Flame Knight & Rook",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Memanggil bidak kuda dan benteng catur berapi yang menerjang maju ke target, menghancurkan barisan pertahanan musuh."
    },
    skill2: {
      key: "W",
      name: "Piano Flare Arpeggio",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Memainkan tuts piano api imajiner yang memanggil perisai tuts berapi dan memperlambat musuh di sekitarnya."
    },
    ultimate: {
      key: "R",
      name: "Grand Checkmate",
      cd: 24,
      cost: 110,
      type: "aoe_burst",
      desc: "Membentangkan papan catur api raksasa di tanah: semua bidak ratu api menjatuhkan hukuman skakmat mutlak yang meledak di seluruh kotak catur."
    }
  },
  {
    id: "aralie",
    name: "Aralie",
    title: "Ember Lotus Healer",
    team: "team_passion",
    role: "Healer",
    lane: "Roamer",
    weapon: "Ember-Bead Lotus Lantern",
    stats: { hp: 2840, mana: 570, attack: 125, armor: 66, moveSpeed: 4.8 },
    passive: {
      name: "Lingering Bloom",
      desc: "Kelopak teratai api Aralie yang jatuh meninggalkan aura kehangatan di tanah yang memulihkan HP rekan yang menginjaknya."
    },
    skill1: {
      key: "Q",
      name: "Empathy Link",
      cd: 6,
      cost: 45,
      type: "projectile",
      desc: "Menghubungkan tali empati teratai ke rekan setim, membagi pemulihan HP dan membagi rata damage yang diterima keduanya."
    },
    skill2: {
      key: "W",
      name: "Beaded Petal Wave",
      cd: 8,
      cost: 50,
      type: "dash_shield",
      desc: "Mengibaskan manik-manik teratai bercahaya untuk memunculkan perisai kelopak bunga teratai di sekeliling Aralie dan sekutu terdekat."
    },
    ultimate: {
      key: "R",
      name: "Garden of Warmth",
      cd: 25,
      cost: 115,
      type: "aoe_burst",
      desc: "Menumbuhkan taman bunga teratai api raksasa di arena perang yang menyucikan segala efek kutukan (Debuff/CC) dan menyembuhkan tim secara berkala."
    }
  },
  {
    id: "danella",
    name: "Danella",
    title: "Inferno Whip Berserker",
    team: "team_passion",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Inferno Whip-Blades",
    stats: { hp: 3160, mana: 370, attack: 192, armor: 78, moveSpeed: 5.1 },
    passive: {
      name: "Twin Synchronization",
      desc: "Sinkronisasi naluri kembar menambah kecepatan serang dan daya cambuk Danella sebesar 20% saat bertarung di garis depan."
    },
    skill1: {
      key: "Q",
      name: "Knock-Knock Pull",
      cd: 5,
      cost: 35,
      type: "projectile",
      desc: "Mengibaskan cambuk api ke depan untuk mengait musuh, menarik target mendekat dan memicu efek Stun singkat."
    },
    skill2: {
      key: "W",
      name: "Chronicles Power Spin",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Memutar cambuk bilah apinya membentuk lingkaran tornado api berdurasi 2 detik yang memotong proyektil dan memberi perisai api."
    },
    ultimate: {
      key: "R",
      name: "Welcome to My World",
      cd: 22,
      cost: 95,
      type: "aoe_burst",
      desc: "Mencambuk tanah arena hingga merekah menjadi kawah lava amber membara yang membakar dan memperlambat seluruh musuh di dalamnya."
    }
  },
  {
    id: "levi",
    name: "Levi",
    title: "Pyro-Mecha Engineer",
    team: "team_passion",
    role: "Fighter",
    lane: "EXP Lane",
    weapon: "Pyro-Mecha Titan Gauntlets",
    stats: { hp: 3280, mana: 360, attack: 184, armor: 84, moveSpeed: 4.9 },
    passive: {
      name: "Robotic Engineering",
      desc: "Keahlian merakit robot Levi otomatis memperbaiki sarung tangan mekaniknya, menghasilkan perisai baja setiap 10 detik saat di luar pertempuran."
    },
    skill1: {
      key: "Q",
      name: "Lego Mini-Bot",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Menembakkan robot mini modular yang berlari ke arah musuh dan meledakkan muatan termal amber pada benturan pertama."
    },
    skill2: {
      key: "W",
      name: "Override Code Smash",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Melakukan pukulan dorong hidrolik bertenaga roket ke depan, meremukkan perisai musuh dan meningkatkan armor Levi sebesar 30 poin."
    },
    ultimate: {
      key: "R",
      name: "Titan Protocol",
      cd: 23,
      cost: 100,
      type: "aoe_burst",
      desc: "Mengaktifkan protokol baju zirah Titan Mecha raksasa selama 8 detik: jangkauan pukulan meluas, kebal Crowd Control, dan pukulan berdaya ledak gempa."
    }
  },
  {
    id: "raisha",
    name: "Raisha",
    title: "Sakura-Flame Smasher",
    team: "team_passion",
    role: "Marksman",
    lane: "Gold Lane",
    weapon: "Sakura-Flame Racket & Shuttle",
    stats: { hp: 2230, mana: 430, attack: 224, armor: 42, moveSpeed: 5.0 },
    passive: {
      name: "Pride of Sakura",
      desc: "Semangat atletis Raisha meningkatkan kecepatan lari sebesar 25% selama 2 detik setiap kali pukulan smash-nya berhasil menghasilkan Critical Hit."
    },
    skill1: {
      key: "Q",
      name: "Blazing Drive Shot",
      cd: 4,
      cost: 35,
      type: "projectile",
      desc: "Memukul kok bulutangkis api berkecepatan 400 km/jam lurus ke depan yang membakar dan menembus barisan pertahanan lawan."
    },
    skill2: {
      key: "W",
      name: "Drop-Shot Footwork",
      cd: 7,
      cost: 40,
      type: "dash_shield",
      desc: "Gerakan kaki lincah menyamping untuk mengecoh musuh, meninggalkan bayangan kelopak sakura api yang mengecoh tembakan proyektil."
    },
    ultimate: {
      key: "R",
      name: "Jumping Smash: Sakura Flare",
      cd: 20,
      cost: 95,
      type: "aoe_burst",
      desc: "Melompat tinggi di udara dengan gaya jumping smash legendaris lalu menghantamkan kok meteor sakura berapi yang meledakkan tanah lawan."
    }
  },
  {
    id: "daisy",
    name: "Daisy",
    title: "Sun-Daisy Parasol Maiden",
    team: "team_passion",
    role: "Healer",
    lane: "Roamer",
    weapon: "Sun-Daisy Parasol",
    stats: { hp: 2820, mana: 580, attack: 124, armor: 65, moveSpeed: 4.8 },
    passive: {
      name: "Refreshing Fragrance",
      desc: "Keharuman bunga aster matahari Daisy menyegarkan kawan, memberikan kekebalan terhadap efek Slow bagi sekutu di sekeliling payungnya."
    },
    skill1: {
      key: "Q",
      name: "Parasol Ward",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Melemparkan payung aster berputar ke area depan yang menangkis serangan musuh dan menaburkan kelopak bunga penyembuh ke rekan."
    },
    skill2: {
      key: "W",
      name: "One-on-One Warmth",
      cd: 8,
      cost: 45,
      type: "dash_shield",
      desc: "Meluncur cepat ke arah rekan setim terdekat, memayungi mereka berdua dengan kubah kehangatan yang menyerap damage hingga 600 HP."
    },
    ultimate: {
      key: "R",
      name: "Grand Daisy Bloom",
      cd: 25,
      cost: 110,
      type: "aoe_burst",
      desc: "Membuka payung matahari raksasa ke langit yang memancarkan sinar hangat mentari pagi ke seluruh arena, memulihkan 40% Max HP seluruh tim."
    }
  },
  {
    id: "ribka",
    name: "Ribka",
    title: "Crimson Cello Duelist",
    team: "team_passion",
    role: "Assassin",
    lane: "Jungler",
    weapon: "Crimson Cello-Blade & Mirror Shards",
    stats: { hp: 2460, mana: 400, attack: 234, armor: 50, moveSpeed: 5.3 },
    passive: {
      name: "Calculated Angle",
      desc: "Perhitungan sudut matematis yang presisi: setiap serangan dari sudut kemiringan tertentu meningkatkan critical chance sebesar 25%."
    },
    skill1: {
      key: "Q",
      name: "Mirror on the Wall",
      cd: 5,
      cost: 40,
      type: "projectile",
      desc: "Melemparkan pecahan cermin merah berputar yang memantulkan laser cello tajam di antara musuh-musuh yang berdekatan."
    },
    skill2: {
      key: "W",
      name: "Cello Flame Bow",
      cd: 7,
      cost: 45,
      type: "dash_shield",
      desc: "Menggesekkan busur cello berapi ke arah depan sambil meluncur cepat, menepis serangan masuk dan memotong kecepatan musuh."
    },
    ultimate: {
      key: "R",
      name: "Shattered Reflection",
      cd: 21,
      cost: 100,
      type: "aoe_burst",
      desc: "Memecahkan bayangan cermin ilusi di sekeliling target, menyerang dari 4 arah cermin secara serentak dengan nada cello maut yang mematikan."
    }
  }
];


export const ROSTER_DATA = {};

for (const h of HEROES) {
    if (!h.slug) h.slug = h.id;
    if (!h.teamKey) h.teamKey = h.team.replace('team_', '');
    h.is3DActive = ACTIVE_HERO_IDS.includes(h.id);

    // Normalize paths
    h.portraitSource = `asset game/${h.team.replace('_', ' ')}/${h.name}.jpg`;
    h.avatarCropped = `portraits_cropped/avatars/${h.team}/${h.slug}_avatar.webp`;
    h.cardCropped = `portraits_cropped/cards/${h.team}/${h.slug}_card.webp`;

    h.weaponGlb = `weapons_glb/${h.team}/${h.slug}_weapon.glb`;
    h.weaponPreview2D = `weapons_preview_2d/${h.team}/${h.slug}_weapon.png`;
    h.skillsVfxGlb = `skills_vfx_glb/${h.team}/${h.slug}_skills_vfx.glb`;

    h.audio = {
        basic: `audio/heroes/${h.team}/${h.slug}_basic.mp3`,
        passive: `audio/heroes/${h.team}/${h.slug}_passive.mp3`,
        s1: `audio/heroes/${h.team}/${h.slug}_s1.mp3`,
        s2: `audio/heroes/${h.team}/${h.slug}_s2.mp3`,
        ult: `audio/heroes/${h.team}/${h.slug}_ult.mp3`
    };

    h.skillIcons = {
        passive: `skill_icons/${h.team}/${h.slug}_passive.webp`,
        s1: `skill_icons/${h.team}/${h.slug}_s1.webp`,
        s2: `skill_icons/${h.team}/${h.slug}_s2.webp`,
        ult: `skill_icons/${h.team}/${h.slug}_ult.webp`
    };

    // Ensure weapon object
    if (typeof h.weapon === 'string') {
        h.weapon = { name: h.weapon, description: `Senjata legendaris khas ${h.name}` };
    }

    ROSTER_DATA[h.id] = h;
}

export function getAllHeroes() {
    return HEROES;
}

export function getActiveHeroes() {
    return HEROES.filter(h => h.is3DActive);
}

export function getHeroById(id) {
    if (!id) return null;
    return ROSTER_DATA[id.toLowerCase()] || HEROES.find(h => h.id.toLowerCase() === id.toLowerCase() || h.name.toLowerCase() === id.toLowerCase()) || null;
}
