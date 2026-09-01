# Radial Field Shape Generator

## Overview

A single-page HTML/JS generative art tool. No framework, no build step. Uses p5.js for canvas
drawing and Perlin noise. Produces radial compositions by splitting the canvas into two regions
via a noise "Breakup Field", filling each region with an independent pattern layer, and optionally
tracing the field boundary with a marching-squares contour line.

Exportable as: static SVG, animated SVG, WebM video, PNG.

---

## File Structure

```
index.html    ← HTML + CSS
script.js     ← all rendering, controls, export logic
```

Dependencies loaded via CDN:
- **p5.js** — canvas drawing + Perlin `noise()`

SVG is hand-built (not p5.svg). Every draw call that produces output also calls a `record*()`
function that appends an SVG element string to `svgLines[]`.

---

## Architecture

### Controls system

All parameters live in a `controls` dict:
```js
controls = {
  paramId: { value: <default>, format: (v) => <display string> },
  ...
}
```

`bindControls()` wires each HTML input to its `controls` entry and calls `update()` immediately to
initialize. `readParams()` snapshots `controls` into a plain params object for use in rendering.

### Render pipeline

```
draw()
  → applyAnimationParams(params)   // mutates params for current frame
  → renderArtwork(params)
      → drawShapeLayer(..., region="visible")   // Shape 1 in field-visible area
      → drawShapeLayer(..., region="empty")     // Shape 2 in field-empty area
      → drawNoiseContour(...)                    // marching-squares boundary
```

---

## Breakup Field

The field assigns a scalar value 0–1 to every point in the annular region (between minRadius and
maxRadius). Points above the threshold are "visible"; below are "empty".

### Field blending

The primary field can be blended with a second field type using `fieldBlendType` and
`fieldBlendAmount`. At `0`, only the primary field is used. Higher values interpolate toward the
secondary field, using an offset seed so matching field types still produce a distinct result.

### Field bands

`fieldBands` can quantize the field into alternating visible/empty bands. A value of `1` keeps the
classic threshold split. Values above `1` divide the 0–1 field range into equal bands and alternate
which pattern layer receives each band. Contour rendering follows these band boundaries.

### Field types

| Type | Description |
|---|---|
| Perlin | Standard 2D Perlin noise mapped from polar coordinates |
| Radial | Noise varying primarily by radius (concentric band patterns) |
| Angular | Sine wave by angle, modulated with noise (petal/sector patterns) |
| Ripple | Radially-oscillating sine + angular noise wobble |
| Spiral | Angle + radius combined in a single sine argument |
| Mixed | Blend of all four via the Mix slider |
| Interference | Wave interference from two radial emitters |
| Checkerboard | Alternating angular/radial bands with softened noise |
| Ridged | Absolute-value noise producing sharp ridge islands |
| Whorled | Perlin field twisted progressively by radius |
| Product | Perlin multiplied by radial/angular envelopes |
| Voronoi | Cellular distance field from seeded points |
| Julia | Iterated complex field with fractal boundaries |
| Flow Field | Perlin sampled after short flow-field advection |
| Metaballs | Smooth merging blobs from seeded field points |
| Turbulence | Multi-octave absolute noise for rough stormy regions |
| Moire | Interference between rotated wave grids and rings |
| Cracks | Voronoi edge-distance field for fracture lines |
| Lobed SDF | Petal-like signed-distance radius field |
| Pinwheel | Twisted angular blades blended with turbulence |
| Superformula | Parametric radial shape family from flowers to rounded polygons |
| Gyroid | Periodic porous maze field from trigonometric surface slices |
| Rose Curve | Distance/fill field around polar rose curves |
| Fault Lines | Layered seeded half-plane cuts for geological regions |
| Triangular Lattice | Three-direction sine lattice for triangular/hexagonal breakup |
| Orbit Trap | Fractal orbit distance field with line and circle traps |

### Domain warping (Warp Strength)

Before evaluating the Perlin field, two offset noise samples displace the input coordinates:
```
wx = (noise(nx + 1.7, ny + 9.2) * 2 − 1) × warpStrength
wy = (noise(nx + 8.3, ny + 2.8) * 2 − 1) × warpStrength
result = noise(nx + wx, ny + wy)
```
At `warpStrength = 0` the field is plain Perlin. Higher values produce flowing, folded boundaries.
Only applied when `fieldType = "perlin"` (the other types use their own formulas).

### Field center offset (Offset X / Y)

The composition center controls radial clipping and pattern layout. The field offset controls only
the noise-space center relative to that composition center. Shifting the field center off-axis
creates asymmetric compositions where the two regions are unequally distributed within the domain.

---

## Composition

The composition center is fixed at the canvas center. Pattern generation, radial distance, and
clipping all use this centered origin.

The domain shape maps points back into the same min/max radius system, preserving the radial
language while changing the outer composition:

| Shape | Description |
|---|---|
| Circle | Original circular radius behavior |
| Square | Box-like radius with corners extending outward |
| Diamond | Rotated square radius with pointed cardinal edges |
| Superellipse | Rounded-square radius using a fourth-power superellipse |
| Flower | Petal-like radius based on angular frequency |

`domainRotation` rotates non-circular domains before the radius mapping is evaluated.

---

## Pattern Types

Both layers support the same twelve pattern types:

Shape 1, Shape 2, and the contour all default to 2px stroke weight and keep independent weight
controls in the UI.

