export type Script = 'hiragana' | 'katakana'
export type RowId = 'a' | 'ka' | 'sa' | 'ta' | 'na' | 'ha' | 'ma' | 'ya' | 'ra' | 'wa' | 'n'

export interface KanaChar {
  char: string
  romaji: string
  script: Script
  row: RowId
  /** Gojūon column 0..4 (a, i, u, e, o). */
  col: number
  /** Expected stroke count; must equal the KanjiVG count (checked by scripts/build-kana-data.ts). */
  strokes: number
  /** Other stroke counts accepted in Easy/Normal (common handwritten forms). */
  variants: number[]
}

export const ROWS: RowId[] = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n']

type Entry = [char: string, romaji: string, row: RowId, col: number, strokes: number, variants?: number[]]

const HIRAGANA: Entry[] = [
  ['あ', 'a', 'a', 0, 3], ['い', 'i', 'a', 1, 2], ['う', 'u', 'a', 2, 2], ['え', 'e', 'a', 3, 2], ['お', 'o', 'a', 4, 3],
  ['か', 'ka', 'ka', 0, 3], ['き', 'ki', 'ka', 1, 4, [3]], ['く', 'ku', 'ka', 2, 1], ['け', 'ke', 'ka', 3, 3], ['こ', 'ko', 'ka', 4, 2],
  ['さ', 'sa', 'sa', 0, 3, [2]], ['し', 'shi', 'sa', 1, 1], ['す', 'su', 'sa', 2, 2], ['せ', 'se', 'sa', 3, 3], ['そ', 'so', 'sa', 4, 1, [2]],
  ['た', 'ta', 'ta', 0, 4], ['ち', 'chi', 'ta', 1, 2], ['つ', 'tsu', 'ta', 2, 1], ['て', 'te', 'ta', 3, 1], ['と', 'to', 'ta', 4, 2],
  ['な', 'na', 'na', 0, 4], ['に', 'ni', 'na', 1, 3], ['ぬ', 'nu', 'na', 2, 2], ['ね', 'ne', 'na', 3, 2], ['の', 'no', 'na', 4, 1],
  ['は', 'ha', 'ha', 0, 3], ['ひ', 'hi', 'ha', 1, 1], ['ふ', 'fu', 'ha', 2, 4, [3]], ['へ', 'he', 'ha', 3, 1], ['ほ', 'ho', 'ha', 4, 4],
  ['ま', 'ma', 'ma', 0, 3], ['み', 'mi', 'ma', 1, 2], ['む', 'mu', 'ma', 2, 3], ['め', 'me', 'ma', 3, 2], ['も', 'mo', 'ma', 4, 3],
  ['や', 'ya', 'ya', 0, 3], ['ゆ', 'yu', 'ya', 2, 2], ['よ', 'yo', 'ya', 4, 2],
  ['ら', 'ra', 'ra', 0, 2], ['り', 'ri', 'ra', 1, 2, [1]], ['る', 'ru', 'ra', 2, 1], ['れ', 're', 'ra', 3, 2], ['ろ', 'ro', 'ra', 4, 1],
  ['わ', 'wa', 'wa', 0, 2], ['を', 'wo', 'wa', 4, 3],
  ['ん', 'n', 'n', 0, 1],
]

const KATAKANA: Entry[] = [
  ['ア', 'a', 'a', 0, 2], ['イ', 'i', 'a', 1, 2], ['ウ', 'u', 'a', 2, 3], ['エ', 'e', 'a', 3, 3], ['オ', 'o', 'a', 4, 3],
  ['カ', 'ka', 'ka', 0, 2], ['キ', 'ki', 'ka', 1, 3], ['ク', 'ku', 'ka', 2, 2], ['ケ', 'ke', 'ka', 3, 3], ['コ', 'ko', 'ka', 4, 2],
  ['サ', 'sa', 'sa', 0, 3], ['シ', 'shi', 'sa', 1, 3], ['ス', 'su', 'sa', 2, 2], ['セ', 'se', 'sa', 3, 2], ['ソ', 'so', 'sa', 4, 2],
  ['タ', 'ta', 'ta', 0, 3], ['チ', 'chi', 'ta', 1, 3], ['ツ', 'tsu', 'ta', 2, 3], ['テ', 'te', 'ta', 3, 3], ['ト', 'to', 'ta', 4, 2],
  ['ナ', 'na', 'na', 0, 2], ['ニ', 'ni', 'na', 1, 2], ['ヌ', 'nu', 'na', 2, 2], ['ネ', 'ne', 'na', 3, 4], ['ノ', 'no', 'na', 4, 1],
  ['ハ', 'ha', 'ha', 0, 2], ['ヒ', 'hi', 'ha', 1, 2], ['フ', 'fu', 'ha', 2, 1], ['ヘ', 'he', 'ha', 3, 1], ['ホ', 'ho', 'ha', 4, 4],
  ['マ', 'ma', 'ma', 0, 2], ['ミ', 'mi', 'ma', 1, 3], ['ム', 'mu', 'ma', 2, 2], ['メ', 'me', 'ma', 3, 2], ['モ', 'mo', 'ma', 4, 3],
  ['ヤ', 'ya', 'ya', 0, 2], ['ユ', 'yu', 'ya', 2, 2], ['ヨ', 'yo', 'ya', 4, 3],
  ['ラ', 'ra', 'ra', 0, 2], ['リ', 'ri', 'ra', 1, 2], ['ル', 'ru', 'ra', 2, 2], ['レ', 're', 'ra', 3, 1], ['ロ', 'ro', 'ra', 4, 3],
  ['ワ', 'wa', 'wa', 0, 2], ['ヲ', 'wo', 'wa', 4, 3],
  ['ン', 'n', 'n', 0, 2],
]

const toKana = (script: Script) => ([char, romaji, row, col, strokes, variants = []]: Entry): KanaChar =>
  ({ char, romaji, script, row, col, strokes, variants })

export const ALL_KANA: KanaChar[] = [...HIRAGANA.map(toKana('hiragana')), ...KATAKANA.map(toKana('katakana'))]

export const kanaByScript = (script: Script): KanaChar[] => ALL_KANA.filter(k => k.script === script)
export const findKana = (char: string): KanaChar | undefined => ALL_KANA.find(k => k.char === char)
