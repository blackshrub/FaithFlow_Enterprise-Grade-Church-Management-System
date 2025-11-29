/**
 * Persona Detector
 *
 * Detects user age persona from message content for adaptive tone.
 * Adjusts vocabulary, tone, and Scripture style based on detected persona.
 *
 * Personas:
 * - child: 8-12 years (Sunday school, simple language)
 * - teen: 13-19 years (youth group, identity-focused)
 * - young_adult: 20-30 years (campus, early career)
 * - adult: 31-55 years (mature, balanced)
 * - senior: 55+ years (respectful, comforting)
 */

export type UserPersona =
  | 'child'
  | 'teen'
  | 'young_adult'
  | 'adult'
  | 'senior';

export interface PersonaToneConfig {
  tone: string;
  vocabulary: string;
  scripture: string;
  temperature: number;
}

/**
 * Patterns for detecting child persona (8-12 years)
 */
const CHILD_PATTERNS = [
  // English
  /sunday school/i,
  /kids church/i,
  /children('s)? (ministry|service|class)/i,
  /\b(8|9|10|11|12)\s*(years?\s*old|yo|tahun)/i,
  /elementary school/i,
  /grade [1-6]/i,
  // Indonesian
  /sekolah minggu/i,
  /anak(-)?anak/i,
  /\bsd\b/i,
  /kelas [1-6]/i,
  /umur (8|9|10|11|12)/i,
];

/**
 * Patterns for detecting teen persona (13-19 years)
 */
const TEEN_PATTERNS = [
  // English
  /\b(teen(ager)?s?|youth)\b/i,
  /high school/i,
  /middle school/i,
  /junior high/i,
  /\b(13|14|15|16|17|18|19)\s*(years?\s*old|yo|tahun)/i,
  /dating|boyfriend|girlfriend/i,
  /bullying|bullied/i,
  /peer pressure/i,
  /prom|homecoming/i,
  // Indonesian
  /remaja/i,
  /\bsmp\b/i,
  /\bsma\b/i,
  /\bsmk\b/i,
  /pacaran/i,
  /pacar/i,
  /teman sebaya/i,
  /bullying/i,
  /umur (1[3-9])/i,
];

/**
 * Patterns for detecting young adult persona (20-30 years)
 */
const YOUNG_ADULT_PATTERNS = [
  // English
  /college|university/i,
  /campus (ministry|life)/i,
  /first job|early career/i,
  /career (start|beginning)/i,
  /\b(20|21|22|23|24|25|26|27|28|29|30)\s*(years?\s*old|yo|tahun)/i,
  /internship/i,
  /graduate|graduating/i,
  /quarter(-)?life (crisis)?/i,
  /engagement|engaged/i,
  /wedding planning/i,
  // Indonesian
  /kuliah/i,
  /universitas/i,
  /kampus/i,
  /mahasiswa/i,
  /karir awal/i,
  /pekerjaan pertama/i,
  /fresh graduate/i,
  /magang/i,
  /umur (2[0-9]|30)/i,
  /tunangan/i,
];

/**
 * Patterns for detecting senior persona (55+ years)
 */
const SENIOR_PATTERNS = [
  // English
  /retire(d|ment)/i,
  /grandchild(ren)?|grandpa|grandma|grandmother|grandfather/i,
  /senior (citizen|ministry)/i,
  /\b(55|56|57|58|59|6[0-9]|7[0-9]|8[0-9]|9[0-9])\s*(years?\s*old|yo|tahun)/i,
  /golden years/i,
  /elderly/i,
  /assisted living/i,
  /nursing home/i,
  /late-life/i,
  // Indonesian
  /lansia/i,
  /pensiun/i,
  /cucu/i,
  /kakek|nenek/i,
  /kesehatan usia lanjut/i,
  /umur (5[5-9]|6[0-9]|7[0-9]|8[0-9])/i,
  /panti jompo/i,
];

/**
 * Detect user persona from message content
 * Returns the detected persona or 'adult' as default
 */
export function detectPersona(input: string): UserPersona {
  const text = input.toLowerCase();

  // Check patterns in priority order (most specific first)
  if (CHILD_PATTERNS.some(pattern => pattern.test(text))) {
    return 'child';
  }

  if (TEEN_PATTERNS.some(pattern => pattern.test(text))) {
    return 'teen';
  }

  if (YOUNG_ADULT_PATTERNS.some(pattern => pattern.test(text))) {
    return 'young_adult';
  }

  if (SENIOR_PATTERNS.some(pattern => pattern.test(text))) {
    return 'senior';
  }

  // Default to adult
  return 'adult';
}

/**
 * Get tone configuration for a given persona
 */
export function personaToneConfig(persona: UserPersona): PersonaToneConfig {
  switch (persona) {
    case 'child':
      return {
        tone: 'gentle, simple, caring, encouraging',
        vocabulary: 'very simple words, short sentences, avoid complex theology',
        scripture: 'short, paraphrased Bible ideas, simple stories',
        temperature: 0.25,
      };

    case 'teen':
      return {
        tone: 'relatable, encouraging, identity-focused, authentic',
        vocabulary: 'modern but clean language, avoid being "cringe"',
        scripture: 'identity in Christ, purpose, encouragement, real-life application',
        temperature: 0.35,
      };

    case 'young_adult':
      return {
        tone: 'thoughtful, supportive, conversational, practical',
        vocabulary: 'modern theological vocabulary, intellectual but accessible',
        scripture: 'calling, purpose, wisdom, life direction, relationships',
        temperature: 0.4,
      };

    case 'adult':
      return {
        tone: 'balanced, pastoral, mature, direct',
        vocabulary: 'standard theological vocabulary',
        scripture: 'full Bible citation, doctrinal depth when needed',
        temperature: 0.3,
      };

    case 'senior':
      return {
        tone: 'respectful, comforting, steady, honoring',
        vocabulary: 'clear, dignified, not patronizing',
        scripture: 'themes of endurance, hope, faithfulness, eternal perspective',
        temperature: 0.25,
      };
  }
}

/**
 * Get temperature adjustment for persona
 */
export function getPersonaTemperature(persona: UserPersona): number {
  return personaToneConfig(persona).temperature;
}

/**
 * Build persona tone instruction for system prompt
 */
export function buildPersonaToneInstruction(persona: UserPersona): string {
  const config = personaToneConfig(persona);

  return `
PERSONA ADAPTATION (${persona.toUpperCase().replace('_', ' ')}):
- Tone: ${config.tone}
- Vocabulary style: ${config.vocabulary}
- Scripture approach: ${config.scripture}

IMPORTANT: Apply this tone naturally without mentioning persona detection.
`.trim();
}

export default detectPersona;
