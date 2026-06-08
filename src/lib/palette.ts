import { hslToHex } from './color'
import type { Shape } from './types'

const rand = (min: number, max: number) => min + Math.random() * (max - min)

let counter = 0
export const uid = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`

/** Harmonious color schemes expressed as hue offsets from a random base hue. */
const SCHEMES: number[][] = [
  [0, 30, 60, 90, 120], // analogous
  [0, 180, 30, 210, 60], // complementary split
  [0, 120, 240, 60, 300], // triad+
  [0, 25, 200, 220, 45], // accented analogous
]

export function randomPalette(count: number): string[] {
  const base = Math.floor(Math.random() * 360)
  const scheme = SCHEMES[Math.floor(Math.random() * SCHEMES.length)]
  return Array.from({ length: count }, (_, i) => {
    const hue = (base + scheme[i % scheme.length] + rand(-12, 12) + 360) % 360
    return hslToHex(hue, rand(62, 88), rand(48, 66))
  })
}

export function makeShapes(count: number, palette = randomPalette(count)): Shape[] {
  const types: Shape['type'][] = Array.from({ length: count }, () =>
    Math.random() < 0.5 ? 'circle' : 'square',
  )
  // Guarantee a mix of circles and squares when there's more than one shape.
  if (count > 1 && types.every((t) => t === types[0])) {
    const flip = Math.floor(Math.random() * count)
    types[flip] = types[flip] === 'circle' ? 'square' : 'circle'
  }
  return types.map((type, i) => ({
    id: uid(),
    type,
    x: rand(0.15, 0.85),
    y: rand(0.15, 0.85),
    size: rand(0.45, 0.95),
    color: palette[i % palette.length],
    rotation: rand(0, 90),
    radius: rand(0, 0.6),
    opacity: rand(0.75, 1),
    phase: rand(0, Math.PI * 2),
  }))
}

/** Opening state: 1 circle + 2 squares in a balanced arrangement. */
export function defaultShapes(): Shape[] {
  const palette = randomPalette(3)
  const layout: { type: Shape['type']; x: number; y: number; size: number }[] = [
    { type: 'circle', x: 0.32, y: 0.34, size: 0.8 },
    { type: 'square', x: 0.72, y: 0.42, size: 0.72 },
    { type: 'square', x: 0.5, y: 0.74, size: 0.7 },
  ]
  return layout.map((l, i) => ({
    id: uid(),
    type: l.type,
    x: l.x,
    y: l.y,
    size: l.size,
    color: palette[i],
    rotation: i * 18,
    radius: 0.25,
    opacity: 0.9,
    phase: 0,
  }))
}

export function randomShape(type: Shape['type'], color: string): Shape {
  return {
    id: uid(),
    type,
    x: rand(0.25, 0.75),
    y: rand(0.25, 0.75),
    size: rand(0.5, 0.85),
    color,
    rotation: rand(0, 90),
    radius: 0.2,
    opacity: rand(0.8, 1),
    phase: rand(0, Math.PI * 2),
  }
}
