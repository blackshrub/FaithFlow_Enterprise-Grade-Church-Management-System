/**
 * Intent Classifier
 *
 * Classifies user messages into intent categories for optimal model routing.
 * Supports tiered model selection: Haiku (simple) → Sonnet (standard) → Opus (complex)
 */

export type Intent =
  | 'simple'        // Greetings, thanks, short acknowledgments (→ Haiku)
  | 'pastoral'      // Emotional support, guilt, shame, life struggles
  | 'scholarly'     // Exegesis, hermeneutics, systematic theology
  | 'devotional'    // Prayer, reflection, encouragement
  | 'apologetics'   // Comparing religions, debates, critiques
  | 'general_faith' // Normal Christian questions
  | 'other_religions' // Curiosity about other faiths
  | 'crisis';       // Suicide, self-harm, abuse, danger

/**
 * Simple/greeting patterns - use Haiku for instant responses
 */
const SIMPLE_PATTERNS = [
  // Greetings (EN)
  /^(hi|hello|hey|good morning|good afternoon|good evening|good night)[\s!.?]*$/i,
  /^(morning|evening|night)[\s!.?]*$/i,
  // Greetings (ID)
  /^(halo|hai|selamat pagi|selamat siang|selamat sore|selamat malam)[\s!.?]*$/i,
  /^(pagi|siang|sore|malam)[\s!.?]*$/i,
  // Acknowledgments (EN)
  /^(thanks|thank you|thx|ty|ok|okay|got it|understood|i see|alright)[\s!.?]*$/i,
  /^(amen|hallelujah|praise god|praise the lord|god bless)[\s!.?]*$/i,
  /^(yes|no|sure|right|correct|exactly)[\s!.?]*$/i,
  // Acknowledgments (ID)
  /^(terima kasih|makasih|trims|oke|baik|mengerti|paham|siap)[\s!.?]*$/i,
  /^(amin|haleluya|puji tuhan|tuhan memberkati)[\s!.?]*$/i,
  /^(ya|tidak|betul|benar|tepat)[\s!.?]*$/i,
  // Farewells (EN)
  /^(bye|goodbye|see you|take care|have a good day|good night)[\s!.?]*$/i,
  // Farewells (ID)
  /^(sampai jumpa|dadah|selamat tinggal|selamat istirahat)[\s!.?]*$/i,
];

/**
 * Check if message is simple enough for Haiku
 */
function isSimpleMessage(text: string): boolean {
  const trimmed = text.trim();

  // Very short messages (under 20 chars) that match patterns
  if (trimmed.length <= 20) {
    return SIMPLE_PATTERNS.some(pattern => pattern.test(trimmed));
  }

  // Short messages (under 50 chars) with just greeting + name
  if (trimmed.length <= 50) {
    const greetingWithName = /^(hi|hello|hey|halo|hai)\s+[\w]+[\s!.?]*$/i;
    if (greetingWithName.test(trimmed)) return true;
  }

  return false;
}

/**
 * Keywords for each intent category
 */