| Type | Description |
|---|---|
| Lines | Parallel hatching at a given angle |
| Crosshatch | Two hatch passes at `angle` and `angle + 90°` |
| Dots | Hex-grid dot array (odd rows offset by `spacing/2`) |
| Dashes | Short line marks on the rotated pattern grid |
| Squares | Filled rotated squares sized from the layer weight |
| Waves | Hatching with a sinusoidal lateral offset per line |
| Chevrons | Repeated V marks aligned to the angle control |
| Asterisks | Three crossed strokes per grid point |
| Concentric Circles | Arc segments at radii `minRadius…maxRadius` step `spacing` |
| Radial Rays | Radial line segments stepping by angle |
| Cross Marks | Grid of `+` marks |
| Contour Flow | Short strokes aligned to the local breakup-field tangent |

### Hatch / wave / crosshatch implementation

Walk lines parallel to `direction = (cos angle, sin angle)` at offsets `±diagonal` in the normal
direction. For each line, walk along the direction axis and test `isPointInShapeRegion()`. Emit a
line segment when a contiguous run of in-region points ends.

### Dots — hex grid

The dot grid is rotated by `angle`. Rows run along the normal axis. Odd-indexed rows are shifted
by `spacing/2` along the direction axis, forming a hex (close-packed) layout.

### Concentric circles

Uses `buildRegionArcSegments()` which walks 0–2π at `ARC_SAMPLE_STEP = 0.01 rad`, collects
active/inactive runs, and returns arc start/end pairs. Full circles are split at π to keep arc
flags valid. Circular domains export true SVG arcs; shaped domains draw/export segmented domain
rings so concentric patterns follow the selected composition shape.

### Contour Flow

Samples the breakup field gradient around each grid point, rotates that gradient 90° to follow
the local contour tangent, then draws a short centered stroke clipped to the active layer region.
The layer angle rotates the tangent direction, so `0°` follows the field contour and `90°` points
across it. When the gradient is too flat or near the radius boundary, it falls back to the local
radial tangent.

---

## Animation

Two animation modes:

### Animate Field (seamless forward loop)
The noise offset orbits a circle in 2D noise space:
```
offset.x = cos(t / duration × 2π) × fieldLoopRadius
offset.y = sin(t / duration × 2π) × fieldLoopRadius
```
Because the orbit is closed, the end of the loop is identical to the start — no ping-pong, no
visible seam. This is the preferred animation mode.

### Animate Threshold (ping-pong — cosmetic limitation)
The threshold oscillates between `thresholdMin` and `thresholdMax` via a cosine ease:
```
eased = 0.5 − cos(phase × 2π) × 0.5
threshold = lerp(min, max, eased)
```
This ping-pongs. See **Seamless Threshold Loops** below for how to fix it.

---

## Seamless Threshold Loops (forward-only, no ping-pong)

The core problem: a scalar value that must return to its starting state at `t = duration` without
reversing direction has no simple closed-form solution with a single oscillator.

### Option A — Circular noise path (recommended)
Map time to a circle in noise space and sample threshold from it:
```js
const tx = Math.cos(phase) * THRESHOLD_LOOP_RADIUS;
const ty = Math.sin(phase) * THRESHOLD_LOOP_RADIUS;
params.noiseThreshold = lerp(min, max, noise(tx + seedX, ty + seedY));
```
- Seamless: `t=0` and `t=duration` are the same point on the circle → same noise output
- Forward-only: the path is a circle traversed in one direction
- Non-periodic character: the threshold wanders within [min, max] rather than doing a clean up-down
- One new parameter: `thresholdLoopRadius` (analogous to `fieldLoopRadius`)

### Option B — Tie threshold to field orbit phase
When Animate Field is on, derive the threshold from the current orbit angle instead of time:
```js
params.noiseThreshold = lerp(min, max, (Math.cos(fieldPhase) + 1) / 2);
```
Uses no extra parameters. The threshold oscillates once per field loop — which is still
ping-pong but at least stays in sync with the field motion.

### Option C — Sawtooth with smoothed shoulder
Ramp linearly from min → max, then apply a smooth step near the end to ease back toward min before
the hard cut:
```js
const raw = phase;  // 0–1
const eased = raw < 0.85 ? raw / 0.85 : smoothstep(1, 0, (raw - 0.85) / 0.15);
params.noiseThreshold = lerp(min, max, eased);
```
Not truly seamless at the cut point, but at low animation speeds it reads as forward motion.
Fails at high speeds or if the contour is very sharp.

**Recommendation:** implement Option A. It mirrors exactly how `animateField` already works, needs
one new slider (`Threshold Loop Radius`), and is trivially seamless.

---

## Export

### Static SVG
Collects `svgLines[]` during the last `draw()` call, wraps in `<svg>` boilerplate, triggers
download. Per-element `stroke` and `stroke-width` attributes (no shared `<style>`) to keep each
element self-contained.

### Animated SVG
Renders `animationFrames` frames by calling `renderArtwork()` with discrete time values. Each
frame becomes a `<g opacity>` group with an `<animate>` element using `calcMode="discrete"` —
CSS-free, universally supported. File size scales linearly with frame count × element count.

### WebM
Uses `canvas.elt.captureStream(30)` + `MediaRecorder`. Records for `animationDuration` seconds.
Falls back to an alert if `captureStream` or `MediaRecorder` is unavailable.

### PNG
`canvas.elt.toDataURL("image/png")` at the current pixel density (2× by default = 1600×1600px).

---

## Performance notes

- `noLoop()` + `redraw()` on slider change — no idle animation cost.
- When animation is enabled, `loop()` runs at the browser's rAF rate.
- Hatch/dot/crossMark patterns scan a full `±diagonal` grid every frame — no caching. At small
  spacing values (≤5px) on complex fields this can be slow.
- Animated SVG export re-renders all frames synchronously on the main thread; the browser will
  appear frozen for large frame counts (>32) or complex scenes.
- `FILL_SAMPLE_STEP = 4` controls hatch line resolution. Decreasing it improves quality at the
  cost of performance.
