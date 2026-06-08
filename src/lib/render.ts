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

/** Flat color tint laid over the shapes (below the grain). */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  settings: Settings,
) {
  if (settings.overlayOpacity <= 0) return
  ctx.save()
  ctx.globalAlpha = settings.overlayOpacity
  ctx.fillStyle = settings.overlayColor
  ctx.fillRect(0, 0, W, H)
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
  drawOverlay(ctx, W, H, settings)
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

/**
 * Resolution-independent SVG of the mesh. Blur uses feGaussianBlur and grain
 * uses feTurbulence, so it renders identically at any size in a browser.
 * (Design tools may ignore SVG filters — use the PNG export for those.)
 */
export function toSvg(shapes: Shape[], settings: Settings, W: number, H: number): string {
  const minDim = Math.min(W, H)
  const blurPx = (settings.blur / 100) * 0.32 * minDim
  const n = (v: number) => v.toFixed(1)

  const defs: string[] = []
  const body: string[] = []

  for (const s of shapes) {
    const cx = s.x * W
    const cy = s.y * H
    const r = s.size * minDim * 0.6
    if (s.type === 'circle') {
      const id = `g-${s.id}`
      defs.push(
        `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(
          cy,
        )}" r="${n(r)}"><stop offset="0" stop-color="${s.color}" stop-opacity="${s.opacity}"/>` +
          `<stop offset="1" stop-color="${s.color}" stop-opacity="0"/></radialGradient>`,
      )
      body.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#${id})"/>`)
    } else {
      const side = r * 1.6
      const corner = Math.min(s.radius ?? 0, 1) * (side / 2)
      body.push(
        `<rect x="${n(cx - side / 2)}" y="${n(cy - side / 2)}" width="${n(side)}" height="${n(
          side,
        )}" rx="${n(corner)}" fill="${s.color}" fill-opacity="${s.opacity}" transform="rotate(${n(
          s.rotation,
        )} ${n(cx)} ${n(cy)})"/>`,
      )
    }
  }

  const blurred = blurPx > 0.2
  if (blurred) {
    defs.push(
      `<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${n(
        blurPx,
      )}"/></filter>`,
    )
  }

  const overlay =
    settings.overlayOpacity > 0
      ? `<rect width="${W}" height="${H}" fill="${settings.overlayColor}" fill-opacity="${settings.overlayOpacity}"/>`
      : ''

  let grain = ''
  if (settings.grain > 0) {
    const freq = (0.9 / settings.grainScale).toFixed(3)
    defs.push(
      `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`,
    )
    grain = `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="${settings.grain}" style="mix-blend-mode:overlay"/>`
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>${defs.join('')}</defs>` +
    `<rect width="${W}" height="${H}" fill="${settings.background}"/>` +
    `<g${blurred ? ' filter="url(#blur)"' : ''}>${body.join('')}</g>` +
    overlay +
    grain +
    `</svg>`
  )
}
