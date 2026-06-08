import { useCallback, useEffect, useMemo, useRef } from 'react'
import { drawGrain, drawShapes, makeNoiseCanvas } from '../lib/render'
import { ASPECTS } from '../lib/types'
import type { Settings, Shape } from '../lib/types'

interface Props {
  shapes: Shape[]
  settings: Settings
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMoveShape: (id: string, x: number, y: number) => void
}

/** Cap on the blurred shape layer's longest side — blur cost scales with this. */
const MESH_QUALITY = 700

export default function MeshCanvas({ shapes, settings, selectedId, onSelect, onMoveShape }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noise = useMemo(() => makeNoiseCanvas(), [])
  const offscreen = useMemo(() => document.createElement('canvas'), [])
  const draggingRef = useRef<string | null>(null)
  const rafRef = useRef(0)

  // Keep the latest props available to the rAF paint without re-subscribing.
  const stateRef = useRef({ shapes, settings, selectedId })
  stateRef.current = { shapes, settings, selectedId }

  const paint = useCallback(() => {
    rafRef.current = 0
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const { shapes, settings, selectedId } = stateRef.current

    const { w, h } = ASPECTS[settings.aspect]
    let dispW = wrap.clientWidth
    let dispH = (dispW * h) / w
    if (dispH > wrap.clientHeight) {
      dispH = wrap.clientHeight
      dispW = (dispH * w) / h
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const bw = Math.round(dispW * dpr)
    const bh = Math.round(dispH * dpr)
    if (bw <= 0 || bh <= 0) return

    // Only reallocate the backing store when the size actually changes.
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.style.width = `${dispW}px`
      canvas.style.height = `${dispH}px`
      canvas.width = bw
      canvas.height = bh
    }

    // 1. Blurred shapes at reduced resolution (the expensive part).
    const q = Math.min(1, MESH_QUALITY / Math.max(bw, bh))
    const lw = Math.max(1, Math.round(bw * q))
    const lh = Math.max(1, Math.round(bh * q))
    if (offscreen.width !== lw || offscreen.height !== lh) {
      offscreen.width = lw
      offscreen.height = lh
    }
    const octx = offscreen.getContext('2d')!
    octx.setTransform(1, 0, 0, 1, 0, 0)
    drawShapes(octx, lw, lh, shapes, settings)

    // 2. Composite upscaled mesh, then crisp grain + selection ring at full res.
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, bw, bh)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(offscreen, 0, 0, lw, lh, 0, 0, bw, bh)
    drawGrain(ctx, bw, bh, settings, noise)

    if (selectedId) {
      const s = shapes.find((x) => x.id === selectedId)
      if (s) {
        const minDim = Math.min(bw, bh)
        ctx.save()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.lineWidth = 1.5 * dpr
        ctx.setLineDash([6 * dpr, 5 * dpr])
        ctx.beginPath()
        ctx.arc(s.x * bw, s.y * bh, Math.max(s.size * minDim * 0.6 * 0.45, 14 * dpr), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }
  }, [noise, offscreen])

  const requestDraw = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(paint)
  }, [paint])

  // Observe container resize (set up once).
  useEffect(() => {
    const wrap = wrapRef.current!
    const ro = new ResizeObserver(() => requestDraw())
    ro.observe(wrap)
    return () => {
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [requestDraw])

  // Coalesce all state-driven redraws into a single rAF.
  useEffect(() => {
    requestDraw()
  }, [shapes, settings, selectedId, requestDraw])

  const pickShape = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const minDim = Math.min(rect.width, rect.height)
    // Topmost shape first.
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i]
      const cx = s.x * rect.width
      const cy = s.y * rect.height
      const hit = Math.max(s.size * minDim * 0.45, 16)
      if (Math.hypot(px - cx, py - cy) <= hit) return s.id
    }
    return null
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    const id = pickShape(e.clientX, e.clientY)
    onSelect(id)
    if (id) {
      draggingRef.current = id
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const id = draggingRef.current
    if (!id) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    onMoveShape(id, x, y)
  }

  const endDrag = (e: React.PointerEvent) => {
    if (draggingRef.current) {
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    draggingRef.current = null
  }

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="mesh-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </div>
  )
}
