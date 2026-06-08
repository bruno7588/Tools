import Slider from './Slider'
import { ASPECTS } from '../lib/types'
import type { AspectKey, Settings, Shape, ShapeType } from '../lib/types'

interface Props {
  shapes: Shape[]
  settings: Settings
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdateShape: (id: string, patch: Partial<Shape>) => void
  onAddShape: (type: ShapeType) => void
  onDeleteShape: (id: string) => void
  onUpdateSettings: (patch: Partial<Settings>) => void
  onRandomize: () => void
  onClear: () => void
  onCopyCss: () => void
  onExportPng: () => void
}

export default function ControlsPanel(props: Props) {
  const {
    shapes,
    settings,
    selectedId,
    onSelect,
    onUpdateShape,
    onAddShape,
    onDeleteShape,
    onUpdateSettings,
    onRandomize,
    onClear,
    onCopyCss,
    onExportPng,
  } = props

  const selected = shapes.find((s) => s.id === selectedId) ?? null

  return (
    <aside className="panel">
      <section className="group">
        <h2>Canvas</h2>
        <div className="seg">
          {(Object.keys(ASPECTS) as AspectKey[]).map((key) => (
            <button
              key={key}
              className={settings.aspect === key ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onUpdateSettings({ aspect: key })}
            >
              {ASPECTS[key].label}
            </button>
          ))}
        </div>
        <label className="row">
          <span>Background</span>
          <input
            type="color"
            value={settings.background}
            onChange={(e) => onUpdateSettings({ background: e.target.value })}
          />
        </label>
      </section>

      <section className="group">
        <h2>Shapes</h2>
        <div className="shape-list">
          {shapes.map((s) => (
            <div
              key={s.id}
              className={s.id === selectedId ? 'shape-chip active' : 'shape-chip'}
              onClick={() => onSelect(s.id)}
            >
              <span
                className={s.type === 'circle' ? 'swatch round' : 'swatch'}
                style={{ background: s.color }}
              />
              <span className="shape-name">{s.type}</span>
              <button
                className="icon-btn"
                title="Delete shape"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteShape(s.id)
                }}
              >
                ×
              </button>
            </div>
          ))}
          {shapes.length === 0 && <p className="empty">No shapes yet. Add one below.</p>}
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => onAddShape('circle')}>
            Add Circle
          </button>
          <button className="btn" onClick={() => onAddShape('square')}>
            Add Square
          </button>
        </div>

        {selected && (
          <div className="sub">
            <div className="seg">
              <button
                className={selected.type === 'circle' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => onUpdateShape(selected.id, { type: 'circle' })}
              >
                Circle
              </button>
              <button
                className={selected.type === 'square' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => onUpdateShape(selected.id, { type: 'square' })}
              >
                Square
              </button>
            </div>
            <label className="row">
              <span>Color</span>
              <input
                type="color"
                value={selected.color}
                onChange={(e) => onUpdateShape(selected.id, { color: e.target.value })}
              />
            </label>
            <Slider
              label="Size"
              value={selected.size}
              min={0.1}
              max={1.4}
              step={0.01}
              onChange={(v) => onUpdateShape(selected.id, { size: v })}
            />
            <Slider
              label="Opacity"
              value={selected.opacity}
              min={0.1}
              max={1}
              step={0.01}
              onChange={(v) => onUpdateShape(selected.id, { opacity: v })}
            />
            {selected.type === 'square' && (
              <>
                <Slider
                  label="Rotation"
                  value={selected.rotation}
                  min={0}
                  max={90}
                  step={1}
                  suffix="°"
                  onChange={(v) => onUpdateShape(selected.id, { rotation: v })}
                />
                <Slider
                  label="Roundness"
                  value={selected.radius}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => onUpdateShape(selected.id, { radius: v })}
                />
              </>
            )}
          </div>
        )}
      </section>

      <section className="group">
        <h2>Effects</h2>
        <Slider
          label="Blur"
          value={settings.blur}
          min={0}
          max={100}
          onChange={(v) => onUpdateSettings({ blur: v })}
        />
        <Slider
          label="Grain"
          value={settings.grain}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onUpdateSettings({ grain: v })}
        />
        <Slider
          label="Grain Size"
          value={settings.grainScale}
          min={1}
          max={6}
          step={0.5}
          suffix="×"
          onChange={(v) => onUpdateSettings({ grainScale: v })}
        />
      </section>

      <section className="group">
        <h2>Overlay</h2>
        <label className="row">
          <span>Color</span>
          <input
            type="color"
            value={settings.overlayColor}
            onChange={(e) => onUpdateSettings({ overlayColor: e.target.value })}
          />
        </label>
        <Slider
          label="Opacity"
          value={settings.overlayOpacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onUpdateSettings({ overlayOpacity: v })}
        />
      </section>

      <section className="group">
        <h2>Generate</h2>
        <div className="btn-row">
          <button className="btn primary" onClick={onRandomize}>
            Randomize
          </button>
          <button className="btn ghost" onClick={onClear}>
            Clear
          </button>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onCopyCss}>
            Copy CSS
          </button>
          <button className="btn" onClick={onExportPng}>
            Download PNG
          </button>
        </div>
      </section>
    </aside>
  )
}
