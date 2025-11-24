/**
 * Mock Bible Data for Demo Mode
 *
 * Provides sample Bible data when app is in demo mode
 * so users can test Bible features without backend connection
 */

export interface BibleVersion {
  code: string;
  name: string;
  language: string;
  language_code: string;
}

export interface BibleBook {
  code: string;
  name: string;
  testament: 'Old' | 'New';
  chapters: number;
}

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

// Mock Bible versions
export const mockBibleVersions: BibleVersion[] = [
  {
    code: 'TB',
    name: 'Terjemahan Baru',
    language: 'Indonesian',
    language_code: 'id',
  },
  {
    code: 'KJV',
    name: 'King James Version',
    language: 'English',
    language_code: 'en',
  },
  {
    code: 'NIV',
    name: 'New International Version',
    language: 'English',
    language_code: 'en',
  },
];

// Mock Bible books (subset for demo)
export const mockBibleBooks: BibleBook[] = [
  // Old Testament
  { code: 'GEN', name: 'Kejadian / Genesis', testament: 'Old', chapters: 50 },
  { code: 'EXO', name: 'Keluaran / Exodus', testament: 'Old', chapters: 40 },
  { code: 'PSA', name: 'Mazmur / Psalms', testament: 'Old', chapters: 150 },
  { code: 'PRO', name: 'Amsal / Proverbs', testament: 'Old', chapters: 31 },
  { code: 'ISA', name: 'Yesaya / Isaiah', testament: 'Old', chapters: 66 },

  // New Testament
  { code: 'MAT', name: 'Matius / Matthew', testament: 'New', chapters: 28 },
  { code: 'MRK', name: 'Markus / Mark', testament: 'New', chapters: 16 },
  { code: 'LUK', name: 'Lukas / Luke', testament: 'New', chapters: 24 },
  { code: 'JHN', name: 'Yohanes / John', testament: 'New', chapters: 21 },
  { code: 'ACT', name: 'Kisah Para Rasul / Acts', testament: 'New', chapters: 28 },
  { code: 'ROM', name: 'Roma / Romans', testament: 'New', chapters: 16 },
  { code: 'CO1', name: '1 Korintus / 1 Corinthians', testament: 'New', chapters: 16 },
  { code: 'CO2', name: '2 Korintus / 2 Corinthians', testament: 'New', chapters: 13 },
  { code: 'GAL', name: 'Galatia / Galatians', testament: 'New', chapters: 6 },
  { code: 'EPH', name: 'Efesus / Ephesians', testament: 'New', chapters: 6 },
  { code: 'PHP', name: 'Filipi / Philippians', testament: 'New', chapters: 4 },
  { code: 'JAS', name: 'Yakobus / James', testament: 'New', chapters: 5 },
  { code: 'PE1', name: '1 Petrus / 1 Peter', testament: 'New', chapters: 5 },
  { code: 'JO1', name: '1 Yohanes / 1 John', testament: 'New', chapters: 5 },
  { code: 'REV', name: 'Wahyu / Revelation', testament: 'New', chapters: 22 },
];

