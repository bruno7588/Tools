import type { Shape } from './types'

const rand = (min: number, max: number) => min + Math.random() * (max - min)

let counter = 0
export const uid = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`

/**
 * Brand color system — vibrant/usable tones from each ramp plus the accent
 * colors. The near-white and near-black ends are intentionally omitted: they
 * make washed-out or muddy mesh blobs.
 */
export const BRAND_COLORS: string[] = [
  // Teal
  '#66E9F9', '#33E2F7', '#00CEE6', '#00AFC4', '#008393',
  // Gold
  '#FFE4AF', '#FFCF74', '#FFBB38', '#EDA30D',
  // Green
  '#A3DDBC', '#5DC389', '#18A957', '#11763D',
  // Orange
  '#FFC988', '#FFB760', '#FFA538', '#E88206',
  // Pink / Red
  '#F2A2B3', '#E95C7B', '#DF1642', '#9C0F2E',
  // Accents
  '#8158EC', '#9B55C9', '#6368DB', '#FA715F', '#2A90D8',
]

/** Pick `count` distinct brand colors at random (cycles if count exceeds pool). */
export function randomPalette(count: number): string[] {
  const pool = [...BRAND_COLORS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return Array.from({ length: count }, (_, i) => pool[i % pool.length])
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
