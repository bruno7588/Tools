import { useCallback, useEffect, useRef, useState } from 'react'
import ControlsPanel from './components/ControlsPanel'
import MeshCanvas from './components/MeshCanvas'
import { defaultShapes, makeShapes, randomPalette, randomShape, uid } from './lib/palette'
import { makeNoiseCanvas, renderMesh, toCss, toSvg } from './lib/render'
import { ASPECTS } from './lib/types'
import type { Settings, Shape, ShapeType } from './lib/types'

const DEFAULT_SETTINGS: Settings = {
  aspect: 'wide',
  background: '#0b0d17',
  blur: 55,
  grain: 0.12,
  grainScale: 2,
  overlayColor: '#000000',
  overlayOpacity: 0,
}

export default function App() {
  const [shapes, setShapes] = useState<Shape[]>(() => defaultShapes())
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null)
  const toastTimer = useRef<number>(0)
  // Latest pending undo, readable from the keyboard handler.
  const undoRef = useRef<(() => void) | null>(null)

  const flash = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current)
    setToast({ msg, undo })
    undoRef.current = undo ?? null
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      undoRef.current = null
    }, undo ? 7000 : 1800)
  }, [])

  const updateShape = useCallback((id: string, patch: Partial<Shape>) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const moveShape = useCallback((id: string, x: number, y: number) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)))
  }, [])

  const addShape = useCallback((type: ShapeType) => {
    const color = randomPalette(1)[0]
    const shape = { ...randomShape(type, color), id: uid() }
    setShapes((prev) => [...prev, shape])
    setSelectedId(shape.id)
  }, [])

  const deleteShape = useCallback(
    (id: string) => {
      setShapes((prev) => prev.filter((s) => s.id !== id))
      setSelectedId((cur) => (cur === id ? null : cur))
    },
    [],
  )

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const randomize = useCallback(() => {
    setShapes(makeShapes(3))
    setSelectedId(null)
  }, [])

  const clear = useCallback(() => {
    if (shapes.length === 0) return
    const snapshot = shapes
    setShapes([])
    setSelectedId(null)
    flash(`Cleared ${snapshot.length} shape${snapshot.length === 1 ? '' : 's'}`, () => {
      setShapes(snapshot)
      window.clearTimeout(toastTimer.current)
      setToast(null)
      undoRef.current = null
    })
  }, [shapes, flash])

  const copyCss = useCallback(async () => {
    const css = toCss(shapes, settings)
    try {
      await navigator.clipboard.writeText(css)
      flash('CSS copied to clipboard')
    } catch {
      flash('Copy failed — clipboard blocked')
    }
  }, [shapes, settings, flash])

  const exportPng = useCallback(() => {
    const { w, h } = ASPECTS[settings.aspect]
    const long = 1536
    const W = w >= h ? long : Math.round((long * w) / h)
    const H = h >= w ? long : Math.round((long * h) / w)
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    renderMesh(ctx, W, H, shapes, settings, makeNoiseCanvas(), { interactive: false })
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mesh-gradient-${W}x${H}.png`
      a.click()
      URL.revokeObjectURL(url)
      flash('PNG downloaded')
    }, 'image/png')
  }, [shapes, settings, flash])

  const exportSvg = useCallback(() => {
    const { w, h } = ASPECTS[settings.aspect]
    const long = 1536
    const W = w >= h ? long : Math.round((long * w) / h)
    const H = h >= w ? long : Math.round((long * h) / w)
    const svg = toSvg(shapes, settings, W, H)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mesh-gradient-${W}x${H}.svg`
    a.click()
    URL.revokeObjectURL(url)
    flash('SVG downloaded')
  }, [shapes, settings, flash])

  const exportJson = useCallback(() => {
    const data = JSON.stringify({ version: 1, settings, shapes }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mesh-gradient.json'
    a.click()
    URL.revokeObjectURL(url)
    flash('Spec exported (JSON)')
  }, [shapes, settings, flash])

  const importJson = useCallback(
    (file: File) => {
      const clamp01 = (v: unknown) => Math.min(1, Math.max(0, Number(v) || 0))
      const numOr = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d)
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result))
          if (Array.isArray(data.shapes)) {
            setShapes(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.shapes.map((s: any) => ({
                id: typeof s.id === 'string' ? s.id : uid(),
                type: s.type === 'square' ? 'square' : 'circle',
                x: clamp01(s.x),
                y: clamp01(s.y),
                size: numOr(s.size, 0.7),
                color: typeof s.color === 'string' ? s.color : '#888888',
                rotation: numOr(s.rotation, 0),
                radius: clamp01(s.radius),
                opacity: numOr(s.opacity, 1),
                phase: numOr(s.phase, 0),
              })),
            )
          }
          if (data.settings && typeof data.settings === 'object') {
            setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
          }
          setSelectedId(null)
          flash('Spec imported')
        } catch {
          flash('Import failed — invalid JSON')
        }
      }
      reader.readAsText(file)
    },
    [flash],
  )

  // Keyboard: Delete removes the selected shape, ⌘/Ctrl+Z undoes a Clear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && undoRef.current) {
        e.preventDefault()
        undoRef.current()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !inField) {
        deleteShape(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, deleteShape])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Mesh Gradient Studio
        </div>
        <span className="hint">Drag shapes on the canvas · Delete removes selected · ⌘Z undoes Clear</span>
      </header>
      <main className="layout">
        <MeshCanvas
          shapes={shapes}
          settings={settings}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMoveShape={moveShape}
        />
        <ControlsPanel
          shapes={shapes}
          settings={settings}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateShape={updateShape}
          onAddShape={addShape}
          onDeleteShape={deleteShape}
          onUpdateSettings={updateSettings}
          onRandomize={randomize}
          onClear={clear}
          onCopyCss={copyCss}
          onExportPng={exportPng}
          onExportSvg={exportSvg}
          onExportJson={exportJson}
          onImportJson={importJson}
        />
      </main>
      {toast && (
        <div className="toast">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button className="toast-action" onClick={() => toast.undo!()}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
