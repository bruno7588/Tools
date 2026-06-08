interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (v: number) => void
}

export default function Slider({ label, value, min, max, step = 1, suffix = '', onChange }: Props) {
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{label}</span>
        <span className="slider-value">
          {Math.round(value * 100) / 100}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}