const INTENT_KEYWORDS: Record<Exclude<Intent, 'simple'>, string[]> = {
  pastoral: [
    // English
    'struggling', 'depressed', 'anxious', 'afraid', 'guilt', 'shame', 'hurt',
    'lonely', 'lost', 'broken', 'pain', 'suffering', 'forgive', 'angry',
    'hopeless', 'worried', 'stressed', 'relationship', 'marriage', 'divorce',
    'grief', 'mourning', 'loss', 'death', 'dying', 'sick', 'illness',
    'addiction', 'temptation', 'sin', 'confess', 'repent',
    // Indonesian
    'berjuang', 'depresi', 'cemas', 'takut', 'bersalah', 'malu', 'sakit',
    'kesepian', 'hilang', 'hancur', 'penderitaan', 'mengampuni', 'marah',
    'putus asa', 'khawatir', 'stres', 'hubungan', 'pernikahan', 'cerai',
    'duka', 'berduka', 'kehilangan', 'kematian', 'meninggal', 'sakit',
    'kecanduan', 'pencobaan', 'dosa', 'mengaku', 'bertobat',
  ],
  scholarly: [
    // English
    'exegesis', 'hermeneutics', 'greek', 'hebrew', 'original text', 'theology',
    'systematic', 'reformed', 'calvinist', 'arminian', 'doctrine', 'soteriology',
    'ecclesiology', 'eschatology', 'pneumatology', 'christology', 'scholarly',
    'academic', 'in depth', 'compare', 'historical', 'manuscript', 'translation',
    'context', 'interpretation', 'original language', 'word study',
    // Indonesian
    'tafsir', 'hermeneutika', 'yunani', 'ibrani', 'teks asli', 'teologi',
    'sistematis', 'doktrin', 'soteriologi', 'eklesiologi', 'eskatologi',
    'ilmiah', 'mendalam', 'bandingkan', 'historis', 'naskah', 'terjemahan',
    'konteks', 'penafsiran', 'bahasa asli', 'studi kata',
  ],
  devotional: [
    // English
    'pray', 'prayer', 'devotion', 'meditation', 'reflect', 'gratitude',
    'thankful', 'praise', 'worship', 'quiet time', 'morning', 'evening',
    'daily', 'encourage', 'comfort', 'peace', 'rest', 'verse for today',
    'scripture for', 'bible reading', 'devotional',
    // Indonesian
    'berdoa', 'doa', 'renungan', 'meditasi', 'refleksi', 'syukur',
    'bersyukur', 'pujian', 'penyembahan', 'saat teduh', 'pagi', 'malam',
    'harian', 'menghibur', 'damai', 'tenang', 'ayat hari ini',
    'firman untuk', 'bacaan alkitab',
  ],
  apologetics: [
    // English
    'defend', 'debate', 'prove', 'evidence', 'argument', 'logical',
    'reason', 'philosophy', 'atheist', 'skeptic', 'challenge', 'contradict',
    'science', 'evolution', 'big bang', 'problem of evil', 'suffering why',
    // Indonesian
    'membela', 'debat', 'bukti', 'argumen', 'logis', 'akal',
    'filsafat', 'ateis', 'skeptis', 'tantangan', 'kontradiksi',
    'sains', 'evolusi', 'masalah kejahatan', 'mengapa penderitaan',
  ],
  other_religions: [
    // English
    'islam', 'muslim', 'quran', 'buddhism', 'buddha', 'hinduism', 'hindu',
    'jewish', 'judaism', 'mormon', 'jehovah', 'catholic', 'orthodox',
    'compare religions', 'other faith', 'different religion',
    // Indonesian
    'islam', 'muslim', 'alquran', 'buddha', 'budha', 'hindu',
    'yahudi', 'yudaisme', 'katolik', 'ortodoks',
    'bandingkan agama', 'kepercayaan lain', 'agama lain',
  ],
  crisis: [
    // English
    'suicide', 'kill myself', 'end my life', 'want to die', 'self-harm',
    'cutting', 'hurt myself', 'abuse', 'abused', 'violence', 'danger',
    'emergency', 'help me', 'can\'t go on', 'no reason to live',
    'better off dead', 'end it all', 'nobody cares',
    // Indonesian
    'bunuh diri', 'mengakhiri hidup', 'ingin mati', 'menyakiti diri',
    'menyayat', 'pelecehan', 'kekerasan', 'bahaya', 'darurat', 'tolong',
    'tidak kuat lagi', 'tidak ada alasan hidup', 'lebih baik mati',
    'tidak ada yang peduli',
  ],
  general_faith: [], // Default category
};

/**
 * Classify user message into an intent category
 * Priority: crisis > simple > keyword-based scoring > general_faith
 */
export function classifyIntent(userInput: string): Intent {
  const lowerInput = userInput.toLowerCase();

  // 1. Check crisis first (highest priority - safety critical)
  if (INTENT_KEYWORDS.crisis.some(keyword => lowerInput.includes(keyword))) {
    return 'crisis';
  }

  // 2. Check for simple messages (use Haiku for instant response)
  if (isSimpleMessage(userInput)) {
    return 'simple';
  }

  // 3. Score other categories by keyword matching
  const scores: Partial<Record<Intent, number>> = {
    pastoral: 0,
    scholarly: 0,
    devotional: 0,
    apologetics: 0,
    other_religions: 0,
  };

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Exclude<Intent, 'simple'>, string[]][]) {
    if (intent === 'crisis' || intent === 'general_faith') continue;

    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        scores[intent as keyof typeof scores] = (scores[intent as keyof typeof scores] || 0) + 1;
      }
    }
  }

  // 4. Find highest scoring intent
  let maxScore = 0;
  let bestIntent: Intent = 'general_faith';

  for (const [intent, score] of Object.entries(scores)) {
    if (score && score > maxScore) {
      maxScore = score;
      bestIntent = intent as Intent;
    }
  }

  return bestIntent;
}

export default classifyIntent;
