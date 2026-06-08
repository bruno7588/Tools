# Tools

A collection of small web tools. Built with Vite + React + TypeScript.

## Mesh Gradient Studio

A gradient generator that composes a **mesh of circular and square shapes** (no flat
linear gradients) and blends them with blur and film grain.

### Features
- **Shapes** — add/remove circles and squares, drag them around the canvas, recolor,
  resize, set opacity, and rotate squares.
- **Blur** — global blur blends the shapes into a soft mesh.
- **Grain / noise** — adjustable grain opacity and grain size for a modern, textured look.
- **Dynamic** — optional animation drifts the shapes with per-shape phase, with speed and
  drift controls.
- **Canvas** — square / 16:9 / 9:16 / 4:3 aspect presets and a background color.
- **Generate** — one-click harmonious palette randomization.
- **Export** — copy a layered `radial-gradient` CSS snippet, or download a 2000px PNG
  (rendered from the exact same engine as the live preview).

### Architecture
The live preview and the PNG export share a single canvas renderer (`src/lib/render.ts`),
so what you see is what you export. Shapes and sizes are expressed relative to the canvas
min dimension, making the look resolution-independent.

```
src/
├── App.tsx                  # state + export logic
├── components/
│   ├── MeshCanvas.tsx       # canvas preview, drag-to-move, selection
│   ├── ControlsPanel.tsx    # sidebar controls
│   └── Slider.tsx
└── lib/
    ├── render.ts            # renderMesh + grain + CSS export (single source of truth)
    ├── palette.ts           # harmonious palettes + shape factories
    ├── color.ts             # hex/rgba/hsl helpers
    └── types.ts
```

## Setup

```bash
npm install
npm run dev      # start dev server (http://localhost:5174)
npm run build    # type-check + production build
npm run preview  # preview the production build
```
