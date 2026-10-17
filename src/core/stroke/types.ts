/** A point in KanjiVG viewBox units (0..109). */
export type Point = { x: number; y: number }
export type Stroke = Point[]
export type Level = 'easy' | 'normal' | 'strict'
export type Issue = 'shape' | 'direction' | 'order' | 'missing' | 'extra'
