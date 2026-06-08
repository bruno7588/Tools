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
 * Background + blurred shapes only. This is the expensive layer, so the live
 * preview renders it into a small offscreen canvas and upscales the result —
 * cheap, and indistinguishable because it's heavily blurred anyway.
 */
export function drawShapes(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  shapes: Shape[],
  settings: Settings,
) {
  const minDim = Math.min(W, H)

  // Background — drawn unfiltered so blur never eats into the edges.
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = settings.background
  ctx.fillRect(0, 0, W, H)

  const blurPx = (settings.blur / 100) * 0.32 * minDim
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
  }
  ctx.restore()
}

/**
 * Grain overlay, drawn unblurred over the composited mesh. Scaled relative to
 * the image size so it reads the same at preview and export resolutions.
 */
export function drawGrain(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  settings: Settings,
  noise: HTMLCanvasElement,
) {
  if (settings.grain <= 0) return
  ctx.save()
  ctx.globalAlpha = settings.grain
  ctx.globalCompositeOperation = 'overlay'
  const scale = settings.grainScale * (Math.max(W, H) / 1500)
  ctx.scale(scale, scale)
  const pattern = ctx.createPattern(noise, 'repeat')
  if (pattern) {
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, W / scale, H / scale)
  }
  ctx.restore()
}

/**
 * Full-quality, single-pass render (used for PNG export). `W`/`H` are logical
 * pixels — the caller handles any devicePixelRatio scaling.
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
  drawShapes(ctx, W, H, shapes, settings)
  drawGrain(ctx, W, H, settings, noise)

  if (opts.interactive && opts.selectedId) {
    const s = shapes.find((x) => x.id === opts.selectedId)
    if (s) {
      const minDim = Math.min(W, H)
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 5])
      ctx.beginPath()
      ctx.arc(s.x * W, s.y * H, Math.max(s.size * minDim * 0.6 * 0.45, 14), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
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
