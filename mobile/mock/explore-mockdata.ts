/**
 * Realistic Mock Data for Explore Feature
 *
 * Complete, production-ready mock data for testing UI/UX
 * - Bilingual (English + Indonesian)
 * - Modern church context
 * - Natural, engaging content
 * - All fields populated
 * - Matches TypeScript types exactly (snake_case fields)
 */

import type {
  DailyDevotion,
  VerseOfTheDay,
  BibleFigure,
  DailyQuiz,
  BibleStudy,
  TopicalCategory,
  BibleReference,
  MultilingualText,
} from '@/types/explore';

// ============================================================================
// HELPER: Create Bible Reference
// ============================================================================

function createBibleRef(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number,
  translation: string = 'NIV',
  text?: string
): BibleReference & { text?: string } {
  return {
    book,
    chapter,
    verse_start: verseStart,
    verse_end: verseEnd,
    translation,
    ...(text && { text }),
  };
}

// ============================================================================
// DAILY DEVOTIONS
// ============================================================================

export const mockDailyDevotions: DailyDevotion[] = [
  {
    id: 'dev_001',
    scope: 'global',
    title: {
      en: 'Finding Peace in the Storm',
      id: 'Menemukan Damai di Tengah Badai',
    },
    content: {
      en: `Life often feels like a storm—unpredictable, overwhelming, and beyond our control. Bills pile up, relationships strain, health concerns arise, and we find ourselves asking, "Where is God in all of this?"

The disciples faced a literal storm when Jesus was sleeping in their boat. They panicked, woke Him up, and Jesus simply spoke: "Peace, be still." The winds ceased immediately.

Here's the profound truth: Jesus wasn't surprised by the storm. He knew it was coming. Yet He got in the boat anyway. He didn't promise calm seas—He promised His presence.

Today, whatever storm you're facing, Jesus is in the boat with you. He hasn't abandoned you. He hasn't forgotten you. And when the time is right, He will speak peace over your situation.

But sometimes, the greater miracle isn't calming the storm outside—it's calming the storm inside. It's having peace that surpasses understanding even when circumstances haven't changed.

What if God allowed the storm not to destroy you, but to reveal His power in you? What if this difficult season is actually positioning you for your greatest breakthrough?

Don't let fear drown out faith. The same God who calmed ancient seas can calm your anxious heart today.`,
      id: `Hidup sering terasa seperti badai—tak terduga, luar biasa, dan di luar kendali kita. Tagihan menumpuk, hubungan tegang, masalah kesehatan muncul, dan kita bertanya, "Di mana Tuhan dalam semua ini?"

Para murid menghadapi badai literal ketika Yesus tidur di perahu mereka. Mereka panik, membangunkan-Nya, dan Yesus hanya berkata: "Diam! Tenanglah." Angin pun reda seketika.

Inilah kebenaran mendalam: Yesus tidak terkejut dengan badai itu. Dia tahu badai akan datang. Namun Dia tetap naik ke perahu. Dia tidak menjanjikan laut yang tenang—Dia menjanjikan kehadiran-Nya.

Hari ini, badai apa pun yang kamu hadapi, Yesus ada di perahu bersamamu. Dia tidak meninggalkanmu. Dia tidak melupakanmu. Dan ketika waktunya tepat, Dia akan berbicara damai atas situasimu.

Tapi terkadang, mukjizat yang lebih besar bukanlah menenangkan badai di luar—melainkan menenangkan badai di dalam. Memiliki damai yang melampaui segala akal bahkan ketika keadaan belum berubah.

Bagaimana jika Tuhan mengizinkan badai bukan untuk menghancurkanmu, tetapi untuk menyatakan kuasa-Nya dalam dirimu? Bagaimana jika musim sulit ini sebenarnya memposisikanmu untuk terobosan terbesarmu?

Jangan biarkan ketakutan menenggelamkan iman. Tuhan yang sama yang menenangkan laut kuno dapat menenangkan hati cemasmu hari ini.`,
    },
    author: {
      en: 'Pastor Michael Chen',
      id: 'Pendeta Michael Chen',
    },
    summary: {
      en: 'Jesus brings peace to life\'s storms, not just outside but inside our hearts.',
      id: 'Yesus membawa damai dalam badai kehidupan, bukan hanya di luar tetapi di dalam hati kita.',
    },
    main_verse: createBibleRef('Mark', 4, 39, undefined, 'NIV', 'He got up, rebuked the wind and said to the waves, "Quiet! Be still!" Then the wind died down and it was completely calm.'),
    additional_verses: [
      createBibleRef('Isaiah', 41, 10, undefined, 'NIV', 'So do not fear, for I am with you; do not be dismayed, for I am your God.'),
      createBibleRef('Philippians', 4, 6, 7, 'NIV', 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.'),
    ],
    reading_time_minutes: 4,
    tags: ['peace', 'faith', 'trust', 'storms'],
    image_url: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800&q=80',
    ai_generated: false,
    status: 'published',
    version: 1,
    published_at: '2025-01-15T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-14T10:00:00Z',
    deleted: false,
  },
  {
    id: 'dev_002',
    scope: 'global',
    title: {
      en: 'The Power of Consistent Prayer',
      id: 'Kuasa Doa yang Konsisten',
    },
    content: {
      en: `We live in a culture obsessed with instant results. Fast food, same-day delivery, instant messaging. We've been trained to expect immediate gratification in everything—including our prayer life.

But what if the most powerful prayers aren't the ones that get answered quickly? What if consistency matters more than intensity?

Consider the persistent widow in Luke 18. She didn't pray once and give up. She kept coming back, day after day, until the judge finally listened. Jesus told this parable specifically "to show them that they should always pray and not give up."

The word "always" is significant. Not sometimes. Not when we feel like it. Always.

Daniel prayed three times a day, every day, for his entire life. He didn't stop when circumstances were good, and he didn't stop when they threw him into the lion's den. His consistent prayer life had built such a strong foundation that nothing could shake it.

Many Christians treat prayer like a spare tire—only needed in emergencies. But prayer is meant to be the engine, not the spare tire. It's the daily fuel that keeps us connected to God's power and presence.

Your breakthrough might not come after one desperate prayer. It might come after 100 faithful prayers. After 1,000 consistent conversations with God. The question isn't whether God hears you—He always does. The question is: Will you keep praying even when you don't see immediate results?

Consistency in prayer isn't about impressing God. It's about transforming you. Each prayer shapes your heart, aligns your will with His, and deepens your dependence on Him.

Don't give up. Keep praying. Keep seeking. Keep knocking. The faithful persistence you demonstrate today is building a prayer legacy that will impact not just your life, but generations to come.`,
      id: `Kita hidup dalam budaya yang terobsesi dengan hasil instan. Fast food, pengiriman sehari, pesan instan. Kita telah terlatih mengharapkan kepuasan segera dalam segala hal—termasuk kehidupan doa kita.

Tapi bagaimana jika doa yang paling berkuasa bukanlah yang dijawab dengan cepat? Bagaimana jika konsistensi lebih penting daripada intensitas?

Pertimbangkan janda yang gigih dalam Lukas 18. Dia tidak berdoa sekali lalu menyerah. Dia terus datang kembali, hari demi hari, sampai hakim akhirnya mendengarkan. Yesus menceritakan perumpamaan ini khusus "untuk menunjukkan bahwa mereka harus selalu berdoa dan tidak putus asa."

Kata "selalu" itu penting. Bukan kadang-kadang. Bukan saat kita merasa ingin. Selalu.

Daniel berdoa tiga kali sehari, setiap hari, sepanjang hidupnya. Dia tidak berhenti ketika keadaan baik, dan dia tidak berhenti ketika mereka melemparkannya ke gua singa. Kehidupan doanya yang konsisten telah membangun fondasi yang sangat kuat sehingga tidak ada yang bisa menggoyahkannya.

Banyak orang Kristen memperlakukan doa seperti ban serep—hanya dibutuhkan dalam keadaan darurat. Tapi doa dimaksudkan untuk menjadi mesin, bukan ban serep. Ini adalah bahan bakar harian yang membuat kita tetap terhubung dengan kuasa dan kehadiran Tuhan.

Terobosanmu mungkin tidak datang setelah satu doa putus asa. Mungkin datang setelah 100 doa yang setia. Setelah 1.000 percakapan konsisten dengan Tuhan. Pertanyaannya bukan apakah Tuhan mendengarmu—Dia selalu mendengar. Pertanyaannya adalah: Akankah kamu terus berdoa bahkan ketika kamu tidak melihat hasil segera?

Konsistensi dalam doa bukan tentang mengesankan Tuhan. Ini tentang mengubahmu. Setiap doa membentuk hatimu, menyelaraskan kehendakmu dengan-Nya, dan memperdalam ketergantunganmu pada-Nya.

Jangan menyerah. Terus berdoa. Terus mencari. Terus mengetuk. Kegigihan setia yang kamu tunjukkan hari ini sedang membangun warisan doa yang akan berdampak bukan hanya pada hidupmu, tetapi generasi yang akan datang.`,
    },
    author: {
      en: 'Pastor Sarah Johnson',
      id: 'Pendeta Sarah Johnson',
    },
    summary: {
      en: 'Consistency in prayer transforms us and builds a legacy of faith.',
      id: 'Konsistensi dalam doa mengubah kita dan membangun warisan iman.',
    },
    main_verse: createBibleRef('Luke', 18, 1, undefined, 'NIV', 'Then Jesus told his disciples a parable to show them that they should always pray and not give up.'),
    additional_verses: [
      createBibleRef('Daniel', 6, 10, undefined, 'NIV', 'Three times a day he got down on his knees and prayed, giving thanks to his God.'),
      createBibleRef('1 Thessalonians', 5, 17, undefined, 'NIV', 'Pray continually.'),
    ],
    reading_time_minutes: 5,
    tags: ['prayer', 'persistence', 'faith', 'spiritual discipline'],
    image_url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80',
    ai_generated: false,
    status: 'published',
    version: 1,
    published_at: '2025-01-16T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-15T10:00:00Z',
    deleted: false,
  },
];

// ============================================================================
// VERSE OF THE DAY
// ============================================================================

export const mockVersesOfTheDay: VerseOfTheDay[] = [
  {
    id: 'verse_001',
    scope: 'global',
    verse: createBibleRef('Philippians', 4, 6, 7),
    verse_text: {
      en: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
      id: 'Janganlah hendaknya kamu kuatir tentang apa pun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.',
    },
    commentary: {
      en: `Anxiety is like a rocking chair—it gives you something to do but doesn't get you anywhere. Paul's instruction here isn't "stop worrying" (which feels impossible). Instead, he gives us a specific action: bring everything to God in prayer.

Notice the progression: Don't be anxious → Pray about everything → Experience God's peace. It's not magic, it's a relationship. When we bring our worries to God instead of carrying them ourselves, His supernatural peace begins to guard our hearts like a soldier standing watch.

The peace Paul describes isn't the absence of problems—it's the presence of God in the midst of problems.`,
      id: `Kecemasan seperti kursi goyang—memberimu sesuatu untuk dilakukan tetapi tidak membawamu ke mana-mana. Instruksi Paulus di sini bukan "berhenti khawatir" (yang terasa mustahil). Sebaliknya, dia memberi kita tindakan spesifik: bawa semuanya kepada Tuhan dalam doa.

Perhatikan perkembangannya: Jangan kuatir → Berdoalah tentang segalanya → Alami damai Tuhan. Ini bukan sihir, ini hubungan. Ketika kita membawa kekhawatiran kita kepada Tuhan alih-alih memikulnya sendiri, damai supernatural-Nya mulai menjaga hati kita seperti prajurit yang berjaga.

Damai yang digambarkan Paulus bukan ketiadaan masalah—melainkan kehadiran Tuhan di tengah masalah.`,
    },
    reflection_prompt: {
      en: 'What worry are you carrying today that you can bring to God in prayer?',
      id: 'Kekhawatiran apa yang kamu pikul hari ini yang dapat kamu bawa kepada Tuhan dalam doa?',
    },
    background_image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    background_color: '#1e3a5f',
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-15T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-14T08:00:00Z',
    deleted: false,
  },
  {
    id: 'verse_002',
    scope: 'global',
    verse: createBibleRef('Proverbs', 3, 5, 6),
    verse_text: {
      en: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
      id: 'Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri. Akuilah Dia dalam segala lakumu, maka Ia akan meluruskan jalanmu.',
    },
    commentary: {
      en: `"Lean not on your own understanding" might be one of the hardest commands in Scripture. We've been trained to analyze, strategize, and figure things out. Our culture worships the self-made person who pulls themselves up by their bootstraps.

But God calls us to something radically different: dependence.

Notice it says "all your heart"—not most of it, not when it's convenient. All of it. This means there's no backup plan where you trust yourself if God doesn't come through.

When you acknowledge God in all your ways, something supernatural happens: He makes your paths straight. Not necessarily easy, but straight.`,
      id: `"Janganlah bersandar kepada pengertianmu sendiri" mungkin salah satu perintah tersulit dalam Kitab Suci. Kita telah dilatih untuk menganalisis, menyusun strategi, dan memahami sesuatu. Budaya kita menyembah orang yang mandiri yang mengangkat diri mereka sendiri.

Tapi Tuhan memanggil kita pada sesuatu yang sangat berbeda: ketergantungan.

Perhatikan itu mengatakan "segenap hatimu"—bukan sebagian besar, bukan saat nyaman. Semuanya. Ini berarti tidak ada rencana cadangan di mana kamu mempercayai dirimu sendiri jika Tuhan tidak datang.

Ketika kamu mengakui Tuhan dalam segala lakumu, sesuatu yang supernatural terjadi: Dia meluruskan jalanmu. Tidak harus mudah, tetapi lurus.`,
    },
    reflection_prompt: {
      en: 'What area of your life are you still trying to control instead of trusting God?',
      id: 'Area mana dari hidupmu yang masih kamu coba kendalikan alih-alih mempercayai Tuhan?',
    },
    background_image_url: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=800&q=80',
    background_color: '#2d4a3e',
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-16T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-15T08:00:00Z',
    deleted: false,
  },
];

// ============================================================================
// BIBLE FIGURES
// ============================================================================

export const mockBibleFigures: BibleFigure[] = [
  {
    id: 'figure_001',
    scope: 'global',
    name: {
      en: 'David',
      id: 'Daud',
    },
    title: {
      en: 'The Shepherd King',
      id: 'Raja Gembala',
    },
    summary: {
      en: "From shepherd boy to king of Israel, David's life shows us that God looks at the heart, not outward appearance. Despite his failures, he's remembered as \"a man after God's own heart.\"",
      id: 'Dari anak gembala menjadi raja Israel, kehidupan Daud menunjukkan kepada kita bahwa Tuhan melihat hati, bukan penampilan luar. Meskipun dengan kegagalannya, dia dikenang sebagai "orang yang berkenan di hati Tuhan."',
    },
    full_story: {
      en: `David's story is one of the most compelling in the Bible—a shepherd boy who became a warrior, a fugitive, a king, a psalmist, and ultimately an ancestor of Jesus Christ himself.

Born the youngest of eight sons in Bethlehem, David was so overlooked that when the prophet Samuel came to anoint the next king of Israel, his father Jesse didn't even bother to bring him in from the fields. But God told Samuel, "The LORD does not look at the things people look at. People look at the outward appearance, but the LORD looks at the heart." David was chosen that day, though he wouldn't become king for another 15 years.

As a teenager, David gained national fame by defeating the Philistine giant Goliath with just a sling and five smooth stones. While Israel's trained soldiers trembled in fear, this shepherd boy had faith that God would deliver the enemy into his hands.

David's rise to prominence brought him into the orbit of King Saul, who made him a commander in his army. But Saul's jealousy turned deadly when he heard people singing, "Saul has slain his thousands, and David his tens of thousands." For years, David lived as a fugitive.

When Saul finally died in battle, David became king at age 30. He conquered Jerusalem and made it his capital. More than his military victories, David is remembered for his heart of worship. He wrote at least half of the Psalms.

David's greatest failure came when he committed adultery with Bathsheba and arranged for her husband Uriah to be killed. When confronted by the prophet Nathan, David confessed, "I have sinned against the LORD." Psalm 51 records his broken, repentant heart.

What made David "a man after God's own heart" wasn't perfection. It was his authentic relationship with God. When he sinned, he genuinely repented. When he worshiped, he held nothing back.

God made an eternal covenant with David, promising that his throne would be established forever. This promise was ultimately fulfilled in Jesus Christ, who was called "Son of David."`,
      id: `Kisah Daud adalah salah satu yang paling menarik dalam Alkitab—seorang anak gembala yang menjadi pejuang, buronan, raja, pemazmur, dan akhirnya leluhur Yesus Kristus sendiri.

Lahir sebagai anak bungsu dari delapan bersaudara di Betlehem, Daud begitu diabaikan sehingga ketika nabi Samuel datang untuk mengurapi raja Israel berikutnya, ayahnya Isai bahkan tidak repot-repot membawanya dari padang. Tetapi Tuhan berkata kepada Samuel, "TUHAN tidak memandang apa yang dilihat manusia: manusia melihat apa yang di depan mata, tetapi TUHAN melihat hati." Daud dipilih hari itu, meskipun dia tidak akan menjadi raja selama 15 tahun lagi.

Sebagai remaja, Daud mendapat ketenaran nasional dengan mengalahkan raksasa Filistin Goliat hanya dengan umban dan lima batu licin. Sementara tentara terlatih Israel gemetar ketakutan, anak gembala ini memiliki iman bahwa Tuhan akan menyerahkan musuh ke tangannya.

Kebangkitan Daud membawanya ke orbit Raja Saul, yang menjadikannya komandan di pasukannya. Tetapi kecemburuan Saul berubah mematikan ketika dia mendengar orang bernyanyi, "Saul mengalahkan beribu-ribu, tetapi Daud berlaksa-laksa." Selama bertahun-tahun, Daud hidup sebagai buronan.

Ketika Saul akhirnya mati dalam pertempuran, Daud menjadi raja pada usia 30 tahun. Dia menaklukkan Yerusalem dan menjadikannya ibukotanya. Lebih dari kemenangan militernya, Daud dikenang karena hati penyembahannya. Dia menulis setidaknya setengah dari Mazmur.

Kegagalan terbesar Daud datang ketika dia berzina dengan Batsyeba dan mengatur agar suaminya Uria dibunuh. Ketika dikonfrontasi oleh nabi Natan, Daud mengaku, "Aku telah berdosa terhadap TUHAN." Mazmur 51 mencatat hatinya yang hancur dan bertobat.

Apa yang membuat Daud "orang yang berkenan di hati Tuhan" bukanlah kesempurnaan. Itu adalah hubungannya yang autentik dengan Tuhan. Ketika dia berdosa, dia benar-benar bertobat. Ketika dia menyembah, dia tidak menahan apa-apa.

Tuhan membuat perjanjian abadi dengan Daud, berjanji bahwa takhtanya akan ditegakkan selamanya. Janji ini akhirnya digenapi dalam Yesus Kristus, yang disebut "Anak Daud."`,
    },
    key_verses: [
      createBibleRef('1 Samuel', 16, 7),
      createBibleRef('1 Samuel', 17, 45, 47),
      createBibleRef('2 Samuel', 7, 16),
      createBibleRef('Psalm', 51, 1, 4),
    ],
    key_lessons: {
      en: 'God looks at the heart, not outward appearance. Authentic worship involves bringing our whole selves to God. Genuine repentance restores relationship with God.',
      id: 'Tuhan melihat hati, bukan penampilan luar. Penyembahan yang autentik melibatkan membawa seluruh diri kita kepada Tuhan. Pertobatan yang tulus memulihkan hubungan dengan Tuhan.',
    },
    time_period: {
      en: '1040-970 BC',
      id: '1040-970 SM',
    },
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    related_figure_ids: ['figure_002'],
    related_study_ids: ['study_001'],
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-15T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-14T10:00:00Z',
    deleted: false,
    // Extended BibleFigure fields
    biography: {
      en: `David, whose name means "beloved," remains one of the most significant figures in biblical history. Born around 1040 BC in Bethlehem, he was the youngest of eight sons of Jesse, a farmer from the tribe of Judah. As a shepherd boy, David developed the skills and faith that would later define his life—protecting his father's flock from lions and bears, and composing songs of worship under the stars.

God chose David when he was just a teenager, sending the prophet Samuel to anoint him as Israel's future king. Unlike Saul, who looked the part of a king, David's anointing revealed God's perspective: "The LORD does not look at the things people look at. People look at the outward appearance, but the LORD looks at the heart" (1 Samuel 16:7).

David's legendary defeat of Goliath showcased both his courage and his deep trust in God. While King Saul and the entire Israelite army cowered before the Philistine giant, young David declared, "The battle is the LORD's, and he will give all of you into our hands" (1 Samuel 17:47).

After years of running from the jealous King Saul, David finally ascended to the throne at age 30. He reigned for 40 years, first over Judah alone and then over all Israel. He conquered Jerusalem and made it the nation's capital, establishing a dynasty that would endure for centuries.

David was also a gifted musician and poet, credited with writing at least 73 of the 150 Psalms. These songs express the full range of human emotion—from despair to joy, from repentance to praise—and continue to comfort and inspire believers today.

Yet David was far from perfect. His adultery with Bathsheba and the murder of her husband Uriah represent his greatest moral failures. But what distinguished David was his genuine repentance. When confronted by the prophet Nathan, David didn't make excuses—he confessed, "I have sinned against the LORD" (2 Samuel 12:13). Psalm 51 captures his broken and contrite heart.

God's covenant with David promised that his throne would be established forever—a promise ultimately fulfilled in Jesus Christ, who is called "Son of David" and whose kingdom has no end.`,
      id: `Daud, yang namanya berarti "yang dikasihi," tetap menjadi salah satu tokoh paling signifikan dalam sejarah Alkitab. Lahir sekitar 1040 SM di Betlehem, dia adalah anak bungsu dari delapan putra Isai, seorang petani dari suku Yehuda. Sebagai anak gembala, Daud mengembangkan keterampilan dan iman yang kemudian mendefinisikan hidupnya—melindungi kawanan ayahnya dari singa dan beruang, dan menyusun lagu-lagu penyembahan di bawah bintang-bintang.

Tuhan memilih Daud ketika dia masih remaja, mengirim nabi Samuel untuk mengurapinya sebagai raja Israel masa depan. Tidak seperti Saul, yang terlihat seperti seorang raja, pengurapan Daud mengungkapkan perspektif Tuhan: "TUHAN tidak memandang apa yang dilihat manusia: manusia melihat apa yang di depan mata, tetapi TUHAN melihat hati" (1 Samuel 16:7).

Kemenangan legendaris Daud atas Goliat menunjukkan keberanian dan kepercayaannya yang dalam kepada Tuhan. Sementara Raja Saul dan seluruh tentara Israel ciut di hadapan raksasa Filistin, Daud muda menyatakan, "Peperangan adalah milik TUHAN, dan Ia akan menyerahkan kamu semua ke dalam tangan kami" (1 Samuel 17:47).

Setelah bertahun-tahun melarikan diri dari Raja Saul yang cemburu, Daud akhirnya naik takhta pada usia 30 tahun. Dia memerintah selama 40 tahun, pertama atas Yehuda saja dan kemudian atas seluruh Israel. Dia menaklukkan Yerusalem dan menjadikannya ibukota bangsa, mendirikan dinasti yang akan bertahan selama berabad-abad.

Daud juga seorang musisi dan penyair berbakat, dikreditkan menulis setidaknya 73 dari 150 Mazmur. Lagu-lagu ini mengekspresikan berbagai emosi manusia—dari keputusasaan hingga sukacita, dari pertobatan hingga pujian—dan terus menghibur dan menginspirasi orang percaya hingga hari ini.

Namun Daud jauh dari sempurna. Perzinahannya dengan Batsyeba dan pembunuhan suaminya Uria mewakili kegagalan moralnya yang terbesar. Tetapi yang membedakan Daud adalah pertobatannya yang tulus. Ketika dihadapkan oleh nabi Natan, Daud tidak membuat alasan—dia mengaku, "Aku telah berdosa terhadap TUHAN" (2 Samuel 12:13). Mazmur 51 menangkap hatinya yang hancur dan menyesal.

Perjanjian Tuhan dengan Daud menjanjikan bahwa takhtanya akan ditegakkan selamanya—janji yang akhirnya digenapi dalam Yesus Kristus, yang disebut "Anak Daud" dan kerajaannya tidak ada akhirnya.`,
    },
    testament: 'old',
    timeline: [
      {
        date: '1040 BC',
        event: {
          en: 'Born in Bethlehem as youngest son of Jesse',
          id: 'Lahir di Betlehem sebagai anak bungsu Isai',
        },
        verse: createBibleRef('1 Samuel', 16, 11),
      },
      {
        date: '1025 BC',
        event: {
          en: 'Anointed by Samuel as future king',
          id: 'Diurapi oleh Samuel sebagai raja masa depan',
        },
        verse: createBibleRef('1 Samuel', 16, 13),
      },
      {
        date: '1024 BC',
        event: {
          en: 'Defeats Goliath with sling and stone',
          id: 'Mengalahkan Goliat dengan umban dan batu',
        },
        verse: createBibleRef('1 Samuel', 17, 50),
      },
      {
        date: '1010 BC',
        event: {
          en: 'Becomes King of Judah',
          id: 'Menjadi Raja Yehuda',
        },
        verse: createBibleRef('2 Samuel', 2, 4),
      },
      {
        date: '1003 BC',
        event: {
          en: 'Crowned King of all Israel',
          id: 'Dinobatkan sebagai Raja seluruh Israel',
        },
        verse: createBibleRef('2 Samuel', 5, 3),
      },
      {
        date: '970 BC',
        event: {
          en: 'Dies after 40 years of reign',
          id: 'Meninggal setelah 40 tahun memerintah',
        },
        verse: createBibleRef('1 Kings', 2, 10, 11),
      },
    ],
    life_lessons: [
      {
        en: 'God looks at the heart, not outward appearance',
        id: 'Tuhan melihat hati, bukan penampilan luar',
      },
      {
        en: 'Genuine repentance restores relationship with God',
        id: 'Pertobatan yang tulus memulihkan hubungan dengan Tuhan',
      },
      {
        en: "Our failures don't disqualify us from God's purposes",
        id: 'Kegagalan kita tidak mendiskualifikasi kita dari tujuan Tuhan',
      },
    ],
  },
];

// ============================================================================
// DAILY QUIZZES
// ============================================================================

export const mockDailyQuizzes: DailyQuiz[] = [
  {
    id: 'quiz_001',
    scope: 'global',
    title: {
      en: 'Test Your Knowledge: The Life of Jesus',
      id: 'Uji Pengetahuanmu: Kehidupan Yesus',
    },
    description: {
      en: "How well do you know the Gospel accounts of Jesus' ministry, miracles, and teachings?",
      id: 'Seberapa baik kamu mengenal catatan Injil tentang pelayanan, mukjizat, dan pengajaran Yesus?',
    },
    theme: {
      en: 'New Testament',
      id: 'Perjanjian Baru',
    },
    questions: [
      {
        id: 'q1',
        question: {
          en: 'In which city was Jesus born?',
          id: 'Di kota mana Yesus dilahirkan?',
        },
        options: [
          { en: 'Nazareth', id: 'Nazaret' },
          { en: 'Bethlehem', id: 'Betlehem' },
          { en: 'Jerusalem', id: 'Yerusalem' },
          { en: 'Capernaum', id: 'Kapernaum' },
        ],
        correct_answer_index: 1,
        explanation: {
          en: 'Jesus was born in Bethlehem, fulfilling the prophecy in Micah 5:2.',
          id: 'Yesus dilahirkan di Betlehem, menggenapi nubuatan dalam Mikha 5:2.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('Luke', 2, 4, 7),
      },
      {
        id: 'q2',
        question: {
          en: 'How many disciples did Jesus choose?',
          id: 'Berapa banyak murid yang dipilih Yesus?',
        },
        options: [
          { en: '7', id: '7' },
          { en: '10', id: '10' },
          { en: '12', id: '12' },
          { en: '70', id: '70' },
        ],
        correct_answer_index: 2,
        explanation: {
          en: 'Jesus chose 12 disciples to be His closest followers.',
          id: 'Yesus memilih 12 murid untuk menjadi pengikut terdekat-Nya.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('Mark', 3, 13, 19),
      },
      {
        id: 'q3',
        question: {
          en: "What was Jesus' first miracle?",
          id: 'Apa mukjizat pertama Yesus?',
        },
        options: [
          { en: 'Healing a blind man', id: 'Menyembuhkan orang buta' },
          { en: 'Turning water into wine', id: 'Mengubah air menjadi anggur' },
          { en: 'Feeding 5,000 people', id: 'Memberi makan 5.000 orang' },
          { en: 'Walking on water', id: 'Berjalan di atas air' },
        ],
        correct_answer_index: 1,
        explanation: {
          en: "Jesus' first miracle was turning water into wine at a wedding in Cana.",
          id: 'Mukjizat pertama Yesus adalah mengubah air menjadi anggur di pernikahan di Kana.',
        },
        difficulty: 'medium',
        related_verse: createBibleRef('John', 2, 1, 11),
      },
      {
        id: 'q4',
        question: {
          en: 'Who betrayed Jesus for 30 pieces of silver?',
          id: 'Siapa yang mengkhianati Yesus dengan 30 keping perak?',
        },
        options: [
          { en: 'Peter', id: 'Petrus' },
          { en: 'Judas Iscariot', id: 'Yudas Iskariot' },
          { en: 'Thomas', id: 'Tomas' },
          { en: 'Matthew', id: 'Matius' },
        ],
        correct_answer_index: 1,
        explanation: {
          en: 'Judas Iscariot betrayed Jesus to the religious leaders for 30 pieces of silver.',
          id: 'Yudas Iskariot mengkhianati Yesus kepada para pemimpin agama dengan 30 keping perak.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('Matthew', 26, 14, 16),
      },
      {
        id: 'q5',
        question: {
          en: 'How many days was Jesus in the tomb before resurrection?',
          id: 'Berapa hari Yesus berada di kubur sebelum kebangkitan?',
        },
        options: [
          { en: '1 day', id: '1 hari' },
          { en: '2 days', id: '2 hari' },
          { en: '3 days', id: '3 hari' },
          { en: '7 days', id: '7 hari' },
        ],
        correct_answer_index: 2,
        explanation: {
          en: 'Jesus was in the tomb for three days before His resurrection.',
          id: 'Yesus berada di kubur selama tiga hari sebelum kebangkitan-Nya.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('Matthew', 16, 21),
      },
    ],
    time_limit_seconds: 300,
    passing_score_percentage: 70,
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-15T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-14T10:00:00Z',
    deleted: false,
  },
  {
    id: 'quiz_002',
    scope: 'global',
    title: {
      en: 'Bible Heroes: Old Testament Edition',
      id: 'Pahlawan Alkitab: Edisi Perjanjian Lama',
    },
    description: {
      en: 'Test your knowledge of the great men and women of the Old Testament.',
      id: 'Uji pengetahuanmu tentang tokoh-tokoh hebat dari Perjanjian Lama.',
    },
    theme: {
      en: 'Old Testament',
      id: 'Perjanjian Lama',
    },
    questions: [
      {
        id: 'q1',
        question: {
          en: 'Who built the ark to survive the great flood?',
          id: 'Siapa yang membangun bahtera untuk bertahan dari air bah besar?',
        },
        options: [
          { en: 'Abraham', id: 'Abraham' },
          { en: 'Noah', id: 'Nuh' },
          { en: 'Moses', id: 'Musa' },
          { en: 'Joshua', id: 'Yosua' },
        ],
        correct_answer_index: 1,
        explanation: {
          en: "Noah built the ark according to God's specific instructions.",
          id: 'Nuh membangun bahtera sesuai dengan instruksi spesifik Tuhan.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('Genesis', 6, 9, 22),
      },
      {
        id: 'q2',
        question: {
          en: 'Who was sold into slavery but became second in command in Egypt?',
          id: 'Siapa yang dijual menjadi budak tetapi menjadi orang kedua berkuasa di Mesir?',
        },
        options: [
          { en: 'Joseph', id: 'Yusuf' },
          { en: 'Benjamin', id: 'Benyamin' },
          { en: 'Judah', id: 'Yehuda' },
          { en: 'Reuben', id: 'Ruben' },
        ],
        correct_answer_index: 0,
        explanation: {
          en: 'Joseph was sold by his brothers but rose to power in Egypt.',
          id: 'Yusuf dijual oleh saudara-saudaranya tetapi naik ke kekuasaan di Mesir.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('Genesis', 37, 28),
      },
      {
        id: 'q3',
        question: {
          en: 'Which woman became queen of Persia and saved the Jewish people?',
          id: 'Wanita mana yang menjadi ratu Persia dan menyelamatkan orang Yahudi?',
        },
        options: [
          { en: 'Ruth', id: 'Rut' },
          { en: 'Esther', id: 'Ester' },
          { en: 'Deborah', id: 'Debora' },
          { en: 'Hannah', id: 'Hana' },
        ],
        correct_answer_index: 1,
        explanation: {
          en: 'Queen Esther risked her life to save the Jewish people from genocide.',
          id: 'Ratu Ester mempertaruhkan nyawanya untuk menyelamatkan orang Yahudi dari genosida.',
        },
        difficulty: 'medium',
        related_verse: createBibleRef('Esther', 4, 14),
      },
      {
        id: 'q4',
        question: {
          en: 'Who led the Israelites out of slavery in Egypt?',
          id: 'Siapa yang memimpin orang Israel keluar dari perbudakan di Mesir?',
        },
        options: [
          { en: 'Aaron', id: 'Harun' },
          { en: 'Moses', id: 'Musa' },
          { en: 'Joshua', id: 'Yosua' },
          { en: 'Caleb', id: 'Kaleb' },
        ],
        correct_answer_index: 1,
        explanation: {
          en: "Moses led the Israelites out of Egypt through God's power.",
          id: 'Musa memimpin orang Israel keluar dari Mesir melalui kuasa Tuhan.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('Exodus', 3, 10),
      },
      {
        id: 'q5',
        question: {
          en: 'Who defeated Goliath with just a sling and stone?',
          id: 'Siapa yang mengalahkan Goliat hanya dengan umban dan batu?',
        },
        options: [
          { en: 'Saul', id: 'Saul' },
          { en: 'Jonathan', id: 'Yonatan' },
          { en: 'David', id: 'Daud' },
          { en: 'Samuel', id: 'Samuel' },
        ],
        correct_answer_index: 2,
        explanation: {
          en: 'David, a young shepherd boy, defeated Goliath with faith in God.',
          id: 'Daud, seorang anak gembala muda, mengalahkan Goliat dengan iman kepada Tuhan.',
        },
        difficulty: 'easy',
        related_verse: createBibleRef('1 Samuel', 17, 50),
      },
    ],
    time_limit_seconds: 240,
    passing_score_percentage: 60,
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-16T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-15T10:00:00Z',
    deleted: false,
  },
];

// ============================================================================
// BIBLE STUDIES (Self-Paced E-Learning Courses)
// Comprehensive, production-ready content with full lessons
// ============================================================================

export const mockBibleStudies: BibleStudy[] = [
  {
    id: 'study_001',
    scope: 'global',
    title: {
      en: 'The Armor of God: Standing Firm in Spiritual Warfare',
      id: 'Perlengkapan Senjata Allah: Berdiri Teguh dalam Peperangan Rohani',
    },
    subtitle: {
      en: 'A 7-Day Journey Through Ephesians 6',
      id: 'Perjalanan 7 Hari Melalui Efesus 6',
    },
    description: {
      en: "Discover how to stand firm against spiritual attacks by putting on God's complete armor. This 7-day study takes you piece by piece through the spiritual armor described in Ephesians 6, giving you practical tools for daily victory.",
      id: 'Temukan cara berdiri teguh melawan serangan rohani dengan mengenakan seluruh perlengkapan senjata Allah. Studi 7 hari ini membawamu bagian per bagian melalui perlengkapan senjata rohani yang dijelaskan dalam Efesus 6.',
    },
    full_content: {
      en: 'This comprehensive study explores each piece of the spiritual armor described by Paul in Ephesians 6. You will learn not just what each piece represents, but how to practically apply these truths in your daily spiritual battles.',
      id: 'Studi komprehensif ini menjelajahi setiap bagian dari perlengkapan senjata rohani yang dijelaskan oleh Paulus dalam Efesus 6. Anda akan belajar tidak hanya apa yang diwakili setiap bagian, tetapi bagaimana menerapkan kebenaran ini dalam pertempuran rohani sehari-hari.',
    },
    introduction: {
      en: 'Every believer is in a spiritual battle. The good news? God has given us everything we need to stand victoriously. In this 7-day study, you will discover how to put on the full armor of God and walk in daily victory.',
      id: 'Setiap orang percaya berada dalam pertempuran rohani. Kabar baiknya? Tuhan telah memberi kita segala yang kita butuhkan untuk berdiri dengan kemenangan. Dalam studi 7 hari ini, Anda akan menemukan cara mengenakan seluruh perlengkapan senjata Allah.',
    },
    learning_objectives: [
      { en: 'Understand the reality of spiritual warfare', id: 'Memahami realitas peperangan rohani' },
      { en: 'Learn the purpose of each piece of armor', id: 'Mempelajari tujuan setiap bagian perlengkapan senjata' },
      { en: 'Develop daily practices to stand firm', id: 'Mengembangkan praktik harian untuk berdiri teguh' },
      { en: 'Gain confidence in your spiritual authority', id: 'Memperoleh kepercayaan dalam otoritas rohani Anda' },
    ],
    target_audience: {
      en: 'Believers who want to grow stronger in their faith and learn to overcome spiritual challenges',
      id: 'Orang percaya yang ingin bertumbuh lebih kuat dalam iman mereka dan belajar mengatasi tantangan rohani',
    },
    author: { en: 'Pastor David Thompson', id: 'Pendeta David Thompson' },
    author_title: { en: 'Senior Pastor & Bible Teacher', id: 'Pendeta Senior & Pengajar Alkitab' },
    lessons: [
      {
        id: 'lesson_001_1',
        title: { en: 'Introduction: The Battle is Real', id: 'Pendahuluan: Pertempuran Itu Nyata' },
        content: {
          en: `Before we can effectively use spiritual armor, we must understand the reality of spiritual warfare. Paul writes to the Ephesians not to scare them, but to prepare them.

The enemy is real. His attacks are strategic. But here's the good news—God has not left us defenseless. In fact, He has given us everything we need to not just survive, but to stand victoriously.

"Finally, be strong in the Lord and in his mighty power." (Ephesians 6:10)

Notice Paul doesn't say "be strong in yourself." Our strength comes from the Lord. This is the foundation of everything else we will learn in this study.

**Why Does This Matter Today?**

Many believers live in defeat because they don't recognize the nature of their struggles. When we understand that our battle is spiritual, we can use spiritual weapons effectively.

The word "struggle" in Greek is "pale" (πάλη), referring to hand-to-hand combat. This isn't distant warfare—it's personal. The enemy wants to take you down personally.

But don't be afraid. Greater is He who is in you than he who is in the world (1 John 4:4).`,
          id: `Sebelum kita dapat menggunakan perlengkapan senjata rohani dengan efektif, kita harus memahami realitas peperangan rohani. Paulus menulis kepada jemaat Efesus bukan untuk menakuti mereka, tetapi untuk mempersiapkan mereka.

Musuh itu nyata. Serangannya strategis. Tapi inilah kabar baiknya—Tuhan tidak membiarkan kita tanpa pertahanan. Bahkan, Dia telah memberi kita segala yang kita butuhkan untuk tidak hanya bertahan, tetapi berdiri dengan kemenangan.

"Akhirnya, jadilah kuat di dalam Tuhan, di dalam kekuatan kuasa-Nya." (Efesus 6:10)

Perhatikan Paulus tidak mengatakan "jadilah kuat dalam dirimu sendiri." Kekuatan kita berasal dari Tuhan. Ini adalah fondasi dari semua yang akan kita pelajari dalam studi ini.

**Mengapa Ini Penting Hari Ini?**

Banyak orang percaya hidup dalam kekalahan karena mereka tidak mengenali sifat pergumulan mereka. Ketika kita memahami bahwa pertempuran kita bersifat rohani, kita dapat menggunakan senjata rohani dengan efektif.`,
        },
        summary: { en: 'Understanding that spiritual warfare is real prepares us to use God\'s armor effectively.', id: 'Memahami bahwa peperangan rohani itu nyata mempersiapkan kita untuk menggunakan perlengkapan senjata Allah dengan efektif.' },
        scripture_references: [
          { ...createBibleRef('Ephesians', 6, 10, 12), text: 'Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil\'s schemes.' },
          { ...createBibleRef('1 John', 4, 4), text: 'You, dear children, are from God and have overcome them, because the one who is in you is greater than the one who is in the world.' },
        ],
        discussion_questions: {
          en: [
            'What spiritual struggles have you faced recently that you now recognize as spiritual warfare?',
            'How does knowing your strength comes from the Lord change how you approach challenges?',
            'In what areas of your life do you feel most attacked by the enemy?',
          ],
          id: [
            'Pergumulan rohani apa yang baru-baru ini kamu hadapi yang sekarang kamu kenali sebagai peperangan rohani?',
            'Bagaimana mengetahui kekuatanmu berasal dari Tuhan mengubah cara kamu menghadapi tantangan?',
            'Di area mana dalam hidupmu kamu merasa paling diserang oleh musuh?',
          ],
        },
        application: {
          en: 'Today, ask God to open your eyes to the spiritual reality around you. Commit to approaching your challenges not in your own strength, but in the Lord\'s mighty power.',
          id: 'Hari ini, minta Tuhan untuk membuka matamu terhadap realitas rohani di sekitarmu. Berkomitmenlah untuk menghadapi tantanganmu bukan dengan kekuatanmu sendiri, tetapi dalam kuasa Tuhan yang perkasa.',
        },
        prayer: {
          en: 'Lord, thank You for not leaving me defenseless. Open my eyes to see the spiritual battles around me, and help me to stand strong in Your mighty power. In Jesus\' name, Amen.',
          id: 'Tuhan, terima kasih karena tidak membiarkan aku tanpa pertahanan. Buka mataku untuk melihat pertempuran rohani di sekitarku, dan tolong aku untuk berdiri kuat dalam kuasa-Mu yang perkasa. Dalam nama Yesus, Amin.',
        },
        duration_minutes: 15,
        order: 1,
      },
      {
        id: 'lesson_001_2',
        title: { en: 'The Belt of Truth', id: 'Ikat Pinggang Kebenaran' },
        content: {
          en: `The Roman soldier's belt was foundational—it held everything else in place. Without it, the armor would be useless. In the same way, truth is the foundation of our spiritual protection.

"Stand firm then, with the belt of truth buckled around your waist" (Ephesians 6:14a)

**What is the Belt of Truth?**

The belt of truth has two dimensions:
1. **God's Truth** - The objective truth of Scripture, God's Word
2. **Personal Integrity** - Living truthfully in all we do

Both are essential. We must know God's truth AND walk in personal honesty.

**Why Truth First?**

The enemy is called "the father of lies" (John 8:44). His primary weapon is deception. When we are grounded in truth, we can recognize his lies.

Many Christians are defeated because they believe lies:
- "God doesn't really love me"
- "I'm too far gone to be forgiven"
- "I'll never change"
- "God is disappointed in me"

These are all lies! The belt of truth protects us from such deceptions.

**How to Put on the Belt of Truth**

1. **Read Scripture Daily** - Saturate your mind with God's Word
2. **Memorize Key Verses** - Have truth ready when lies attack
3. **Practice Honesty** - Live without deception in all relationships
4. **Speak Truth to Yourself** - Counter lies with biblical truth`,
          id: `Ikat pinggang tentara Romawi adalah dasar—ia menahan semua yang lain di tempatnya. Tanpanya, baju zirah akan sia-sia. Dengan cara yang sama, kebenaran adalah fondasi perlindungan rohani kita.

"Berdiri teguhlah dengan ikat pinggang kebenaran di pinggangmu" (Efesus 6:14a)

**Apa itu Ikat Pinggang Kebenaran?**

Ikat pinggang kebenaran memiliki dua dimensi:
1. **Kebenaran Allah** - Kebenaran objektif dari Alkitab, Firman Tuhan
2. **Integritas Pribadi** - Hidup dengan jujur dalam semua yang kita lakukan

Keduanya penting. Kita harus mengetahui kebenaran Allah DAN berjalan dalam kejujuran pribadi.`,
        },
        summary: { en: 'Truth is the foundation that holds all other spiritual armor in place.', id: 'Kebenaran adalah fondasi yang menahan semua perlengkapan senjata rohani lainnya di tempatnya.' },
        scripture_references: [
          { ...createBibleRef('Ephesians', 6, 14), text: 'Stand firm then, with the belt of truth buckled around your waist' },
          { ...createBibleRef('John', 8, 44), text: 'He was a murderer from the beginning, not holding to the truth, for there is no truth in him. When he lies, he speaks his native language, for he is a liar and the father of lies.' },
          { ...createBibleRef('John', 17, 17), text: 'Sanctify them by the truth; your word is truth.' },
        ],
        discussion_questions: {
          en: [
            'What lies have you believed about yourself or God that you need to replace with truth?',
            'How consistent is your daily intake of God\'s Word?',
            'Are there areas where you struggle with personal honesty?',
          ],
          id: [
            'Kebohongan apa tentang dirimu atau Tuhan yang telah kamu percayai yang perlu kamu ganti dengan kebenaran?',
            'Seberapa konsisten konsumsi harian Firman Tuhan-mu?',
            'Apakah ada area di mana kamu berjuang dengan kejujuran pribadi?',
          ],
        },
        application: {
          en: 'Choose one lie you have believed and write down the biblical truth that counters it. Memorize that verse this week.',
          id: 'Pilih satu kebohongan yang telah kamu percayai dan tuliskan kebenaran alkitabiah yang melawannya. Hafalkan ayat itu minggu ini.',
        },
        duration_minutes: 15,
        order: 2,
      },
      {
        id: 'lesson_001_3',
        title: { en: 'The Breastplate of Righteousness', id: 'Baju Zirah Kebenaran' },
        content: {
          en: `The breastplate protected the soldier's vital organs—especially the heart. In spiritual terms, righteousness guards our heart from condemnation and accusation.

"...with the breastplate of righteousness in place" (Ephesians 6:14b)

**Understanding Righteousness**

There are two types of righteousness the believer must understand:

1. **Positional Righteousness** - Our standing before God through Christ
"God made him who had no sin to be sin for us, so that in him we might become the righteousness of God." (2 Corinthians 5:21)

This is a gift! We don't earn it. When we trust Christ, His righteousness is credited to our account.

2. **Practical Righteousness** - Living rightly in daily choices
"If you know that he is righteous, you know that everyone who does what is right has been born of him." (1 John 2:29)

**The Enemy's Attack Strategy**

Satan is called "the accuser of our brothers and sisters" (Revelation 12:10). He loves to remind us of our failures and make us feel unworthy of God's love.

When we put on the breastplate of righteousness, we remind ourselves:
- I am righteous because of Christ, not my performance
- My past failures are covered by His blood
- I am fully accepted and beloved by God

**Practical Steps**

1. When guilt attacks, run TO God, not FROM Him
2. Confess sin quickly and receive forgiveness (1 John 1:9)
3. Make right choices—practical righteousness builds confidence`,
          id: `Baju zirah melindungi organ vital prajurit—terutama jantung. Dalam istilah rohani, kebenaran menjaga hati kita dari penghukuman dan tuduhan.

"...dengan baju zirah kebenaran terpasang" (Efesus 6:14b)

**Memahami Kebenaran**

Ada dua jenis kebenaran yang harus dipahami orang percaya:

1. **Kebenaran Posisional** - Kedudukan kita di hadapan Allah melalui Kristus
2. **Kebenaran Praktis** - Hidup dengan benar dalam pilihan sehari-hari`,
        },
        summary: { en: 'Righteousness protects our hearts from the enemy\'s accusations and condemnation.', id: 'Kebenaran melindungi hati kita dari tuduhan dan penghukuman musuh.' },
        scripture_references: [
          { ...createBibleRef('Ephesians', 6, 14), text: '...with the breastplate of righteousness in place' },
          { ...createBibleRef('2 Corinthians', 5, 21), text: 'God made him who had no sin to be sin for us, so that in him we might become the righteousness of God.' },
        ],
        discussion_questions: {
          en: [
            'How often do you struggle with feelings of guilt or unworthiness?',
            'Do you tend to run TO God or FROM God when you fail?',
            'How does knowing your righteousness is a gift affect how you approach God?',
          ],
          id: [
            'Seberapa sering kamu berjuang dengan perasaan bersalah atau tidak layak?',
            'Apakah kamu cenderung berlari KEPADA Tuhan atau DARI Tuhan ketika kamu gagal?',
            'Bagaimana mengetahui kebenaranmu adalah hadiah mempengaruhi cara kamu menghampiri Tuhan?',
          ],
        },
        application: {
          en: 'Write 2 Corinthians 5:21 on a card and read it every morning this week. Let this truth sink deep into your heart.',
          id: 'Tulis 2 Korintus 5:21 di sebuah kartu dan baca setiap pagi minggu ini. Biarkan kebenaran ini meresap dalam hatimu.',
        },
        duration_minutes: 15,
        order: 3,
      },
      {
        id: 'lesson_001_4',
        title: { en: 'Feet Fitted with Readiness', id: 'Kaki Diperlengkapi dengan Kesiapan' },
        content: {
          en: `Roman soldiers wore sandals with studs for sure footing in battle. The gospel of peace gives us stable footing when everything around us is unstable.

"...and with your feet fitted with the readiness that comes from the gospel of peace" (Ephesians 6:15)

**The Gospel of Peace**

It seems strange that we wear "peace" into warfare. But this is the secret of victorious Christian living—even in battle, we have peace with God.

"Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ." (Romans 5:1)

**Readiness for What?**

The word "readiness" (hetoimasia) means preparation or a firm foundation. We are to be:

1. **Ready to stand** - Firmly grounded in our identity in Christ
2. **Ready to share** - Prepared to tell others about this peace
3. **Ready to go** - Willing to take the gospel wherever God sends us

**The Peace That Passes Understanding**

"And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." (Philippians 4:7)

This supernatural peace:
- Guards your heart when emotions rage
- Protects your mind when thoughts attack
- Steadies your soul when life shakes`,
          id: `Prajurit Romawi mengenakan sandal dengan paku untuk pijakan yang pasti dalam pertempuran. Injil damai memberi kita pijakan yang stabil ketika segala sesuatu di sekitar kita tidak stabil.

"...dan kaki diperlengkapi dengan kesiapan yang datang dari Injil damai" (Efesus 6:15)`,
        },
        summary: { en: 'The gospel of peace provides stable footing even in the midst of spiritual battles.', id: 'Injil damai menyediakan pijakan yang stabil bahkan di tengah pertempuran rohani.' },
        scripture_references: [
          { ...createBibleRef('Ephesians', 6, 15), text: '...and with your feet fitted with the readiness that comes from the gospel of peace' },
          { ...createBibleRef('Romans', 5, 1), text: 'Therefore, since we have been justified through faith, we have peace with God through our Lord Jesus Christ.' },
          { ...createBibleRef('Philippians', 4, 7), text: 'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' },
        ],
        discussion_questions: {
          en: [
            'How does knowing you have peace with God affect how you face daily challenges?',
            'Are you ready to share the gospel when opportunities arise?',
            'In what situations do you most need supernatural peace?',
          ],
          id: [
            'Bagaimana mengetahui kamu memiliki damai dengan Tuhan mempengaruhi cara kamu menghadapi tantangan harian?',
            'Apakah kamu siap untuk membagikan Injil ketika kesempatan muncul?',
            'Dalam situasi apa kamu paling membutuhkan damai supernatural?',
          ],
        },
        application: {
          en: 'Think of one person who needs to hear about peace with God. Pray for an opportunity to share this week.',
          id: 'Pikirkan satu orang yang perlu mendengar tentang damai dengan Tuhan. Berdoa untuk kesempatan berbagi minggu ini.',
        },
        duration_minutes: 15,
        order: 4,
      },
      {
        id: 'lesson_001_5',
        title: { en: 'The Shield of Faith', id: 'Perisai Iman' },
        content: {
          en: `The Roman shield (thureos) was large—about 4 feet tall and 2.5 feet wide. It could cover the entire body. Faith is our all-encompassing protection against the enemy's attacks.

"In addition to all this, take up the shield of faith, with which you can extinguish all the flaming arrows of the evil one." (Ephesians 6:16)

**Flaming Arrows**

In ancient warfare, arrows were dipped in pitch and set on fire. They were designed to burn, not just wound. The enemy's attacks are similar—they're meant to cause ongoing damage.

These "flaming arrows" include:
- Doubt about God's love or faithfulness
- Temptations that seem irresistible
- Fear and anxiety about the future
- Discouragement and hopelessness
- Offense and unforgiveness

**Faith as Defense**

Faith is not blind belief—it's confident trust in God's character and promises. When the arrows fly, faith declares:
- "God is still good"
- "God's promises are still true"
- "God is still in control"
- "God will never leave me"

**Growing Your Shield**

"Faith comes from hearing the message, and the message is heard through the word about Christ." (Romans 10:17)

Your shield grows as you:
1. Study God's Word consistently
2. Remember His faithfulness in the past
3. Fellowship with other believers
4. Step out in obedience`,
          id: `Perisai Romawi (thureos) besar—sekitar 1,2 meter tinggi dan 75 cm lebar. Ia bisa menutupi seluruh tubuh. Iman adalah perlindungan menyeluruh kita terhadap serangan musuh.`,
        },
        summary: { en: 'Faith extinguishes the enemy\'s fiery attacks by trusting in God\'s character and promises.', id: 'Iman memadamkan serangan berapi musuh dengan percaya pada karakter dan janji-janji Allah.' },
        scripture_references: [
          { ...createBibleRef('Ephesians', 6, 16), text: 'In addition to all this, take up the shield of faith, with which you can extinguish all the flaming arrows of the evil one.' },
          { ...createBibleRef('Romans', 10, 17), text: 'Faith comes from hearing the message, and the message is heard through the word about Christ.' },
        ],
        discussion_questions: {
          en: [
            'What "flaming arrows" have you experienced recently?',
            'How did you respond? Did faith help you extinguish them?',
            'What specific practices help you grow your faith?',
          ],
          id: [
            'Apa "panah berapi" yang baru-baru ini kamu alami?',
            'Bagaimana responmu? Apakah iman membantumu memadamkannya?',
            'Praktik spesifik apa yang membantumu menumbuhkan imanmu?',
          ],
        },
        application: {
          en: 'Identify one "flaming arrow" you\'re currently facing. Write down three promises from Scripture that counter this attack.',
          id: 'Identifikasi satu "panah berapi" yang sedang kamu hadapi. Tuliskan tiga janji dari Alkitab yang melawan serangan ini.',
        },
        duration_minutes: 15,
        order: 5,
      },
      {
        id: 'lesson_001_6',
        title: { en: 'The Helmet of Salvation', id: 'Ketopong Keselamatan' },
        content: {
          en: `The helmet protected the soldier's head—the command center. Our minds are a primary battlefield, and the assurance of salvation protects our thinking.

"Take the helmet of salvation" (Ephesians 6:17a)

**The Mind Under Attack**

The enemy loves to attack our minds with:
- Doubt about our salvation
- Confusion about doctrine
- Worldly thought patterns
- Negative self-talk
- Hopelessness about the future

**Secure in Salvation**

The helmet of salvation provides confidence in:
1. **Past salvation** - "I am saved" (Ephesians 2:8)
2. **Present sanctification** - "I am being saved" (Philippians 2:12-13)
3. **Future glorification** - "I will be saved" (Romans 8:30)

**Hope as Protection**

In 1 Thessalonians 5:8, Paul calls this "the hope of salvation as a helmet." Hope is forward-looking confidence that God will complete what He started.

"Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus." (Philippians 1:6)

**Renewing Your Mind**

"Do not conform to the pattern of this world, but be transformed by the renewing of your mind." (Romans 12:2)

Daily practices to protect your mind:
- Start each day with Scripture
- Take negative thoughts captive
- Focus on what is true, noble, right, pure
- Guard what you watch and listen to`,
          id: `Ketopong melindungi kepala prajurit—pusat komando. Pikiran kita adalah medan pertempuran utama, dan jaminan keselamatan melindungi pemikiran kita.`,
        },
        summary: { en: 'The helmet of salvation protects our minds with the assurance of our past, present, and future salvation.', id: 'Ketopong keselamatan melindungi pikiran kita dengan jaminan keselamatan masa lalu, sekarang, dan masa depan kita.' },
        scripture_references: [
          { ...createBibleRef('Ephesians', 6, 17), text: 'Take the helmet of salvation...' },
          { ...createBibleRef('Philippians', 1, 6), text: 'Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus.' },
          { ...createBibleRef('Romans', 12, 2), text: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.' },
        ],
        discussion_questions: {
          en: [
            'What negative thoughts most frequently attack your mind?',
            'How secure do you feel in your salvation?',
            'What practices help you renew your mind daily?',
          ],
          id: [
            'Pikiran negatif apa yang paling sering menyerang pikiranmu?',
            'Seberapa aman perasaanmu dalam keselamatanmu?',
            'Praktik apa yang membantumu memperbarui pikiranmu setiap hari?',
          ],
        },
        application: {
          en: 'This week, practice taking every thought captive. When negative thoughts come, immediately counter them with Scripture.',
          id: 'Minggu ini, berlatihlah menawan setiap pikiran. Ketika pikiran negatif datang, segera lawannya dengan Alkitab.',
        },
        duration_minutes: 15,
        order: 6,
      },
      {
        id: 'lesson_001_7',
        title: { en: 'The Sword of the Spirit & Prayer', id: 'Pedang Roh & Doa' },
        content: {
          en: `We conclude our study with the only offensive weapon in our arsenal and the power that activates everything—the Word of God and prayer.

"...and the sword of the Spirit, which is the word of God. And pray in the Spirit on all occasions with all kinds of prayers and requests." (Ephesians 6:17b-18)

**The Sword of the Spirit**

This is the machaira—a short sword for close combat. It's the Word of God applied to specific situations.

Jesus modeled this in the wilderness temptation. Each time Satan attacked, Jesus responded with "It is written..." (Matthew 4:4, 7, 10).

The Word of God is:
- Living and active (Hebrews 4:12)
- Sharper than any two-edged sword
- Able to penetrate the enemy's lies

**Prayer: The Power Source**

Notice Paul doesn't say "and pray" as a separate item. Prayer permeates everything. It's how we put on the armor. It's how we use the sword.

"Pray in the Spirit on all occasions" means:
- Constant communion with God
- Being led by the Spirit in prayer
- Praying for all the saints (not just ourselves)

**Putting It All Together**

Each morning, consciously put on your armor:
- Belt of Truth: "I will walk in Your truth today"
- Breastplate of Righteousness: "I am righteous through Christ"
- Feet of Peace: "I have peace with You and am ready to share it"
- Shield of Faith: "I trust Your promises no matter what comes"
- Helmet of Salvation: "My mind is protected by the hope of salvation"
- Sword of the Spirit: "Your Word is my weapon"
- Prayer: "I depend completely on You"

You are now fully equipped for victory!`,
          id: `Kita mengakhiri studi kita dengan satu-satunya senjata ofensif dalam gudang senjata kita dan kuasa yang mengaktifkan segalanya—Firman Tuhan dan doa.`,
        },
        summary: { en: 'The Word of God and prayer are our offensive weapons that activate all the armor.', id: 'Firman Tuhan dan doa adalah senjata ofensif kita yang mengaktifkan semua perlengkapan senjata.' },
        scripture_references: [
          { ...createBibleRef('Ephesians', 6, 17, 18), text: '...and the sword of the Spirit, which is the word of God. And pray in the Spirit on all occasions with all kinds of prayers and requests.' },
          { ...createBibleRef('Hebrews', 4, 12), text: 'For the word of God is alive and active. Sharper than any double-edged sword...' },
          { ...createBibleRef('Matthew', 4, 4), text: 'Jesus answered, "It is written: Man shall not live on bread alone, but on every word that comes from the mouth of God."' },
        ],
        discussion_questions: {
          en: [
            'How effectively do you use Scripture to combat the enemy\'s attacks?',
            'What does "pray in the Spirit on all occasions" look like practically?',
            'How will you apply what you\'ve learned in this study going forward?',
          ],
          id: [
            'Seberapa efektif kamu menggunakan Alkitab untuk melawan serangan musuh?',
            'Seperti apa "berdoa di dalam Roh dalam segala kesempatan" secara praktis?',
            'Bagaimana kamu akan menerapkan apa yang telah kamu pelajari dalam studi ini ke depannya?',
          ],
        },
        application: {
          en: 'Create a daily routine for "putting on the armor." Spend time each morning consciously equipping yourself for the day\'s battles.',
          id: 'Buat rutinitas harian untuk "mengenakan perlengkapan senjata." Luangkan waktu setiap pagi untuk secara sadar memperlengkapi dirimu untuk pertempuran hari itu.',
        },
        prayer: {
          en: 'Father, thank You for providing everything I need for spiritual victory. Help me to put on Your full armor daily and to stand firm against the enemy. May I use Your Word skillfully and pray without ceasing. In Jesus\' mighty name, Amen.',
          id: 'Bapa, terima kasih karena menyediakan segala yang aku butuhkan untuk kemenangan rohani. Tolong aku untuk mengenakan seluruh perlengkapan senjata-Mu setiap hari dan berdiri teguh melawan musuh. Semoga aku menggunakan Firman-Mu dengan terampil dan berdoa tanpa henti. Dalam nama Yesus yang perkasa, Amin.',
        },
        duration_minutes: 20,
        order: 7,
      },
    ],
    lesson_count: 7,
    estimated_duration_minutes: 110,
    main_passage: createBibleRef('Ephesians', 6, 10, 18),
    supporting_verses: [
      createBibleRef('2 Corinthians', 10, 3, 5),
      createBibleRef('James', 4, 7),
      createBibleRef('1 Peter', 5, 8, 9),
    ],
    categories: ['Spiritual Warfare', 'Christian Living', 'Spiritual Growth'],
    category: 'new_testament',
    difficulty: 'intermediate',
    cover_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    completion_count: 2847,
    average_rating: 4.8,
    ratings_count: 412,
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-10T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-08T10:00:00Z',
    deleted: false,
  },
  {
    id: 'study_002',
    scope: 'global',
    title: {
      en: "The Beatitudes: Jesus' Blueprint for Happiness",
      id: 'Ucapan Bahagia: Cetak Biru Yesus untuk Kebahagiaan',
    },
    subtitle: {
      en: 'An 8-Day Study on the Sermon on the Mount',
      id: 'Studi 8 Hari tentang Khotbah di Bukit',
    },
    description: {
      en: 'Explore the revolutionary teachings of Jesus in the Sermon on the Mount. Discover what it truly means to be blessed and how to live a life that reflects the values of God\'s Kingdom.',
      id: 'Jelajahi ajaran revolusioner Yesus dalam Khotbah di Bukit. Temukan arti sebenarnya dari diberkati dan bagaimana menjalani kehidupan yang mencerminkan nilai-nilai Kerajaan Allah.',
    },
    full_content: {
      en: 'Jesus turned worldly wisdom upside down with these radical statements about true happiness. In this study, you\'ll discover that blessing isn\'t about having everything—it\'s about having Him.',
      id: 'Yesus membalikkan hikmat duniawi dengan pernyataan radikal tentang kebahagiaan sejati. Dalam studi ini, Anda akan menemukan bahwa berkat bukan tentang memiliki segalanya—tetapi tentang memiliki Dia.',
    },
    introduction: {
      en: 'The Beatitudes are among the most quoted yet least understood teachings of Jesus. Join us for 8 transformative days as we unpack what it really means to be blessed.',
      id: 'Ucapan Bahagia adalah salah satu ajaran Yesus yang paling sering dikutip namun paling tidak dipahami. Bergabunglah dengan kami selama 8 hari transformatif.',
    },
    learning_objectives: [
      { en: 'Understand the upside-down nature of Kingdom blessings', id: 'Memahami sifat terbalik dari berkat Kerajaan' },
      { en: 'Develop attitudes that attract God\'s favor', id: 'Mengembangkan sikap yang menarik kemurahan Allah' },
      { en: 'Apply the Beatitudes to daily situations', id: 'Menerapkan Ucapan Bahagia dalam situasi sehari-hari' },
    ],
    author: { en: 'Rev. Sarah Williams', id: 'Pdt. Sarah Williams' },
    author_title: { en: 'Teaching Pastor', id: 'Pendeta Pengajar' },
    lessons: [
      {
        id: 'lesson_002_1',
        title: { en: 'Introduction: The Setting of the Sermon', id: 'Pendahuluan: Latar Khotbah' },
        content: {
          en: `Before we dive into the Beatitudes, let's set the scene. Jesus sees the crowds, goes up on a mountainside, and begins to teach. This isn't random—it's intentional.

**The Crowds**
The people following Jesus were hurting. They were poor, oppressed by Rome, and longing for the Messiah. They expected a political liberator. Jesus gave them something far greater.

**The Mountain**
Just as Moses received the Law on Mount Sinai, Jesus delivers a "new law" from a mountainside. He's not replacing the Law—He's fulfilling it, showing its true meaning.

**The Revolutionary Message**
The world says: "Blessed are the rich, the powerful, the comfortable."
Jesus says: "Blessed are the poor in spirit, those who mourn, the meek..."

This is upside-down kingdom living. Everything the world values, Jesus turns on its head.

**What Does "Blessed" Mean?**
The Greek word "makarios" means more than happy. It describes a state of spiritual well-being that exists regardless of circumstances. It's not about what you have—it's about who you are and whose you are.`,
          id: `Sebelum kita mendalami Ucapan Bahagia, mari kita atur pemandangannya. Yesus melihat orang banyak, naik ke lereng bukit, dan mulai mengajar.`,
        },
        summary: { en: 'Understanding the context helps us grasp the revolutionary nature of Jesus\' teaching.', id: 'Memahami konteks membantu kita mengerti sifat revolusioner dari ajaran Yesus.' },
        scripture_references: [
          { ...createBibleRef('Matthew', 5, 1, 2), text: 'Now when Jesus saw the crowds, he went up on a mountainside and sat down. His disciples came to him, and he began to teach them.' },
        ],
        discussion_questions: {
          en: [
            'What do you typically think of when you hear the word "blessed"?',
            'How does the world\'s definition of success differ from Jesus\' teaching?',
          ],
          id: [
            'Apa yang biasanya kamu pikirkan ketika mendengar kata "diberkati"?',
            'Bagaimana definisi sukses dunia berbeda dari ajaran Yesus?',
          ],
        },
        duration_minutes: 12,
        order: 1,
      },
      {
        id: 'lesson_002_2',
        title: { en: 'Blessed are the Poor in Spirit', id: 'Berbahagialah yang Miskin di Hadapan Allah' },
        content: {
          en: `"Blessed are the poor in spirit, for theirs is the kingdom of heaven." (Matthew 5:3)

**What Does It Mean?**
Being "poor in spirit" doesn't mean lacking confidence or having low self-esteem. It means recognizing our spiritual bankruptcy before God.

The tax collector in Luke 18 understood this: "God, have mercy on me, a sinner." He went home justified, while the proud Pharisee did not.

**Why Is This First?**
This beatitude is foundational. Without recognizing our need for God, we cannot receive His kingdom. Pride says, "I've got this." Poverty of spirit says, "I need You, God."

**The Paradox**
Here's the beautiful paradox: When we admit we have nothing, we receive everything—the kingdom of heaven itself!

**Practical Application**
- Start each day acknowledging your dependence on God
- Resist the temptation to compare your spirituality to others
- Pray like the tax collector: honestly about your need`,
          id: `"Berbahagialah orang yang miskin di hadapan Allah, karena merekalah yang empunya Kerajaan Sorga." (Matius 5:3)`,
        },
        scripture_references: [
          { ...createBibleRef('Matthew', 5, 3), text: 'Blessed are the poor in spirit, for theirs is the kingdom of heaven.' },
          { ...createBibleRef('Luke', 18, 13, 14), text: 'But the tax collector stood at a distance. He would not even look up to heaven, but beat his breast and said, "God, have mercy on me, a sinner."' },
        ],
        discussion_questions: {
          en: [
            'In what areas do you tend to be spiritually self-sufficient?',
            'How can you cultivate poverty of spirit this week?',
          ],
          id: [
            'Di area mana kamu cenderung mandiri secara rohani?',
            'Bagaimana kamu bisa mengembangkan kemiskinan roh minggu ini?',
          ],
        },
        application: {
          en: 'Before you pray today, pause and acknowledge: "God, without You, I can do nothing."',
          id: 'Sebelum berdoa hari ini, berhenti sejenak dan akui: "Tuhan, tanpa-Mu, aku tidak bisa berbuat apa-apa."',
        },
        duration_minutes: 15,
        order: 2,
      },
      {
        id: 'lesson_002_3',
        title: { en: 'Blessed are Those Who Mourn', id: 'Berbahagialah yang Berdukacita' },
        content: {
          en: `"Blessed are those who mourn, for they will be comforted." (Matthew 5:4)

**Not All Mourning**
Jesus isn't saying all sadness is blessed. He's talking about a specific type of mourning—godly sorrow over sin and the brokenness of our world.

**Three Types of Godly Mourning**
1. **Mourning over personal sin** - Not just guilt, but genuine grief that we've hurt the heart of God
2. **Mourning over the world's brokenness** - Weeping over injustice, suffering, and the effects of sin
3. **Mourning over distance from God** - Longing for deeper intimacy with our Creator

**The Promise of Comfort**
"They will be comforted" - The Greek is passive, meaning God Himself will do the comforting. The Holy Spirit is called the Comforter (Parakletos) for this very reason.

**From Mourning to Dancing**
This isn't permanent sorrow. It's the pathway to joy. Psalm 30:11 says, "You turned my wailing into dancing."`,
          id: `"Berbahagialah orang yang berdukacita, karena mereka akan dihibur." (Matius 5:4)`,
        },
        scripture_references: [
          { ...createBibleRef('Matthew', 5, 4), text: 'Blessed are those who mourn, for they will be comforted.' },
          { ...createBibleRef('2 Corinthians', 7, 10), text: 'Godly sorrow brings repentance that leads to salvation and leaves no regret.' },
        ],
        discussion_questions: {
          en: [
            'When was the last time you mourned over sin in your life?',
            'How have you experienced God\'s comfort in times of godly sorrow?',
          ],
          id: [
            'Kapan terakhir kali kamu berdukacita atas dosa dalam hidupmu?',
            'Bagaimana kamu mengalami penghiburan Tuhan dalam waktu dukacita yang saleh?',
          ],
        },
        duration_minutes: 15,
        order: 3,
      },
      {
        id: 'lesson_002_4',
        title: { en: 'Blessed are the Meek', id: 'Berbahagialah yang Lemah Lembut' },
        content: {
          en: `"Blessed are the meek, for they will inherit the earth." (Matthew 5:5)

**Meekness is Not Weakness**
Meekness is often misunderstood as weakness or passivity. Nothing could be further from the truth!

The Greek word "praus" was used to describe a wild horse that had been broken and trained. It still had all its strength—but now that strength was under control.

**Power Under Control**
Jesus called Himself "gentle and humble in heart" (Matthew 11:29), yet He drove money-changers from the temple. Moses was called the meekest man on earth, yet he confronted Pharaoh.

Meekness is:
- Strength surrendered to God
- Power under divine control
- Responding, not reacting
- Trusting God to defend you

**Inheriting the Earth**
The proud try to grab and control. The meek receive from God's hand. Psalm 37:11 echoes this: "The meek will inherit the land and enjoy peace and prosperity."`,
          id: `"Berbahagialah orang yang lemah lembut, karena mereka akan memiliki bumi." (Matius 5:5)`,
        },
        scripture_references: [
          { ...createBibleRef('Matthew', 5, 5), text: 'Blessed are the meek, for they will inherit the earth.' },
          { ...createBibleRef('Matthew', 11, 29), text: 'Take my yoke upon you and learn from me, for I am gentle and humble in heart.' },
        ],
        discussion_questions: {
          en: [
            'How is meekness different from weakness in your understanding now?',
            'In what situations do you find it hardest to respond with meekness?',
          ],
          id: [
            'Bagaimana kelemahlembutan berbeda dari kelemahan dalam pemahamanmu sekarang?',
            'Dalam situasi apa kamu merasa paling sulit merespons dengan kelemahlembutan?',
          ],
        },
        application: {
          en: 'The next time you feel the urge to react harshly, pause and ask: "How would meekness respond?"',
          id: 'Lain kali kamu merasa dorongan untuk bereaksi keras, berhenti dan tanya: "Bagaimana kelemahlembutan akan merespons?"',
        },
        duration_minutes: 15,
        order: 4,
      },
    ],
    lesson_count: 4,
    estimated_duration_minutes: 60,
    main_passage: createBibleRef('Matthew', 5, 1, 12),
    supporting_verses: [createBibleRef('Luke', 6, 20, 26)],
    categories: ['Teachings of Jesus', 'Character', 'Spiritual Growth'],
    category: 'new_testament',
    difficulty: 'beginner',
    cover_image_url: 'https://images.unsplash.com/photo-1490730141103-6cac27abb37f?w=800&q=80',
    completion_count: 4231,
    average_rating: 4.9,
    ratings_count: 628,
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-12T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-10T10:00:00Z',
    deleted: false,
  },
  {
    id: 'study_003',
    scope: 'global',
    title: {
      en: 'Foundations of Faith: Core Christian Beliefs',
      id: 'Dasar-Dasar Iman: Keyakinan Kristen Inti',
    },
    subtitle: {
      en: 'A 5-Day Study for New Believers',
      id: 'Studi 5 Hari untuk Orang Percaya Baru',
    },
    description: {
      en: 'Perfect for new Christians or anyone wanting to strengthen their understanding of core beliefs. This study covers salvation, the Trinity, Scripture, prayer, and the Church.',
      id: 'Sempurna untuk orang Kristen baru atau siapa pun yang ingin memperkuat pemahaman mereka tentang keyakinan inti. Studi ini mencakup keselamatan, Tritunggal, Alkitab, doa, dan Gereja.',
    },
    full_content: {
      en: 'Every building needs a strong foundation. In this study, we lay the groundwork for a lifetime of faith by exploring the essential truths every Christian should know.',
      id: 'Setiap bangunan membutuhkan fondasi yang kuat. Dalam studi ini, kita meletakkan dasar untuk seumur hidup iman dengan menjelajahi kebenaran penting yang harus diketahui setiap orang Kristen.',
    },
    introduction: {
      en: 'Whether you\'re a new believer or want to refresh your understanding, this study will give you confidence in what you believe and why you believe it.',
      id: 'Apakah Anda orang percaya baru atau ingin menyegarkan pemahaman Anda, studi ini akan memberi Anda keyakinan tentang apa yang Anda percaya dan mengapa.',
    },
    learning_objectives: [
      { en: 'Understand the basics of salvation', id: 'Memahami dasar-dasar keselamatan' },
      { en: 'Know the nature of God as Trinity', id: 'Mengetahui sifat Allah sebagai Tritunggal' },
      { en: 'Build a foundation for prayer and Bible reading', id: 'Membangun fondasi untuk doa dan membaca Alkitab' },
    ],
    author: { en: 'Pastor James Miller', id: 'Pendeta James Miller' },
    author_title: { en: 'Discipleship Pastor', id: 'Pendeta Pemuridan' },
    lessons: [
      {
        id: 'lesson_003_1',
        title: { en: 'Salvation: The Gift of Grace', id: 'Keselamatan: Karunia Anugerah' },
        content: {
          en: `The foundation of Christian faith is understanding what God has done for us through Jesus Christ.

**The Problem: Sin**
"For all have sinned and fall short of the glory of God." (Romans 3:23)

Sin isn't just bad behavior—it's separation from God. Like a power cord unplugged from its source, we were disconnected from the source of life.

**The Solution: Jesus**
"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." (John 3:16)

Jesus—fully God and fully man—lived the perfect life we couldn't live, and died the death we deserved to die.

**The Response: Faith**
"For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast." (Ephesians 2:8-9)

Salvation is a gift, not a reward. We receive it by trusting in Jesus, not by earning it through good deeds.

**The Result: New Life**
"Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" (2 Corinthians 5:17)

When we trust Christ, we become new creations. Our past is forgiven, our present is empowered, and our future is secure.`,
          id: `Fondasi iman Kristen adalah memahami apa yang telah Allah lakukan bagi kita melalui Yesus Kristus.`,
        },
        summary: { en: 'Salvation is God\'s free gift, received by faith in Jesus Christ.', id: 'Keselamatan adalah karunia gratis dari Allah, diterima melalui iman kepada Yesus Kristus.' },
        scripture_references: [
          { ...createBibleRef('Romans', 3, 23), text: 'For all have sinned and fall short of the glory of God.' },
          { ...createBibleRef('John', 3, 16), text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' },
          { ...createBibleRef('Ephesians', 2, 8, 9), text: 'For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God.' },
        ],
        discussion_questions: {
          en: [
            'When did you first understand that salvation is a gift, not something earned?',
            'How does understanding grace change how you approach God?',
          ],
          id: [
            'Kapan kamu pertama kali memahami bahwa keselamatan adalah karunia, bukan sesuatu yang diperoleh?',
            'Bagaimana memahami anugerah mengubah cara kamu menghampiri Tuhan?',
          ],
        },
        application: {
          en: 'If you\'ve never received Christ, today can be the day. Simply pray: "Jesus, I believe You died for my sins. I receive Your gift of salvation. Come into my life and be my Lord."',
          id: 'Jika kamu belum pernah menerima Kristus, hari ini bisa menjadi harinya. Cukup berdoa: "Yesus, aku percaya Engkau mati untuk dosa-dosaku. Aku menerima karunia keselamatan-Mu. Masuklah ke dalam hidupku dan jadilah Tuhanku."',
        },
        duration_minutes: 15,
        order: 1,
      },
      {
        id: 'lesson_003_2',
        title: { en: 'The Trinity: One God, Three Persons', id: 'Tritunggal: Satu Allah, Tiga Pribadi' },
        content: {
          en: `One of Christianity's most distinctive beliefs is the Trinity—one God existing as three persons: Father, Son, and Holy Spirit.

**Not Three Gods**
Christianity is monotheistic. "Hear, O Israel: The LORD our God, the LORD is one." (Deuteronomy 6:4)

**Not One Person**
Yet Scripture reveals three distinct persons:
- The Father sends the Son (John 3:16)
- The Son prays to the Father (John 17)
- The Spirit proceeds from both (John 15:26)

**One God in Three Persons**
At Jesus' baptism, we see all three: The Son is baptized, the Spirit descends like a dove, and the Father speaks from heaven (Matthew 3:16-17).

**Why Does This Matter?**
The Trinity shows us that God is relational at His core. Love has existed eternally within the Godhead. And this loving God invites us into relationship with Him.

**Analogies (Imperfect but Helpful)**
- Water exists as liquid, ice, and steam—same substance, different forms
- The sun: the star, its light, and its heat
- An egg: shell, white, and yolk

No analogy is perfect, but they help us approach this mystery.`,
          id: `Salah satu keyakinan paling khas dari Kekristenan adalah Tritunggal—satu Allah yang ada sebagai tiga pribadi: Bapa, Anak, dan Roh Kudus.`,
        },
        summary: { en: 'God exists as one God in three persons—Father, Son, and Holy Spirit.', id: 'Allah ada sebagai satu Allah dalam tiga pribadi—Bapa, Anak, dan Roh Kudus.' },
        scripture_references: [
          { ...createBibleRef('Matthew', 3, 16, 17), text: 'As soon as Jesus was baptized, he went up out of the water. At that moment heaven was opened, and he saw the Spirit of God descending like a dove and alighting on him. And a voice from heaven said, "This is my Son, whom I love."' },
          { ...createBibleRef('Matthew', 28, 19), text: 'Go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.' },
        ],
        discussion_questions: {
          en: [
            'How does understanding the Trinity affect your view of God?',
            'Which person of the Trinity do you relate to most? Which least?',
          ],
          id: [
            'Bagaimana memahami Tritunggal mempengaruhi pandanganmu tentang Allah?',
            'Pribadi Tritunggal mana yang paling kamu hubungkan? Mana yang paling tidak?',
          ],
        },
        duration_minutes: 15,
        order: 2,
      },
      {
        id: 'lesson_003_3',
        title: { en: 'The Bible: God\'s Word to Us', id: 'Alkitab: Firman Allah Kepada Kita' },
        content: {
          en: `The Bible is unlike any other book—it's God's written revelation to humanity.

**Inspiration**
"All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness." (2 Timothy 3:16)

The Bible wasn't dictated like a secretary takes notes. God used human authors with their personalities, backgrounds, and writing styles—yet He superintended the process so that what they wrote was exactly what He wanted said.

**Authority**
Because the Bible is God's Word, it has authority over our lives. It's not just a good book with helpful suggestions—it's the standard by which we measure everything else.

**Sufficiency**
Scripture contains everything we need for life and godliness (2 Peter 1:3). We don't need extra revelations to know God's will for our lives.

**How to Read the Bible**
1. **Pray first** - Ask the Holy Spirit to illuminate your reading
2. **Read in context** - Who wrote it? To whom? Why?
3. **Look for Jesus** - He's the hero of every story
4. **Apply it personally** - Ask: What does this mean for my life today?`,
          id: `Alkitab tidak seperti buku lainnya—ini adalah wahyu tertulis Allah kepada umat manusia.`,
        },
        summary: { en: 'The Bible is God\'s inspired, authoritative, and sufficient Word for us.', id: 'Alkitab adalah Firman Allah yang diilhami, berwibawa, dan cukup bagi kita.' },
        scripture_references: [
          { ...createBibleRef('2 Timothy', 3, 16, 17), text: 'All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness, so that the servant of God may be thoroughly equipped for every good work.' },
          { ...createBibleRef('Psalm', 119, 105), text: 'Your word is a lamp for my feet, a light on my path.' },
        ],
        discussion_questions: {
          en: [
            'What challenges do you face in reading the Bible regularly?',
            'How has Scripture impacted your life?',
          ],
          id: [
            'Tantangan apa yang kamu hadapi dalam membaca Alkitab secara teratur?',
            'Bagaimana Alkitab telah mempengaruhi hidupmu?',
          ],
        },
        application: {
          en: 'Commit to reading the Bible daily, even if just for 10 minutes. Start with the Gospel of John.',
          id: 'Berkomitmenlah untuk membaca Alkitab setiap hari, bahkan hanya 10 menit. Mulailah dengan Injil Yohanes.',
        },
        duration_minutes: 15,
        order: 3,
      },
    ],
    lesson_count: 3,
    estimated_duration_minutes: 45,
    main_passage: createBibleRef('Ephesians', 2, 1, 10),
    supporting_verses: [
      createBibleRef('John', 3, 16),
      createBibleRef('2 Timothy', 3, 16),
    ],
    categories: ['Foundations', 'New Believers', 'Theology'],
    category: 'topical',
    difficulty: 'beginner',
    cover_image_url: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80',
    completion_count: 6542,
    average_rating: 4.7,
    ratings_count: 892,
    ai_generated: false,
    status: 'published',
    published_at: '2025-01-14T00:00:00Z',
    created_by: 'system',
    created_at: '2025-01-12T10:00:00Z',
    deleted: false,
  },
];

// ============================================================================
// TOPICAL CATEGORIES
// ============================================================================

export const mockTopicalCategories: TopicalCategory[] = [
  {
    id: 'topic_001',
    scope: 'global',
    name: { en: 'Faith & Trust', id: 'Iman & Kepercayaan' },
    description: {
      en: 'Verses about building faith and learning to trust God in all circumstances.',
      id: 'Ayat-ayat tentang membangun iman dan belajar mempercayai Tuhan dalam segala keadaan.',
    },
    icon: '🙏',
    color: '#3b82f6',
    sort_order: 1,
    status: 'published',
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    deleted: false,
  },
  {
    id: 'topic_002',
    scope: 'global',
    name: { en: 'Peace & Anxiety', id: 'Damai & Kecemasan' },
    description: {
      en: "Find God's peace in the midst of worry, stress, and anxious thoughts.",
      id: 'Temukan damai Tuhan di tengah kekhawatiran, stres, dan pikiran cemas.',
    },
    icon: '🕊️',
    color: '#10b981',
    sort_order: 2,
    status: 'published',
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    deleted: false,
  },
  {
    id: 'topic_003',
    scope: 'global',
    name: { en: 'Love & Relationships', id: 'Kasih & Hubungan' },
    description: {
      en: "God's wisdom for loving others, building healthy relationships, and showing compassion.",
      id: 'Hikmat Tuhan untuk mengasihi orang lain, membangun hubungan yang sehat, dan menunjukkan belas kasihan.',
    },
    icon: '❤️',
    color: '#ef4444',
    sort_order: 3,
    status: 'published',
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    deleted: false,
  },
  {
    id: 'topic_004',
    scope: 'global',
    name: { en: 'Strength & Courage', id: 'Kekuatan & Keberanian' },
    description: {
      en: 'Scriptures to strengthen you when facing challenges, fear, or difficult decisions.',
      id: 'Ayat-ayat untuk menguatkanmu saat menghadapi tantangan, ketakutan, atau keputusan sulit.',
    },
    icon: '💪',
    color: '#f59e0b',
    sort_order: 4,
    status: 'published',
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    deleted: false,
  },
  {
    id: 'topic_005',
    scope: 'global',
    name: { en: 'Wisdom & Guidance', id: 'Hikmat & Bimbingan' },
    description: {
      en: "Seek God's wisdom for decision-making and discovering His will for your life.",
      id: 'Carilah hikmat Tuhan untuk pengambilan keputusan dan menemukan kehendak-Nya untuk hidupmu.',
    },
    icon: '🧠',
    color: '#8b5cf6',
    sort_order: 5,
    status: 'published',
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    deleted: false,
  },
  {
    id: 'topic_006',
    scope: 'global',
    name: { en: 'Hope & Encouragement', id: 'Harapan & Dorongan' },
    description: {
      en: 'Uplifting verses for when you need hope, encouragement, and renewed strength.',
      id: 'Ayat-ayat yang mengangkat ketika kamu membutuhkan harapan, dorongan, dan kekuatan yang diperbarui.',
    },
    icon: '🌟',
    color: '#06b6d4',
    sort_order: 6,
    status: 'published',
    created_by: 'system',
    created_at: '2025-01-01T00:00:00Z',
    deleted: false,
  },
];

// ============================================================================
// EXPORT ALL MOCK DATA
// ============================================================================

export default {
  dailyDevotions: mockDailyDevotions,
  versesOfTheDay: mockVersesOfTheDay,
  bibleFigures: mockBibleFigures,
  dailyQuizzes: mockDailyQuizzes,
  bibleStudies: mockBibleStudies,
  topicalCategories: mockTopicalCategories,
};
