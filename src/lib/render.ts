import { hexToRgba } from './color'
import type { Settings, Shape } from './types'

/** A small tile of per-pixel grayscale noise, tiled at render time. */
export function makeNoiseCanvas(size = 180): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export interface RenderOpts {
  interactive?: boolean
  selectedId?: string | null
}

/**
 * Renders the full mesh into `ctx`. `W`/`H` are logical pixels — the caller is
 * responsible for any devicePixelRatio scaling. Blur and sizes are expressed
 * relative to the min dimension so the look is resolution-independent.
 */
export function renderMesh(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  shapes: Shape[],
  settings: Settings,
  noise: HTMLCanvasElement,
  opts: RenderOpts = {},
) {
  const minDim = Math.min(W, H)

  // Background — drawn unfiltered so blur never eats into the edges.
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = settings.background
  ctx.fillRect(0, 0, W, H)

  const blurPx = (settings.blur / 100) * 0.32 * minDim
  let selCenter: { x: number; y: number; r: number } | null = null

  ctx.save()
  ctx.filter = blurPx > 0.2 ? `blur(${blurPx}px)` : 'none'
  for (const s of shapes) {
    const cx = s.x * W
    const cy = s.y * H
    const r = s.size * minDim * 0.6

    if (s.type === 'circle') {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, hexToRgba(s.color, s.opacity))
      g.addColorStop(1, hexToRgba(s.color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const side = r * 1.6
      const corner = Math.min(s.radius ?? 0, 1) * (side / 2)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((s.rotation * Math.PI) / 180)
      ctx.fillStyle = hexToRgba(s.color, s.opacity)
      ctx.beginPath()
      if (corner > 0.5 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(-side / 2, -side / 2, side, side, corner)
      } else {
        ctx.rect(-side / 2, -side / 2, side, side)
      }
      ctx.fill()
      ctx.restore()
    }

    if (opts.interactive && s.id === opts.selectedId) {
      selCenter = { x: cx, y: cy, r }
    }
  }
  ctx.restore()

  // Grain overlay — magnified by scaling the context, never blurred.
  if (settings.grain > 0) {
    ctx.save()
    ctx.globalAlpha = settings.grain
    ctx.globalCompositeOperation = 'overlay'
    const scale = settings.grainScale
    ctx.scale(scale, scale)
    const pattern = ctx.createPattern(noise, 'repeat')
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.fillRect(0, 0, W / scale, H / scale)
    }
    ctx.restore()
  }

  // Selection ring (preview only, never exported).
  if (selCenter) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.arc(selCenter.x, selCenter.y, Math.max(selCenter.r * 0.45, 14), 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

/** Layered CSS radial-gradient approximation of the mesh (squares approximated). */
export function toCss(shapes: Shape[], settings: Settings): string {
  const layers = shapes.map((s) => {
    const sizePct = Math.round(s.size * 55)
    return `radial-gradient(circle at ${(s.x * 100).toFixed(1)}% ${(s.y * 100).toFixed(
      1,
    )}%, ${hexToRgba(s.color, s.opacity)} 0%, ${hexToRgba(s.color, 0)} ${sizePct}%)`
  })
  return [
    `background-color: ${settings.background};`,
    `background-image:\n  ${layers.join(',\n  ')};`,
  ].join('\n')
}
