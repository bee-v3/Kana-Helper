export interface KanaStroke{
  svgstep: number;   // The step in writing a kana character that this stroke corresponds to
  strokepath: Path2D;   // Path2D containing data for the static stroke path of the kana
  animationpath: Path2D;     // Path2D containing data for the stroke (used for animating the strokes of a character in order)
}
