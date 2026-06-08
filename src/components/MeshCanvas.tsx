import { useEffect, useMemo, useRef } from 'react'
import { makeNoiseCanvas, renderMesh } from '../lib/render'
import { ASPECTS } from '../lib/types'
import type { Settings, Shape } from '../lib/types'

interface Props {
  shapes: Shape[]
  settings: Settings
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMoveShape: (id: string, x: number, y: number) => void
}

export default function MeshCanvas({ shapes, settings, selectedId, onSelect, onMoveShape }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noise = useMemo(() => makeNoiseCanvas(), [])
  const draggingRef = useRef<string | null>(null)

  // Keep the latest props available to the rAF loop without re-subscribing it.
  const stateRef = useRef({ shapes, settings, selectedId })
  stateRef.current = { shapes, settings, selectedId }

  useEffect(() => {
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const { shapes, settings, selectedId } = stateRef.current
      const { w, h } = ASPECTS[settings.aspect]
      const maxW = wrap.clientWidth
      const maxH = wrap.clientHeight
      let dispW = maxW
      let dispH = (maxW * h) / w
      if (dispH > maxH) {
        dispH = maxH
        dispW = (maxH * w) / h
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.style.width = `${dispW}px`
      canvas.style.height = `${dispH}px`
      canvas.width = Math.round(dispW * dpr)
      canvas.height = Math.round(dispH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      renderMesh(ctx, dispW, dispH, shapes, settings, noise, {
        interactive: true,
        selectedId,
      })
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [shapes, settings, selectedId, noise])

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
