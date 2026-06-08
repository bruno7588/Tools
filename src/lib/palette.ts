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
  return Array.from({ length: count }, (_, i) => ({
    id: uid(),
    type: Math.random() < 0.5 ? 'circle' : 'square',
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
