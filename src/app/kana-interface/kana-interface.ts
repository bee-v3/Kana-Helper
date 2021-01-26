export interface Kana{
  location: string;   // 0 for Hiragana, 1 for Katakana, 2 for Kanji (currently unused)
  fname: string;  // File name of the corresponding svg file
  name: string;   // Name name of kana (matches svg prefix)
  jpn: string;     // Character in Japanese writing (to display on screen)
}
