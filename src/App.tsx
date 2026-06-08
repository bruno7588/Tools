import { useCallback, useEffect, useState } from 'react'
import ControlsPanel from './components/ControlsPanel'
import MeshCanvas from './components/MeshCanvas'
import { makeShapes, randomPalette, randomShape, uid } from './lib/palette'
import { makeNoiseCanvas, renderMesh, toCss } from './lib/render'
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
  const [shapes, setShapes] = useState<Shape[]>(() => makeShapes(5))
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1800)
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
    const count = 4 + Math.floor(Math.random() * 3)
    setShapes(makeShapes(count))
    setSelectedId(null)
  }, [])

  const clear = useCallback(() => {
    setShapes([])
    setSelectedId(null)
  }, [])

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

  // Delete the selected shape with the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
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
        <span className="hint">Drag shapes on the canvas · Delete key removes selected</span>
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
        />
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
