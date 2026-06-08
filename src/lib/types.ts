export type ShapeType = 'circle' | 'square'

export interface Shape {
  id: string
  type: ShapeType
  /** center x, normalized 0..1 of canvas width */
  x: number
  /** center y, normalized 0..1 of canvas height */
  y: number
  /** size as a fraction of the canvas min dimension */
  size: number
  color: string
  /** rotation in degrees (visible on squares) */
  rotation: number
  /** corner roundness for squares, 0 (sharp) .. 1 (fully rounded) */
  radius: number
  /** 0..1 */
  opacity: number
  /** per-shape animation phase so they drift out of sync */
  phase: number
}

export type AspectKey = 'wide' | 'portrait'

export interface Settings {
  aspect: AspectKey
  background: string
  /** 0..100, mapped to a fraction of the min dimension */
  blur: number
  /** grain opacity, 0..1 */
  grain: number
  /** grain magnification, 1..6 */
  grainScale: number
}

export const ASPECTS: Record<AspectKey, { w: number; h: number; label: string }> = {
  wide: { w: 16, h: 9, label: '16:9' },
  portrait: { w: 9, h: 16, label: '9:16' },
}