// Mock Bible chapters - Most famous passages for demo
export const mockBibleChapters: Record<string, BibleVerse[]> = {
  // John 3 (TB - Indonesian)
  'TB_JHN_3': [
    { book: 'JHN', chapter: 3, verse: 16, text: 'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.' },
    { book: 'JHN', chapter: 3, verse: 17, text: 'Sebab Allah mengutus Anak-Nya ke dalam dunia bukan untuk menghakimi dunia, melainkan untuk menyelamatkannya oleh Dia.' },
    { book: 'JHN', chapter: 3, verse: 18, text: 'Barangsiapa percaya kepada-Nya, ia tidak akan dihukum; barangsiapa tidak percaya, ia telah berada di bawah hukuman, sebab ia tidak percaya dalam nama Anak Tunggal Allah.' },
  ],

  // John 3 (KJV - English)
  'KJV_JHN_3': [
    { book: 'JHN', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
    { book: 'JHN', chapter: 3, verse: 17, text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.' },
    { book: 'JHN', chapter: 3, verse: 18, text: 'He that believeth on him is not condemned: but he that believeth not is condemned already, because he hath not believed in the name of the only begotten Son of God.' },
  ],

  // Psalm 23 (TB - Indonesian)
  'TB_PSA_23': [
    { book: 'PSA', chapter: 23, verse: 1, text: 'TUHAN adalah gembalaku, takkan kekurangan aku.' },
    { book: 'PSA', chapter: 23, verse: 2, text: 'Ia membaringkan aku di padang yang berumput hijau, Ia membimbing aku ke air yang tenang;' },
    { book: 'PSA', chapter: 23, verse: 3, text: 'Ia menyegarkan jiwaku. Ia menuntun aku di jalan yang benar oleh karena nama-Nya.' },
    { book: 'PSA', chapter: 23, verse: 4, text: 'Sekalipun aku berjalan dalam lembah kekelaman, aku tidak takut bahaya, sebab Engkau besertaku; gada-Mu dan tongkat-Mu, itulah yang menghibur aku.' },
    { book: 'PSA', chapter: 23, verse: 5, text: 'Engkau menyediakan hidangan bagiku, di hadapan lawanku; Engkau mengurapi kepalaku dengan minyak; pialaku penuh melimpah.' },
    { book: 'PSA', chapter: 23, verse: 6, text: 'Kebajikan dan kemurahan belaka akan mengikuti aku, seumur hidupku; dan aku akan diam dalam rumah TUHAN sepanjang masa.' },
  ],

  // Psalm 23 (KJV - English)
  'KJV_PSA_23': [
    { book: 'PSA', chapter: 23, verse: 1, text: 'The LORD is my shepherd; I shall not want.' },
    { book: 'PSA', chapter: 23, verse: 2, text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.' },
    { book: 'PSA', chapter: 23, verse: 3, text: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.' },
    { book: 'PSA', chapter: 23, verse: 4, text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.' },
    { book: 'PSA', chapter: 23, verse: 5, text: 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.' },
    { book: 'PSA', chapter: 23, verse: 6, text: 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.' },
  ],

  // Genesis 1 (TB - Creation story)
  'TB_GEN_1': [
    { book: 'GEN', chapter: 1, verse: 1, text: 'Pada mulanya Allah menciptakan langit dan bumi.' },
    { book: 'GEN', chapter: 1, verse: 2, text: 'Bumi belum berbentuk dan kosong; gelap gulita menutupi samudera raya, dan Roh Allah melayang-layang di atas permukaan air.' },
    { book: 'GEN', chapter: 1, verse: 3, text: 'Berfirmanlah Allah: "Jadilah terang." Lalu terang itu jadi.' },
    { book: 'GEN', chapter: 1, verse: 4, text: 'Allah melihat bahwa terang itu baik, lalu dipisahkan-Nyalah terang itu dari gelap.' },
    { book: 'GEN', chapter: 1, verse: 5, text: 'Dan Allah menamai terang itu siang, dan gelap itu malam. Jadilah petang dan jadilah pagi, itulah hari pertama.' },
  ],

  // Matthew 5 (TB - Sermon on the Mount / Beatitudes)
  'TB_MAT_5': [
    { book: 'MAT', chapter: 5, verse: 1, text: 'Ketika Yesus melihat orang banyak itu, naiklah Ia ke atas bukit dan setelah Ia duduk, datanglah murid-murid-Nya kepada-Nya.' },
    { book: 'MAT', chapter: 5, verse: 2, text: 'Maka Yesuspun mulai berbicara dan mengajar mereka, kata-Nya:' },
    { book: 'MAT', chapter: 5, verse: 3, text: 'Berbahagialah orang yang miskin di hadapan Allah, karena merekalah yang empunya Kerajaan Sorga.' },
    { book: 'MAT', chapter: 5, verse: 4, text: 'Berbahagialah orang yang berdukacita, karena mereka akan dihibur.' },
    { book: 'MAT', chapter: 5, verse: 5, text: 'Berbahagialah orang yang lemah lembut, karena mereka akan memiliki bumi.' },
    { book: 'MAT', chapter: 5, verse: 6, text: 'Berbahagialah orang yang lapar dan haus akan kebenaran, karena mereka akan dipuaskan.' },
    { book: 'MAT', chapter: 5, verse: 7, text: 'Berbahagialah orang yang murah hatinya, karena mereka akan beroleh kemurahan.' },
    { book: 'MAT', chapter: 5, verse: 8, text: 'Berbahagialah orang yang suci hatinya, karena mereka akan melihat Allah.' },
  ],

  // Romans 8 (TB - No condemnation)
  'TB_ROM_8': [
    { book: 'ROM', chapter: 8, verse: 1, text: 'Demikianlah sekarang tidak ada penghukuman bagi mereka yang ada di dalam Kristus Yesus.' },
    { book: 'ROM', chapter: 8, verse: 28, text: 'Kita tahu sekarang, bahwa Allah turut bekerja dalam segala sesuatu untuk mendatangkan kebaikan bagi mereka yang mengasihi Dia, yaitu bagi mereka yang terpanggil sesuai dengan rencana Allah.' },
    { book: 'ROM', chapter: 8, verse: 38, text: 'Sebab aku yakin, bahwa baik maut, maupun hidup, baik malaikat-malaikat, maupun pemerintah-pemerintah, baik yang ada sekarang, maupun yang akan datang,' },
    { book: 'ROM', chapter: 8, verse: 39, text: 'baik kuasa, maupun hal-hal yang sangat tinggi, atau yang sangat rendah, ataupun suatu makhluk lain, tidak akan dapat memisahkan kita dari kasih Allah, yang ada dalam Kristus Yesus, Tuhan kita.' },
  ],

  // Philippians 4 (TB - Don't worry)
  'TB_PHP_4': [
    { book: 'PHP', chapter: 4, verse: 4, text: 'Bersukacitalah senantiasa dalam Tuhan! Sekali lagi kukatakan: Bersukacitalah!' },
    { book: 'PHP', chapter: 4, verse: 5, text: 'Hendaklah kebaikan hatimu diketahui semua orang. Tuhan sudah dekat!' },
    { book: 'PHP', chapter: 4, verse: 6, text: 'Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.' },
    { book: 'PHP', chapter: 4, verse: 7, text: 'Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.' },
    { book: 'PHP', chapter: 4, verse: 13, text: 'Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.' },
  ],

  // 1 Corinthians 13 (TB - Love chapter)
  'TB_CO1_13': [
    { book: 'CO1', chapter: 13, verse: 1, text: 'Sekalipun aku dapat berkata-kata dengan semua bahasa manusia dan bahasa malaikat, tetapi jika aku tidak mempunyai kasih, aku sama dengan gong yang berkumandang dan canang yang gemerincing.' },
    { book: 'CO1', chapter: 13, verse: 4, text: 'Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong.' },
    { book: 'CO1', chapter: 13, verse: 5, text: 'Ia tidak melakukan yang tidak sopan dan tidak mencari keuntungan diri sendiri. Ia tidak pemarah dan tidak menyimpan kesalahan orang lain.' },
    { book: 'CO1', chapter: 13, verse: 6, text: 'Ia tidak bersukacita karena ketidakadilan, tetapi karena kebenaran.' },
    { book: 'CO1', chapter: 13, verse: 7, text: 'Ia menutupi segala sesuatu, percaya segala sesuatu, mengharapkan segala sesuatu, sabar menanggung segala sesuatu.' },
    { book: 'CO1', chapter: 13, verse: 8, text: 'Kasih tidak berkesudahan; nubuat akan berakhir; bahasa roh akan berhenti; pengetahuan akan lenyap.' },
    { book: 'CO1', chapter: 13, verse: 13, text: 'Demikianlah tinggal ketiga hal ini, yaitu iman, pengharapan dan kasih, dan yang paling besar di antaranya ialah kasih.' },
  ],
};

/**
 * Get mock Bible chapter data
 * @param version Bible version code (TB, KJV, NIV)
 * @param book Book code (JHN, PSA, etc)
 * @param chapter Chapter number
 * @returns Array of verses or empty array if not found
 */
export function getMockBibleChapter(
  version: string,
  book: string,
  chapter: number
): BibleVerse[] {
  const key = `${version}_${book}_${chapter}`;
  return mockBibleChapters[key] || [];
}

/**
 * Check if we have mock data for a specific chapter
 */
export function hasMockChapter(
  version: string,
  book: string,
  chapter: number
): boolean {
  const key = `${version}_${book}_${chapter}`;
  return key in mockBibleChapters;
}
