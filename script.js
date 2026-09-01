const SIZE = 800;
const CANVAS_PIXEL_DENSITY = 2;
const ARC_SAMPLE_STEP = 0.01;
const CONTOUR_GRID_STEP = 5;
const FILL_SAMPLE_STEP = 4;
const FIXED_STROKE_WEIGHT = 2;
const ANIMATION_FRAME_COUNT = 60;
const TWO_PI_VALUE = Math.PI * 2;
const FIELD_TYPE_LABELS = {
  perlin: "Perlin",
  radial: "Radial",
  angular: "Angular",
  ripple: "Ripple",
  spiral: "Spiral",
  mixed: "Mixed",
  interference: "Interference",
  checkerboard: "Checkerboard",
  ridged: "Ridged",
  whorled: "Whorled",
  product: "Product",
  voronoi: "Voronoi",
  julia: "Julia",
  flowField: "Flow Field",
  metaballs: "Metaballs",
  turbulence: "Turbulence",
  moire: "Moire",
  cracks: "Cracks",
  lobedSdf: "Lobed SDF",
  pinwheel: "Pinwheel",
  superformula: "Superformula",
  gyroid: "Gyroid",
  roseCurve: "Rose Curve",
  faultLines: "Fault Lines",
  triangularLattice: "Triangular Lattice",
  orbitTrap: "Orbit Trap",
};
const FILL_PATTERN_LABELS = {
  lines: "Lines",
  crosshatch: "Crosshatch",
  dots: "Dots",
  dashes: "Dashes",
  squares: "Squares",
  waves: "Waves",
  chevrons: "Chevrons",
  asterisks: "Asterisks",
  concentric: "Concentric Circles",
  radialRays: "Radial Rays",
  crossMarks: "Cross Marks",
  contourFlow: "Contour Flow",
};
const controls = {
  backgroundColor: { value: "#ffffff", format: (value) => value.toUpperCase() },
  shape1Type: { value: "concentric", format: (value) => FILL_PATTERN_LABELS[value] },
  ringSpacing: { value: 8, format: (value) => value.toFixed(0) },
  shape1Angle: { value: 0, format: (value) => `${value.toFixed(0)}deg` },
  minRadius: { value: 0, format: (value) => value.toFixed(0) },
  maxRadius: { value: 400, format: (value) => value.toFixed(0) },
  fieldType: { value: "perlin", format: (value) => FIELD_TYPE_LABELS[value] },
  fieldBlendType: { value: "perlin", format: (value) => FIELD_TYPE_LABELS[value] },
  fieldBlendAmount: { value: 0, format: (value) => value.toFixed(2) },
  noiseThreshold: { value: 0.45, format: (value) => value.toFixed(2) },
  animateThreshold: { value: false, format: (value) => (value ? "on" : "off") },
  thresholdMin: { value: 0.25, format: (value) => value.toFixed(2) },
  thresholdMax: { value: 0.72, format: (value) => value.toFixed(2) },
  animationDuration: { value: 4, format: (value) => `${value.toFixed(1)}s` },
  noiseScale: {
    value: 0.005,
    format: (value) => value.toFixed(value < 0.01 ? 4 : 3),
  },
  noiseSeed: { value: 0, format: (value) => value.toFixed(0) },
  radialWeight: { value: 0.5, format: (value) => value.toFixed(2) },
  fieldRadialFrequency: { value: 1.4, format: (value) => value.toFixed(1) },
  fieldAngularFrequency: { value: 8, format: (value) => value.toFixed(0) },
  warpStrength: { value: 0, format: (value) => value.toFixed(2) },
  fieldOffsetX: { value: 0, format: (value) => value.toFixed(0) },
  fieldOffsetY: { value: 0, format: (value) => value.toFixed(0) },
  strokeWeight: { value: FIXED_STROKE_WEIGHT, format: (value) => value.toFixed(1) },
  ringColor: { value: "#000000", format: (value) => value.toUpperCase() },
  showContour: { value: true, format: (value) => (value ? "on" : "off") },
  contourWeight: { value: FIXED_STROKE_WEIGHT, format: (value) => value.toFixed(1) },
  contourColor: { value: "#000000", format: (value) => value.toUpperCase() },
  fillEmpty: { value: true, format: (value) => (value ? "on" : "off") },
  fillPattern: { value: "lines", format: (value) => FILL_PATTERN_LABELS[value] },
  fillSpacing: { value: 10, format: (value) => value.toFixed(0) },
  fillAngle: { value: 35, format: (value) => `${value.toFixed(0)}deg` },
  fillWeight: { value: FIXED_STROKE_WEIGHT, format: (value) => value.toFixed(1) },
  fillColor: { value: "#000000", format: (value) => value.toUpperCase() },
};

let svgLines = [];
let canvas;

function setup() {
  canvas = createCanvas(SIZE, SIZE);
  canvas.parent("canvas-shell");
  pixelDensity(CANVAS_PIXEL_DENSITY);
  noiseDetail(4, 0.5);
  strokeCap(ROUND);
  noLoop();
  bindControls();
  bindCollapsibleSections();
  redraw();
}

function draw() {
  const params = readParams();
  applyAnimationParams(params);
  renderArtwork(params);
}

function applyAnimationParams(params) {
  const timeSeconds = millis() / 1000;

  if (params.animateThreshold) {
    params.noiseThreshold = getAnimatedThreshold(params, timeSeconds);
  }
}

function getAnimatedThreshold(params, timeSeconds) {
  const minValue = Math.min(params.thresholdMin, params.thresholdMax);
  const maxValue = Math.max(params.thresholdMin, params.thresholdMax);
  const duration = Math.max(0.1, params.animationDuration);
  const phase = (timeSeconds % duration) / duration;
  const eased = 0.5 - Math.cos(phase * TWO_PI_VALUE) * 0.5;

  return lerp(minValue, maxValue, eased);
}

function renderArtwork(params) {
  const center = getCompositionCenter(params);
  const cx = center.x;
  const cy = center.y;

  noiseDetail(4, 0.5);
  background(params.backgroundColor);
  svgLines = [];
  randomSeed(params.noiseSeed + 10000);
  params.voronoiPoints = generateVoronoiPoints(params);

  drawShapeLayer(cx, cy, params, {
    type: params.shape1Type,
    region: "visible",
    spacing: params.ringSpacing,
    angle: params.shape1Angle,
    weight: params.strokeWeight,
    color: params.ringColor,
  });
  drawShapeLayer(cx, cy, params, {
    type: params.fillPattern,
    region: "empty",
    spacing: params.fillSpacing,
    angle: params.fillAngle,
    weight: params.fillWeight,
    color: params.fillColor,
    enabled: params.fillEmpty,
  });
  drawNoiseContour(cx, cy, params);
}

function drawNoiseContour(cx, cy, params) {
  if (!params.showContour) {
    return;
  }

  stroke(params.contourColor);
  strokeWeight(params.contourWeight);

  for (let y = 0; y < SIZE - CONTOUR_GRID_STEP; y += CONTOUR_GRID_STEP) {
    for (let x = 0; x < SIZE - CONTOUR_GRID_STEP; x += CONTOUR_GRID_STEP) {
      drawContourCell(cx, cy, x, y, CONTOUR_GRID_STEP, params);
    }
  }
}

function drawShapeLayer(cx, cy, params, layer) {
  if (layer.enabled === false || layer.weight <= 0) {
    return;
  }

  if (layer.type === "dots") {
    drawDotPattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "dashes") {
    drawDashPattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "squares") {
    drawSquarePattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "waves") {
    drawWavePattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "chevrons") {
    drawChevronPattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "asterisks") {
    drawAsteriskPattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "concentric") {
    drawConcentricPattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "radialRays") {
    drawRadialRayPattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "crossMarks") {
    drawCrossMarkPattern(cx, cy, params, layer);
    return;
  }

  if (layer.type === "contourFlow") {
    drawContourFlowPattern(cx, cy, params, layer);
    return;
  }

  drawHatchPattern(cx, cy, params, layer, radians(layer.angle));

  if (layer.type === "crosshatch") {
    drawHatchPattern(cx, cy, params, layer, radians(layer.angle + 90));
  }
}

function drawHatchPattern(cx, cy, params, layer, angle) {
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);

  stroke(layer.color);
  strokeWeight(layer.weight);

  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    let segmentStart = null;
    let previousPoint = null;

    for (let distance = -diagonal; distance <= diagonal; distance += FILL_SAMPLE_STEP) {
      const point = {
        x: cx + normal.x * offset + direction.x * distance,
        y: cy + normal.y * offset + direction.y * distance,
      };
      const isInsideCanvas = point.x >= 0 && point.x <= SIZE && point.y >= 0 && point.y <= SIZE;
      const isInRegion = isInsideCanvas && isPointInShapeRegion(cx, cy, point.x, point.y, params, layer.region);

      if (isInRegion && segmentStart === null) {
        segmentStart = point;
      }

      if ((!isInRegion || !isInsideCanvas) && segmentStart !== null && previousPoint) {
        drawFillLine(segmentStart, previousPoint, layer.weight, layer.color);
        segmentStart = null;
      }

      previousPoint = point;
    }

    if (segmentStart !== null && previousPoint) {
      drawFillLine(segmentStart, previousPoint, layer.weight, layer.color);
    }
  }
}

function drawDashPattern(cx, cy, params, layer) {
  const angle = radians(layer.angle);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);
  const halfLength = Math.max(2, layer.spacing * 0.36);

  stroke(layer.color);
  strokeWeight(layer.weight);

  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    for (let distance = -diagonal; distance <= diagonal; distance += layer.spacing) {
      const x = cx + normal.x * offset + direction.x * distance;
      const y = cy + normal.y * offset + direction.y * distance;

      if (x < 0 || x > SIZE || y < 0 || y > SIZE || !isPointInShapeRegion(cx, cy, x, y, params, layer.region)) {
        continue;
      }

      drawFillLine(
        { x: x - direction.x * halfLength, y: y - direction.y * halfLength },
        { x: x + direction.x * halfLength, y: y + direction.y * halfLength },
        layer.weight,
        layer.color
      );
    }
  }
}

function drawSquarePattern(cx, cy, params, layer) {
  const angle = radians(layer.angle);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);
  const sizeRatio = 0.2 + constrain(layer.weight / 4, 0, 1) * 0.6;
  const halfSize = Math.max(1, layer.spacing * sizeRatio * 0.5);

  noStroke();
  fill(layer.color);

  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    for (let distance = -diagonal; distance <= diagonal; distance += layer.spacing) {
      const x = cx + normal.x * offset + direction.x * distance;
      const y = cy + normal.y * offset + direction.y * distance;

      if (x < 0 || x > SIZE || y < 0 || y > SIZE || !isPointInShapeRegion(cx, cy, x, y, params, layer.region)) {
        continue;
      }

      const points = [
        { x: x - direction.x * halfSize - normal.x * halfSize, y: y - direction.y * halfSize - normal.y * halfSize },
        { x: x + direction.x * halfSize - normal.x * halfSize, y: y + direction.y * halfSize - normal.y * halfSize },
        { x: x + direction.x * halfSize + normal.x * halfSize, y: y + direction.y * halfSize + normal.y * halfSize },
        { x: x - direction.x * halfSize + normal.x * halfSize, y: y - direction.y * halfSize + normal.y * halfSize },
      ];

      quad(
        points[0].x,
        points[0].y,
        points[1].x,
        points[1].y,
        points[2].x,
        points[2].y,
        points[3].x,
        points[3].y
      );
      recordPolygon(points, layer.color);
    }
  }
}

function drawDotPattern(cx, cy, params, layer) {
  const angle = radians(layer.angle);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);
  const dotRadius = Math.max(0.5, layer.weight * 1.5);

  noStroke();
  fill(layer.color);

  let rowIndex = 0;
  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    const hexShift = (rowIndex % 2 === 1) ? layer.spacing / 2 : 0;
    for (let distance = -diagonal + hexShift; distance <= diagonal; distance += layer.spacing) {
      const x = cx + normal.x * offset + direction.x * distance;
      const y = cy + normal.y * offset + direction.y * distance;

      if (x < 0 || x > SIZE || y < 0 || y > SIZE || !isPointInShapeRegion(cx, cy, x, y, params, layer.region)) {
        continue;
      }

      circle(x, y, dotRadius * 2);
      recordCircle(x, y, dotRadius, layer.color);
    }
    rowIndex++;
  }
}

function drawWavePattern(cx, cy, params, layer) {
  const angle = radians(layer.angle);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);
  const amplitude = layer.spacing * 0.3;
  const wavelength = layer.spacing * 4;

  stroke(layer.color);
  strokeWeight(layer.weight);
  noFill();

  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    let previousPoint = null;

    for (let distance = -diagonal; distance <= diagonal; distance += FILL_SAMPLE_STEP) {
      const waveOffset = offset + Math.sin((distance / wavelength) * TWO_PI_VALUE) * amplitude;
      const point = {
        x: cx + normal.x * waveOffset + direction.x * distance,
        y: cy + normal.y * waveOffset + direction.y * distance,
      };
      const isInsideCanvas = point.x >= 0 && point.x <= SIZE && point.y >= 0 && point.y <= SIZE;
      const isInRegion = isInsideCanvas && isPointInShapeRegion(cx, cy, point.x, point.y, params, layer.region);

      if (isInRegion && previousPoint) {
        drawFillLine(previousPoint, point, layer.weight, layer.color);
      }

      previousPoint = isInRegion ? point : null;
    }
  }
}

function drawChevronPattern(cx, cy, params, layer) {
  const angle = radians(layer.angle);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);
  const length = Math.max(4, layer.spacing * 0.42);
  const width = Math.max(2, layer.spacing * 0.28);

  stroke(layer.color);
  strokeWeight(layer.weight);

  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    for (let distance = -diagonal; distance <= diagonal; distance += layer.spacing) {
      const x = cx + normal.x * offset + direction.x * distance;
      const y = cy + normal.y * offset + direction.y * distance;

      if (x < 0 || x > SIZE || y < 0 || y > SIZE || !isPointInShapeRegion(cx, cy, x, y, params, layer.region)) {
        continue;
      }

      const apex = { x: x + direction.x * length * 0.5, y: y + direction.y * length * 0.5 };
      const base = { x: x - direction.x * length * 0.5, y: y - direction.y * length * 0.5 };
      const left = { x: base.x - normal.x * width, y: base.y - normal.y * width };
      const right = { x: base.x + normal.x * width, y: base.y + normal.y * width };

      drawFillLine(apex, left, layer.weight, layer.color);
      drawFillLine(apex, right, layer.weight, layer.color);
    }
  }
}

function drawAsteriskPattern(cx, cy, params, layer) {
  const angle = radians(layer.angle);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);
  const halfLength = Math.max(2, layer.spacing * 0.34);

  stroke(layer.color);
  strokeWeight(layer.weight);

  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    for (let distance = -diagonal; distance <= diagonal; distance += layer.spacing) {
      const x = cx + normal.x * offset + direction.x * distance;
      const y = cy + normal.y * offset + direction.y * distance;

      if (x < 0 || x > SIZE || y < 0 || y > SIZE || !isPointInShapeRegion(cx, cy, x, y, params, layer.region)) {
        continue;
      }

      for (let arm = 0; arm < 3; arm += 1) {
        const armAngle = angle + (arm * Math.PI) / 3;
        const armDirection = { x: Math.cos(armAngle), y: Math.sin(armAngle) };
        drawFillLine(
          { x: x - armDirection.x * halfLength, y: y - armDirection.y * halfLength },
          { x: x + armDirection.x * halfLength, y: y + armDirection.y * halfLength },
          layer.weight,
          layer.color
        );
      }
    }
  }
}

function drawConcentricPattern(cx, cy, params, layer) {
  stroke(layer.color);
  strokeWeight(layer.weight);
  noFill();

  for (let radius = params.minRadius; radius <= params.maxRadius; radius += layer.spacing) {
    const segments = buildRegionArcSegments(cx, cy, radius, params, layer.region);

    segments.forEach((segment) => {
      arc(cx, cy, radius * 2, radius * 2, segment.start, segment.end);
      recordArc(cx, cy, radius, segment.start, segment.end, layer.weight, layer.color);
    });
  }
}

function drawRadialRayPattern(cx, cy, params, layer) {
  const maxRadius = Math.max(params.minRadius, params.maxRadius);
  const referenceRadius = Math.max(maxRadius, 1);
  const rayCount = Math.max(3, Math.round((TWO_PI_VALUE * referenceRadius) / layer.spacing));
  const angleStep = TWO_PI_VALUE / rayCount;
  const startAngle = radians(layer.angle);

  stroke(layer.color);
  strokeWeight(layer.weight);

  for (let rayIndex = 0; rayIndex < rayCount; rayIndex += 1) {
    const angle = startAngle + rayIndex * angleStep;
    let segmentStart = null;
    let previousPoint = null;

    for (let radius = params.minRadius; radius <= maxRadius; radius += FILL_SAMPLE_STEP) {
      const point = pointOnDomainRadius(cx, cy, radius, angle, params);
      const isInRegion = isPointInShapeRegion(cx, cy, point.x, point.y, params, layer.region);

      if (isInRegion && segmentStart === null) {
        segmentStart = point;
      }

      if (!isInRegion && segmentStart !== null && previousPoint) {
        drawFillLine(segmentStart, previousPoint, layer.weight, layer.color);
        segmentStart = null;
      }

      previousPoint = point;
    }

    if (segmentStart !== null && previousPoint) {
      drawFillLine(segmentStart, previousPoint, layer.weight, layer.color);
    }
  }
}

function drawCrossMarkPattern(cx, cy, params, layer) {
  const angle = radians(layer.angle);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };
  const diagonal = Math.sqrt(SIZE * SIZE + SIZE * SIZE);
  const halfLength = Math.max(2, layer.spacing * 0.32);

  stroke(layer.color);
  strokeWeight(layer.weight);

  for (let offset = -diagonal; offset <= diagonal; offset += layer.spacing) {
    for (let distance = -diagonal; distance <= diagonal; distance += layer.spacing) {
      const x = cx + normal.x * offset + direction.x * distance;
      const y = cy + normal.y * offset + direction.y * distance;

      if (x < 0 || x > SIZE || y < 0 || y > SIZE || !isPointInShapeRegion(cx, cy, x, y, params, layer.region)) {
        continue;
      }

      drawFillLine(
        { x: x - direction.x * halfLength, y: y - direction.y * halfLength },
        { x: x + direction.x * halfLength, y: y + direction.y * halfLength },
        layer.weight,
        layer.color
      );
      drawFillLine(
        { x: x - normal.x * halfLength, y: y - normal.y * halfLength },
        { x: x + normal.x * halfLength, y: y + normal.y * halfLength },
        layer.weight,
        layer.color
      );
    }
  }
}

function drawContourFlowPattern(cx, cy, params, layer) {
  const angleBias = radians(layer.angle);
  const halfLength = Math.max(3, layer.spacing * 0.52);
  const gradientStep = Math.max(2, layer.spacing * 0.25);

  stroke(layer.color);
  strokeWeight(layer.weight);

  let rowIndex = 0;
  for (let y = layer.spacing / 2; y <= SIZE; y += layer.spacing) {
    const rowShift = rowIndex % 2 === 1 ? layer.spacing / 2 : 0;

    for (let x = layer.spacing / 2 + rowShift; x <= SIZE; x += layer.spacing) {
      if (!isPointInShapeRegion(cx, cy, x, y, params, layer.region)) {
        continue;
      }

      const tangent = getFieldTangentAtPoint(cx, cy, x, y, params, gradientStep);
      const direction = rotateVector(tangent, angleBias);
      const segment = buildCenteredRegionSegment(cx, cy, x, y, direction, halfLength, params, layer.region);

      if (segment) {
        drawFillLine(segment.start, segment.end, layer.weight, layer.color);
      }
    }

    rowIndex++;
  }
}

function getFieldTangentAtPoint(cx, cy, x, y, params, step) {
  const left = sampleNoiseAtPoint(cx, cy, x - step, y, params);
  const right = sampleNoiseAtPoint(cx, cy, x + step, y, params);
  const top = sampleNoiseAtPoint(cx, cy, x, y - step, params);
  const bottom = sampleNoiseAtPoint(cx, cy, x, y + step, params);

  if (left === null || right === null || top === null || bottom === null) {
    return normalizeVector({ x: -(y - cy), y: x - cx });
  }

  const gradient = {
    x: right - left,
    y: bottom - top,
  };

  if (Math.hypot(gradient.x, gradient.y) < 0.0001) {
    return normalizeVector({ x: -(y - cy), y: x - cx });
  }

  return normalizeVector({ x: -gradient.y, y: gradient.x });
}

function buildCenteredRegionSegment(cx, cy, x, y, direction, halfLength, params, region) {
  const center = { x, y };
  const start = walkRegionSegmentEnd(cx, cy, center, direction, -1, halfLength, params, region);
  const end = walkRegionSegmentEnd(cx, cy, center, direction, 1, halfLength, params, region);

  if (Math.hypot(end.x - start.x, end.y - start.y) < FILL_SAMPLE_STEP) {
    return null;
  }

  return { start, end };
}

function walkRegionSegmentEnd(cx, cy, center, direction, sign, halfLength, params, region) {
  let endpoint = center;
  const step = Math.min(FILL_SAMPLE_STEP, halfLength);

  for (let distance = step; distance <= halfLength; distance += step) {
    const point = {
      x: center.x + direction.x * distance * sign,
      y: center.y + direction.y * distance * sign,
    };

    if (
      point.x < 0 ||
      point.x > SIZE ||
      point.y < 0 ||
      point.y > SIZE ||
      !isPointInShapeRegion(cx, cy, point.x, point.y, params, region)
    ) {
      break;
    }

    endpoint = point;
  }

  return endpoint;
}

function rotateVector(vector, angle) {
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  return {
    x: vector.x * cosAngle - vector.y * sinAngle,
    y: vector.x * sinAngle + vector.y * cosAngle,
  };
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y);

  if (length < 0.0001) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function buildRegionArcSegments(cx, cy, radius, params, region) {
  const samples = [];

  for (let angle = 0; angle < TWO_PI_VALUE; angle += ARC_SAMPLE_STEP) {
    const point = pointOnDomainRadius(cx, cy, radius, angle, params);
    samples.push({
      angle,
      active: isPointInShapeRegion(cx, cy, point.x, point.y, params, region),
    });
  }

  if (samples.length === 0 || samples.every((sample) => !sample.active)) {
    return [];
  }

  if (samples.every((sample) => sample.active)) {
    return [{ start: 0, end: TWO_PI_VALUE }];
  }

  const firstInactiveIndex = samples.findIndex((sample) => !sample.active);
  const ordered = samples.slice(firstInactiveIndex + 1).concat(samples.slice(0, firstInactiveIndex + 1));
  const segments = [];
  let activeStart = null;

  ordered.forEach((sample) => {
    if (sample.active && activeStart === null) {
      activeStart = normalizeAngle(sample.angle);
    }

    if (!sample.active && activeStart !== null) {
      const end = normalizeAngle(sample.angle);
      segments.push(normalizeSegment(activeStart, end));
      activeStart = null;
    }
  });

  return segments.filter((segment) => (segment.end - segment.start) * radius >= FILL_SAMPLE_STEP);
}

function isPointInShapeRegion(cx, cy, x, y, params, region) {
  const radius = getDomainRadius(cx, cy, x, y, params);

  if (radius < params.minRadius || radius > params.maxRadius) {
    return false;
  }

  if (region === "all") {
    return true;
  }

  const empty = isEmptyAtPoint(cx, cy, x, y, params);
  return region === "empty" ? empty : !empty;
}

function drawFillLine(start, end, strokeWidth, color) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);

  if (length < FILL_SAMPLE_STEP) {
    return;
  }

  line(start.x, start.y, end.x, end.y);
  recordLine(start.x, start.y, end.x, end.y, strokeWidth, color);
}

function drawContourCell(cx, cy, x, y, size, params) {
  const corners = [
    sampleNoiseAtPoint(cx, cy, x, y, params),
    sampleNoiseAtPoint(cx, cy, x + size, y, params),
    sampleNoiseAtPoint(cx, cy, x + size, y + size, params),
    sampleNoiseAtPoint(cx, cy, x, y + size, params),
  ];

  if (corners.some((value) => value === null)) {
    return;
  }

  const points = [];
  const positions = [
    { x, y },
    { x: x + size, y },
    { x: x + size, y: y + size },
    { x, y: y + size },
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];

  edges.forEach(([a, b]) => {
    const aInside = isVisibleNoiseValue(corners[a], 0, 0, params);
    const bInside = isVisibleNoiseValue(corners[b], 0, 0, params);

    if (aInside !== bInside) {
      const threshold = getContourThresholdBetweenValues(corners[a], corners[b], params);
      points.push(interpolateContourPoint(
        positions[a],
        positions[b],
        corners[a],
        corners[b],
        threshold
      ));
    }
  });

  if (points.length === 2) {
    drawContourLine(points[0], points[1], params.contourWeight, params.contourColor);
  }

  if (points.length === 4) {
    drawContourLine(points[0], points[1], params.contourWeight, params.contourColor);
    drawContourLine(points[2], points[3], params.contourWeight, params.contourColor);
  }
}

function sampleNoiseAtPoint(cx, cy, x, y, params) {
  const dx = x - cx;
  const dy = y - cy;
  const radius = getDomainRadius(cx, cy, x, y, params);

  if (radius < params.minRadius || radius > params.maxRadius) {
    return null;
  }

  const fdx = x - (cx + params.fieldOffsetX);
  const fdy = y - (cy + params.fieldOffsetY);
  return sampleNoiseValue(Math.atan2(fdy, fdx), Math.sqrt(fdx * fdx + fdy * fdy), params);
}

function isEmptyAtPoint(cx, cy, x, y, params) {
  const dx = x - cx;
  const dy = y - cy;
  const radius = getDomainRadius(cx, cy, x, y, params);

  if (radius < params.minRadius || radius > params.maxRadius) {
    return false;
  }

  const fdx = x - (cx + params.fieldOffsetX);
  const fdy = y - (cy + params.fieldOffsetY);
  const angle = Math.atan2(fdy, fdx);
  const fieldRadius = Math.sqrt(fdx * fdx + fdy * fdy);
  const value = sampleNoiseValue(angle, fieldRadius, params);

  return !isVisibleNoiseValue(value, angle, fieldRadius, params);
}

function interpolateContourPoint(a, b, aValue, bValue, threshold) {
  const range = bValue - aValue;
  const t = Math.abs(range) < 0.00001 ? 0.5 : constrain((threshold - aValue) / range, 0, 1);

  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

function getContourThresholdBetweenValues(aValue, bValue, params) {
  return params.noiseThreshold;
}

function drawContourLine(start, end, strokeWidth, color) {
  line(start.x, start.y, end.x, end.y);
  recordLine(start.x, start.y, end.x, end.y, strokeWidth, color);
}

function normalizeSegment(start, end) {
  if (end <= start) {
    end += TWO_PI_VALUE;
  }

  return { start, end };
}

function normalizeAngle(angle) {
  return (angle + TWO_PI_VALUE) % TWO_PI_VALUE;
}

function getCompositionCenter(params) {
  return {
    x: width / 2,
    y: height / 2,
  };
}

function getDomainRadius(cx, cy, x, y, params) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.hypot(dx, dy);
}

function pointOnDomainRadius(cx, cy, domainRadius, angle, params) {
  return {
    x: cx + Math.cos(angle) * domainRadius,
    y: cy + Math.sin(angle) * domainRadius,
  };
}

function sampleNoiseValue(angle, radius, params) {
  const ox = params.noiseSeed * 0.017;
  const oy = params.noiseSeed * 0.029;
  const phase = 0;

  const fieldAngle = angle + phase;

  const primary = sampleFieldTypeValue(params.fieldType, fieldAngle, radius, params, ox, oy, phase);
  const blendAmount = constrain(params.fieldBlendAmount, 0, 1);

  if (blendAmount <= 0) {
    return primary;
  }

  const secondary = sampleFieldTypeValue(params.fieldBlendType, fieldAngle, radius, params, ox + 17.13, oy + 31.71, phase);
  return constrain(lerp(primary, secondary, blendAmount), 0, 1);
}

function sampleFieldTypeValue(fieldType, fieldAngle, radius, params, ox, oy, phase) {
  if (fieldType === "interference") return sampleInterferenceField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "checkerboard") return sampleCheckerboardField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "ridged") return sampleRidgedField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "whorled") return sampleWhorledField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "product") return sampleProductField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "voronoi") return sampleVoronoiField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "julia") return sampleJuliaField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "flowField") return sampleFlowFieldAdvection(fieldAngle, radius, params, ox, oy);
  if (fieldType === "metaballs") return sampleMetaballField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "turbulence") return sampleTurbulenceField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "moire") return sampleMoireField(fieldAngle, radius, params, ox, oy, phase);
  if (fieldType === "cracks") return sampleCrackField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "lobedSdf") return sampleLobedSDFField(fieldAngle, radius, params, ox, oy, phase);
  if (fieldType === "pinwheel") return samplePinwheelField(fieldAngle, radius, params, ox, oy, phase);
  if (fieldType === "superformula") return sampleSuperformulaField(fieldAngle, radius, params, ox, oy, phase);
  if (fieldType === "gyroid") return sampleGyroidField(fieldAngle, radius, params, ox, oy, phase);
  if (fieldType === "roseCurve") return sampleRoseCurveField(fieldAngle, radius, params, ox, oy, phase);
  if (fieldType === "faultLines") return sampleFaultLineField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "triangularLattice") return sampleTriangularLatticeField(fieldAngle, radius, params, ox, oy, phase);
  if (fieldType === "orbitTrap") return sampleOrbitTrapField(fieldAngle, radius, params, ox, oy);
  if (fieldType === "sdf") return sampleSDFField(fieldAngle, radius, params, ox, oy);

  const perlinValue = samplePerlinField(fieldAngle, radius, params, ox, oy);
  const radialValue = sampleRadialField(fieldAngle, radius, params, ox, oy);
  const angularValue = sampleAngularField(fieldAngle, radius, params, ox, oy, phase);
  const rippleValue = sampleRippleField(fieldAngle, radius, params, ox, oy, phase);
  const spiralValue = sampleSpiralField(fieldAngle, radius, params, ox, oy, phase);

  if (fieldType === "radial") return radialValue;
  if (fieldType === "angular") return angularValue;
  if (fieldType === "ripple") return rippleValue;
  if (fieldType === "spiral") return spiralValue;
  if (fieldType === "mixed") {
    return lerp(
      lerp(perlinValue, radialValue, params.radialWeight),
      lerp(angularValue, spiralValue, params.radialWeight),
      0.5
    );
  }
  return perlinValue;
}

function samplePerlinField(angle, radius, params, ox, oy) {
  const nx = Math.cos(angle) * radius * params.noiseScale + ox;
  const ny = Math.sin(angle) * radius * params.noiseScale + oy;

  if (params.warpStrength > 0) {
    const wx = (noise(nx + 1.7, ny + 9.2) * 2 - 1) * params.warpStrength;
    const wy = (noise(nx + 8.3, ny + 2.8) * 2 - 1) * params.warpStrength;
    return noise(nx + wx, ny + wy);
  }

  return noise(nx, ny);
}

function sampleRadialField(angle, radius, params, ox, oy) {
  return noise(
    radius * params.noiseScale * params.fieldRadialFrequency + ox,
    Math.cos(angle) * 0.35 + oy,
    Math.sin(angle) * 0.35
  );
}

function sampleAngularField(angle, radius, params, ox, oy, phase) {
  const wave = Math.sin(
    angle * params.fieldAngularFrequency +
      phase +
      noise(radius * params.noiseScale + ox, oy) * Math.PI
  );
  const detail = noise(
    Math.cos(angle) * params.fieldAngularFrequency * 0.05 + ox,
    Math.sin(angle) * params.fieldAngularFrequency * 0.05 + oy,
    radius * params.noiseScale
  );

  return constrain(lerp((wave + 1) / 2, detail, params.radialWeight * 0.35), 0, 1);
}

function sampleRippleField(angle, radius, params, ox, oy, phase) {
  const ripple = Math.sin(
    radius * params.noiseScale * params.fieldRadialFrequency * 24 -
      phase * params.fieldRadialFrequency +
      ox * TWO_PI_VALUE
  );
  const wobble = noise(
    Math.cos(angle) * params.fieldAngularFrequency * 0.08 + ox,
    Math.sin(angle) * params.fieldAngularFrequency * 0.08 + oy
  );

  return constrain(lerp((ripple + 1) / 2, wobble, params.radialWeight * 0.5), 0, 1);
}

function sampleSpiralField(angle, radius, params, ox, oy, phase) {
  const spiral = Math.sin(
    angle * params.fieldAngularFrequency +
      radius * params.noiseScale * params.fieldRadialFrequency * 18 +
      phase * 2 +
      ox * TWO_PI_VALUE
  );
  const turbulence = samplePerlinField(angle, radius, params, ox, oy);

  return constrain(lerp((spiral + 1) / 2, turbulence, params.radialWeight * 0.5), 0, 1);
}

function generateVoronoiPoints(params) {
  const n = Math.max(4, Math.min(48, Math.round(params.fieldAngularFrequency * 2)));
  const spread = params.maxRadius * 0.85;
  const points = [];
  for (let i = 0; i < n; i++) {
    points.push({ x: (random() * 2 - 1) * spread, y: (random() * 2 - 1) * spread });
  }
  return points;
}

function sampleInterferenceField(angle, radius, params, ox, oy) {
  const spread = params.fieldRadialFrequency * 40;
  const freq = params.noiseScale * params.fieldRadialFrequency * 24;
  const px = Math.cos(angle) * radius;
  const py = Math.sin(angle) * radius;
  const animPhase = ox * TWO_PI_VALUE;
  const d1 = Math.hypot(px - spread, py);
  const d2 = Math.hypot(px + spread, py);
  const wave = (Math.sin(d1 * freq + animPhase) + Math.sin(d2 * freq + animPhase) + 2) / 4;
  const wobble = noise(Math.cos(angle) * 0.5 + ox, Math.sin(angle) * 0.5 + oy, radius * params.noiseScale);
  return constrain(lerp(wave, wobble, params.radialWeight * 0.5), 0, 1);
}

function sampleCheckerboardField(angle, radius, params, ox, oy) {
  const angularBand = Math.floor(((angle + TWO_PI_VALUE) / TWO_PI_VALUE) * params.fieldAngularFrequency);
  const radialBand = Math.floor(radius * params.noiseScale * params.fieldRadialFrequency * 10);
  const checker = (angularBand + radialBand) % 2 === 0 ? 0.8 : 0.2;
  const soften = noise(
    Math.cos(angle) * params.fieldAngularFrequency * 0.05 + ox,
    Math.sin(angle) * params.fieldAngularFrequency * 0.05 + oy,
    radius * params.noiseScale
  );
  return constrain(lerp(checker, soften, params.radialWeight * 0.4), 0, 1);
}

function sampleRidgedField(angle, radius, params, ox, oy) {
  const nx = Math.cos(angle) * radius * params.noiseScale + ox;
  const ny = Math.sin(angle) * radius * params.noiseScale + oy;
  return 1 - Math.abs(noise(nx, ny) * 2 - 1);
}

function sampleWhorledField(angle, radius, params, ox, oy) {
  const twist = radius * params.noiseScale * params.fieldRadialFrequency * 5;
  return samplePerlinField(angle + twist, radius, params, ox, oy);
}

function sampleProductField(angle, radius, params, ox, oy) {
  const perlin = samplePerlinField(angle, radius, params, ox, oy);
  const radialEnv = (Math.sin(radius * params.noiseScale * params.fieldRadialFrequency * 20 + ox * TWO_PI_VALUE) + 1) / 2;
  const angularEnv = (Math.sin(angle * params.fieldAngularFrequency) + 1) / 2;
  const envelope = lerp(radialEnv, angularEnv, params.radialWeight);
  return constrain(perlin * envelope * 2, 0, 1);
}

function sampleVoronoiField(angle, radius, params, ox, oy) {
  const px = Math.cos(angle) * radius;
  const py = Math.sin(angle) * radius;
  const pts = params.voronoiPoints;
  let d1 = Infinity, d2 = Infinity;
  for (const p of pts) {
    const d = Math.hypot(px - p.x, py - p.y);
    if (d < d1) { d2 = d1; d1 = d; }
    else if (d < d2) { d2 = d; }
  }
  const norm = params.maxRadius * 0.9;
  const f1 = constrain(1 - d1 / norm, 0, 1);
  const boundary = constrain((d2 - d1) / norm * 4, 0, 1);
  return lerp(f1, boundary, params.radialWeight);
}

function sampleJuliaField(angle, radius, params, ox, oy) {
  const scale = params.maxRadius > 0 ? 2.0 / params.maxRadius : 0.005;
  let zx = Math.cos(angle) * radius * scale;
  let zy = Math.sin(angle) * radius * scale;
  const jcx = Math.cos(ox * 3.7) * 0.7;
  const jcy = Math.sin(oy * 2.9) * 0.35;
  const maxIter = 16;
  let iter = 0;
  while (iter < maxIter && zx * zx + zy * zy < 4) {
    const zx2 = zx * zx - zy * zy + jcx;
    zy = 2 * zx * zy + jcy;
    zx = zx2;
    iter++;
  }
  if (iter === maxIter) return 0.85;
  const mag2 = zx * zx + zy * zy;
  const smooth = iter + 1 - Math.log2(Math.log2(Math.max(1.001, mag2)));
  return constrain(smooth / maxIter, 0, 1);
}

function sampleFlowFieldAdvection(angle, radius, params, ox, oy) {
  const stepSize = params.maxRadius * params.fieldRadialFrequency * 0.04;
  let x = Math.cos(angle) * radius;
  let y = Math.sin(angle) * radius;
  for (let i = 0; i < 4; i++) {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const nx = Math.cos(a) * r * params.noiseScale + ox;
    const ny = Math.sin(a) * r * params.noiseScale + oy;
    const flowAngle = noise(nx, ny, i * 0.7 + 3.14) * TWO_PI_VALUE * 2;
    x += Math.cos(flowAngle) * stepSize;
    y += Math.sin(flowAngle) * stepSize;
  }
  return samplePerlinField(Math.atan2(y, x), Math.hypot(x, y), params, ox, oy);
}

function sampleMetaballField(angle, radius, params, ox, oy) {
  const px = Math.cos(angle) * radius;
  const py = Math.sin(angle) * radius;
  const ballRadius = params.maxRadius * (0.08 + params.radialWeight * 0.08);
  let field = 0;

  for (const point of params.voronoiPoints) {
    const dx = px - point.x;
    const dy = py - point.y;
    const dist2 = dx * dx + dy * dy + 1;
    field += (ballRadius * ballRadius) / dist2;
  }

  const softened = 1 - Math.exp(-field * 0.55);
  const wobble = samplePerlinField(angle, radius, params, ox, oy);
  return constrain(lerp(softened, wobble, params.radialWeight * 0.25), 0, 1);
}

function sampleTurbulenceField(angle, radius, params, ox, oy) {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;

  for (let octave = 0; octave < 4; octave += 1) {
    const nx = Math.cos(angle) * radius * params.noiseScale * frequency + ox;
    const ny = Math.sin(angle) * radius * params.noiseScale * frequency + oy;
    sum += Math.abs(noise(nx, ny) * 2 - 1) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return constrain(sum / Math.max(norm, 0.0001), 0, 1);
}

function sampleMoireField(angle, radius, params, ox, oy, phase) {
  const px = Math.cos(angle) * radius;
  const py = Math.sin(angle) * radius;
  const freq = params.noiseScale * params.fieldRadialFrequency * 38;
  const rotation = TWO_PI_VALUE / Math.max(3, params.fieldAngularFrequency);
  const lineA = Math.sin((px * Math.cos(rotation) + py * Math.sin(rotation)) * freq + phase + ox);
  const lineB = Math.sin((px * Math.cos(-rotation) + py * Math.sin(-rotation)) * freq - phase + oy);
  const rings = Math.sin(radius * freq * 0.7 + angle * params.fieldAngularFrequency * params.radialWeight);
  const moire = Math.abs(lineA - lineB) * 0.5;
  return constrain(lerp(moire, (rings + 1) / 2, params.radialWeight * 0.45), 0, 1);
}

function sampleCrackField(angle, radius, params, ox, oy) {
  const px = Math.cos(angle) * radius;
  const py = Math.sin(angle) * radius;
  let d1 = Infinity;
  let d2 = Infinity;

  for (const point of params.voronoiPoints) {
    const distance = Math.hypot(px - point.x, py - point.y);
    if (distance < d1) {
      d2 = d1;
      d1 = distance;
    } else if (distance < d2) {
      d2 = distance;
    }
  }

  const edgeDistance = Math.max(0, d2 - d1);
  const crackWidth = params.maxRadius * (0.012 + params.radialWeight * 0.025);
  const cracks = 1 - constrain(edgeDistance / Math.max(crackWidth, 0.0001), 0, 1);
  const grain = noise(px * params.noiseScale * 2 + ox, py * params.noiseScale * 2 + oy);
  return constrain(lerp(cracks, grain, params.radialWeight * 0.25), 0, 1);
}

function sampleLobedSDFField(angle, radius, params, ox, oy, phase) {
  const lobes = Math.max(2, params.fieldAngularFrequency);
  const baseRadius = params.maxRadius * (0.52 + params.radialWeight * 0.18);
  const amplitude = params.maxRadius * (0.12 + params.radialWeight * 0.18);
  const wobble = (noise(Math.cos(angle) * 0.75 + ox, Math.sin(angle) * 0.75 + oy) - 0.5) * params.maxRadius * 0.12;
  const shapeRadius = baseRadius + Math.cos(angle * lobes + phase) * amplitude + wobble;
  const softness = params.maxRadius * (0.08 + params.noiseScale * 2);
  return constrain(0.5 - (radius - shapeRadius) / Math.max(softness, 0.0001), 0, 1);
}

function samplePinwheelField(angle, radius, params, ox, oy, phase) {
  const twist = radius * params.noiseScale * params.fieldRadialFrequency * 18;
  const blades = params.fieldAngularFrequency;
  const bladeWave = Math.sin((angle + twist) * blades + phase * 2 + ox * TWO_PI_VALUE);
  const radialPulse = Math.sin(radius * params.noiseScale * params.fieldRadialFrequency * 16 - phase);
  const turbulence = samplePerlinField(angle + twist * 0.4, radius, params, ox, oy);
  const pinwheel = lerp((bladeWave + 1) / 2, (radialPulse + 1) / 2, params.radialWeight * 0.45);
  return constrain(lerp(pinwheel, turbulence, params.radialWeight * 0.35), 0, 1);
}

function sampleSuperformulaField(angle, radius, params, ox, oy, phase) {
  const m = Math.max(2, params.fieldAngularFrequency);
  const n1 = 0.25 + params.radialWeight * 1.8;
  const n2 = 0.8 + params.fieldRadialFrequency * 0.45;
  const n3 = 0.8 + (1 - params.radialWeight) * 2.2;
  const a = 1;
  const b = 1;
  const partA = Math.pow(Math.abs(Math.cos((m * angle + phase) / 4) / a), n2);
  const partB = Math.pow(Math.abs(Math.sin((m * angle + phase) / 4) / b), n3);
  const shape = Math.pow(partA + partB, -1 / Math.max(n1, 0.001));
  const norm = params.maxRadius * (0.38 + params.radialWeight * 0.28);
  const shapeRadius = constrain(shape, 0, 2.4) * norm;
  const wobble = (noise(Math.cos(angle) + ox, Math.sin(angle) + oy) - 0.5) * params.maxRadius * 0.08;
  const softness = params.maxRadius * 0.1;
  return constrain(0.5 - (radius - shapeRadius - wobble) / softness, 0, 1);
}

function sampleGyroidField(angle, radius, params, ox, oy, phase) {
  const x = Math.cos(angle) * radius * params.noiseScale * params.fieldRadialFrequency + ox;
  const y = Math.sin(angle) * radius * params.noiseScale * params.fieldRadialFrequency + oy;
  const z = angle * params.fieldAngularFrequency * 0.12 + phase;
  const gyroid = Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x);
  const folded = 1 - Math.abs(gyroid) / 1.5;
  const perlin = samplePerlinField(angle, radius, params, ox, oy);
  return constrain(lerp(folded, perlin, params.radialWeight * 0.25), 0, 1);
}

function sampleRoseCurveField(angle, radius, params, ox, oy, phase) {
  const petals = Math.max(2, params.fieldAngularFrequency);
  const curveRadius = params.maxRadius * (0.28 + params.radialWeight * 0.45) * Math.abs(Math.cos(petals * angle + phase));
  const bandDistance = Math.abs(radius - curveRadius);
  const bandWidth = params.maxRadius * (0.025 + params.noiseScale * params.fieldRadialFrequency);
  const rose = 1 - constrain(bandDistance / Math.max(bandWidth, 0.0001), 0, 1);
  const fill = constrain((curveRadius - radius) / Math.max(bandWidth * 3, 0.0001) + 0.5, 0, 1);
  return constrain(lerp(rose, fill, params.radialWeight * 0.65), 0, 1);
}

function sampleFaultLineField(angle, radius, params, ox, oy) {
  const px = Math.cos(angle) * radius;
  const py = Math.sin(angle) * radius;
  let value = 0.5;

  params.voronoiPoints.forEach((point, index) => {
    const lineAngle = noise(index * 0.173 + ox, index * 0.291 + oy) * TWO_PI_VALUE;
    const nx = Math.cos(lineAngle);
    const ny = Math.sin(lineAngle);
    const side = (px - point.x) * nx + (py - point.y) * ny;
    const shift = side > 0 ? 1 : -1;
    value += shift * (0.035 + params.radialWeight * 0.025);
  });

  const grain = samplePerlinField(angle, radius, params, ox, oy);
  return constrain(lerp(value, grain, params.radialWeight * 0.25), 0, 1);
}

function sampleTriangularLatticeField(angle, radius, params, ox, oy, phase) {
  const px = Math.cos(angle) * radius * params.noiseScale * params.fieldRadialFrequency + ox;
  const py = Math.sin(angle) * radius * params.noiseScale * params.fieldRadialFrequency + oy;
  const a = Math.sin(px * 28 + phase);
  const b = Math.sin((px * 0.5 + py * 0.866) * 28 - phase * 0.7);
  const c = Math.sin((-px * 0.5 + py * 0.866) * 28 + phase * 0.4);
  const lattice = (a + b + c + 3) / 6;
  const edges = 1 - Math.abs(lattice * 2 - 1);
  return constrain(lerp(lattice, edges, params.radialWeight), 0, 1);
}

function sampleOrbitTrapField(angle, radius, params, ox, oy) {
  const scale = params.maxRadius > 0 ? 2.4 / params.maxRadius : 0.006;
  let zx = Math.cos(angle) * radius * scale;
  let zy = Math.sin(angle) * radius * scale;
  const cx = Math.cos(ox * 2.1) * 0.55;
  const cy = Math.sin(oy * 2.7) * 0.45;
  let minTrap = Infinity;
  const maxIter = 18;

  for (let iter = 0; iter < maxIter; iter += 1) {
    const lineTrap = Math.abs(zy);
    const circleTrap = Math.abs(Math.hypot(zx - 0.35, zy + 0.15) - 0.28);
    minTrap = Math.min(minTrap, lineTrap, circleTrap);

    const zx2 = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = zx2;

    if (zx * zx + zy * zy > 8) {
      break;
    }
  }

  const trap = 1 - constrain(minTrap * (5 + params.fieldRadialFrequency), 0, 1);
  const grain = noise(zx * 0.5 + ox, zy * 0.5 + oy);
  return constrain(lerp(trap, grain, params.radialWeight * 0.3), 0, 1);
}

function sampleSDFField(angle, radius, params, ox, oy) {
  const n = Math.max(3, Math.min(16, Math.round(params.fieldAngularFrequency)));
  const outerR = params.maxRadius * 0.85;
  const innerR = outerR * (0.3 + params.radialWeight * 0.35);
  let shapeR;
  if (params.sdfShape === "polygon") {
    const sectorAngle = TWO_PI_VALUE / n;
    const halfSector = sectorAngle / 2;
    const f = ((angle % sectorAngle) + sectorAngle) % sectorAngle;
    shapeR = outerR * Math.cos(halfSector) / Math.cos(f - halfSector);
  } else {
    shapeR = lerp(outerR, innerR, (1 - Math.cos(angle * n)) / 2);
  }
  const dist = (radius - shapeR) / (params.maxRadius * 0.15);
  return constrain(0.5 - dist * 0.3, 0, 1);
}

function isVisibleNoiseValue(value, angle, radius, params) {
  return value > params.noiseThreshold;
}

function bindControls() {
  Object.keys(controls).forEach((id) => {
    const input = document.getElementById(id);
    const output = document.getElementById(`${id}Value`);

    const update = () => {
      const value = getControlValue(input);
      controls[id].value = value;
      output.value = controls[id].format(value);
      updateRenderLoop();
    };

    input.addEventListener("input", update);
    update();
  });

  document.getElementById("downloadSvg").addEventListener("click", downloadSVG);
  document.getElementById("downloadAnimatedSvg").addEventListener("click", downloadAnimatedSVG);
  document.getElementById("downloadWebm").addEventListener("click", downloadWEBM);
  document.getElementById("downloadPng").addEventListener("click", downloadPNG);
  document.getElementById("randomizeAll").addEventListener("click", randomizeAll);
  document.getElementById("resetFieldOffset").addEventListener("click", resetFieldOffset);
}

function bindCollapsibleSections() {
  document.querySelectorAll(".section-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const fieldset = button.closest("fieldset");
      const collapsed = fieldset.classList.toggle("collapsed");

      button.setAttribute("aria-expanded", String(!collapsed));
    });
  });
}

function updateRenderLoop() {
  if (controls.animateThreshold.value) {
    loop();
    return;
  }

  noLoop();
  redraw();
}

function randomizeAll() {
  const minRadius = randomInteger(0, 120);
  const maxRadius = randomInteger(Math.max(220, minRadius + 80), 560);
  const values = {
    shape1Type: randomChoice(Object.keys(FILL_PATTERN_LABELS)),
    ringSpacing: randomInteger(4, 24),
    shape1Angle: randomInteger(0, 180),
    minRadius,
    maxRadius,
    fieldType: randomChoice(Object.keys(FIELD_TYPE_LABELS)),
    noiseThreshold: randomStep(0.25, 0.72, 0.01),
    fieldBlendType: randomChoice(Object.keys(FIELD_TYPE_LABELS)),
    fieldBlendAmount: randomChoice([0, randomStep(0.12, 0.65, 0.01)]),
    noiseScale: randomStep(0.002, 0.03, 0.001),
    noiseSeed: randomInteger(0, 1000),
    radialWeight: randomStep(0, 1, 0.01),
    fieldRadialFrequency: randomStep(0.4, 6, 0.1),
    fieldAngularFrequency: randomInteger(2, 24),
    warpStrength: randomStep(0, 2, 0.05),
    fieldOffsetX: randomInteger(-180, 180),
    fieldOffsetY: randomInteger(-180, 180),
    ringColor: randomColor(),
    showContour: Math.random() < 0.75,
    contourColor: randomColor(),
    fillEmpty: Math.random() < 0.75,
    fillPattern: randomChoice(Object.keys(FILL_PATTERN_LABELS)),
    fillSpacing: randomInteger(4, 24),
    fillAngle: randomInteger(0, 180),
    fillColor: randomColor(),
  };

  Object.entries(values).forEach(([id, value]) => setControlValue(id, value));
  updateRenderLoop();
}

function resetFieldOffset() {
  setControlValue("fieldOffsetX", 0);
  setControlValue("fieldOffsetY", 0);
  updateRenderLoop();
}

function setControlValue(id, value) {
  const input = document.getElementById(id);
  const output = document.getElementById(`${id}Value`);

  if (input.type === "checkbox") {
    input.checked = value;
  } else {
    input.value = value;
  }

  controls[id].value = getControlValue(input);
  output.value = controls[id].format(controls[id].value);
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomStep(min, max, step) {
  const steps = Math.round((max - min) / step);
  return Number((min + randomInteger(0, steps) * step).toFixed(4));
}

function randomChoice(values) {
  return values[randomInteger(0, values.length - 1)];
}

function randomColor() {
  return `#${randomInteger(0, 0xffffff).toString(16).padStart(6, "0").toUpperCase()}`;
}

function getControlValue(input) {
  if (input.type === "checkbox") {
    return input.checked;
  }

  if (input.type === "color" || input.tagName === "SELECT") {
    return input.value;
  }

  return Number(input.value);
}

function readParams() {
  const params = {};

  Object.keys(controls).forEach((id) => {
    params[id] = controls[id].value;
  });

  return params;
}

function recordArc(cx, cy, radius, startAngle, endAngle, strokeWidth, color) {
  if (endAngle - startAngle >= TWO_PI_VALUE - 0.001) {
    recordArc(cx, cy, radius, 0, Math.PI, strokeWidth, color);
    recordArc(cx, cy, radius, Math.PI, TWO_PI_VALUE, strokeWidth, color);
    return;
  }

  const start = pointOnCircle(cx, cy, radius, startAngle);
  const end = pointOnCircle(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  svgLines.push(
    `<path d="M ${toSvgNumber(start.x)} ${toSvgNumber(start.y)} A ${toSvgNumber(radius)} ${toSvgNumber(radius)} 0 ${largeArc} 1 ${toSvgNumber(end.x)} ${toSvgNumber(end.y)}" stroke="${escapeSvgAttribute(color)}" stroke-width="${toSvgNumber(strokeWidth)}"/>`
  );
}

function recordLine(x1, y1, x2, y2, strokeWidth, color) {
  svgLines.push(
    `<line x1="${toSvgNumber(x1)}" y1="${toSvgNumber(y1)}" x2="${toSvgNumber(x2)}" y2="${toSvgNumber(y2)}" stroke="${escapeSvgAttribute(color)}" stroke-width="${toSvgNumber(strokeWidth)}"/>`
  );
}

function pointOnCircle(cx, cy, radius, angle) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function recordCircle(cx, cy, radius, color) {
  svgLines.push(
    `<circle cx="${toSvgNumber(cx)}" cy="${toSvgNumber(cy)}" r="${toSvgNumber(radius)}" fill="${escapeSvgAttribute(color)}" stroke="none"/>`
  );
}

function recordPolygon(points, color) {
  const pointString = points
    .map((point) => `${toSvgNumber(point.x)},${toSvgNumber(point.y)}`)
    .join(" ");

  svgLines.push(
    `<polygon points="${pointString}" fill="${escapeSvgAttribute(color)}" stroke="none"/>`
  );
}

function downloadSVG() {
  const params = readParams();
  const header = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
    `<rect width="100%" height="100%" fill="${escapeSvgAttribute(params.backgroundColor)}"/>`,
    `<g fill="none" stroke-linecap="round">`,
  ].join("");
  const footer = `</g></svg>`;
  const blob = new Blob([header, svgLines.join(""), footer], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "circles.svg";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadAnimatedSVG() {
  const baseParams = readParams();
  const frameCount = ANIMATION_FRAME_COUNT;
  const duration = Math.max(0.1, baseParams.animationDuration);
  const keyTimes = Array.from({ length: frameCount + 1 }, (_, index) => toSvgNumber(index / frameCount)).join(";");
  const groups = [];

  for (let index = 0; index < frameCount; index += 1) {
    const frameTime = (duration * index) / frameCount;
    const frameParams = {
      ...baseParams,
      animateThreshold: false,
      noiseThreshold: baseParams.animateThreshold
        ? getAnimatedThreshold(baseParams, frameTime)
        : baseParams.noiseThreshold,
    };

    renderArtwork(frameParams);
    groups.push(buildAnimatedFrameGroup(index, frameCount, duration, keyTimes, buildOptimizedSvgContents(svgLines)));
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
    `<rect width="100%" height="100%" fill="${escapeSvgAttribute(baseParams.backgroundColor)}"/>`,
    `<g fill="none" stroke-linecap="round">`,
    groups.join(""),
    `</g></svg>`,
  ].join("");

  downloadTextFile(svg, "radial-field-shapes-animation-optimized.svg", "image/svg+xml");
  updateRenderLoop();
}

function buildAnimatedFrameGroup(index, frameCount, duration, keyTimes, contents) {
  const values = Array.from({ length: frameCount + 1 }, (_, step) => (step % frameCount === index ? "1" : "0")).join(";");

  return [
    `<g opacity="${index === 0 ? "1" : "0"}">`,
    contents,
    `<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" dur="${toSvgNumber(duration)}s" repeatCount="indefinite" calcMode="discrete"/>`,
    `</g>`,
  ].join("");
}

function buildOptimizedSvgContents(lines) {
  const pathGroups = new Map();
  const passthrough = [];

  lines.forEach((line) => {
    const compactPath = getCompactPathFromSvgLine(line) || getCompactPathFromSvgPath(line);

    if (!compactPath) {
      passthrough.push(line);
      return;
    }

    const key = `${compactPath.color}|${compactPath.strokeWidth}`;

    if (!pathGroups.has(key)) {
      pathGroups.set(key, {
        color: compactPath.color,
        strokeWidth: compactPath.strokeWidth,
        commands: [],
      });
    }

    pathGroups.get(key).commands.push(compactPath.d);
  });

  const compacted = Array.from(pathGroups.values()).map((group) => (
    `<path d="${group.commands.join(" ")}" stroke="${escapeSvgAttribute(group.color)}" stroke-width="${escapeSvgAttribute(group.strokeWidth)}"/>`
  ));

  return compacted.concat(passthrough).join("");
}

function getCompactPathFromSvgLine(line) {
  const match = line.match(/^<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" stroke="([^"]+)" stroke-width="([^"]+)"\/>$/);

  if (!match) {
    return null;
  }

  return {
    d: `M ${match[1]} ${match[2]} L ${match[3]} ${match[4]}`,
    color: match[5],
    strokeWidth: match[6],
  };
}

function getCompactPathFromSvgPath(line) {
  const match = line.match(/^<path d="([^"]+)" stroke="([^"]+)" stroke-width="([^"]+)"\/>$/);

  if (!match) {
    return null;
  }

  return {
    d: match[1],
    color: match[2],
    strokeWidth: match[3],
  };
}

function downloadWEBM() {
  if (!canvas.elt.captureStream || typeof MediaRecorder === "undefined") {
    window.alert("Video export is not supported in this browser. Use Animated SVG export instead.");
    return;
  }

  const mimeType = getSupportedVideoMimeType();

  if (!mimeType) {
    window.alert("WebM recording is not supported in this browser. Use Animated SVG export instead.");
    return;
  }

  const params = readParams();
  const durationMs = Math.max(0.1, params.animationDuration) * 1000;
  const stream = canvas.elt.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  const previousAnimateThreshold = controls.animateThreshold.value;

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  recorder.addEventListener("stop", () => {
    stream.getTracks().forEach((track) => track.stop());
    controls.animateThreshold.value = previousAnimateThreshold;
    updateRenderLoop();
    downloadBlob(new Blob(chunks, { type: mimeType }), "radial-field-shapes-animation.webm");
  });

  if (!controls.animateThreshold.value) {
    controls.animateThreshold.value = true;
  }

  loop();
  recorder.start();
  window.setTimeout(() => recorder.stop(), durationMs);
}

function getSupportedVideoMimeType() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

function downloadPNG() {
  const link = document.createElement("a");

  link.href = canvas.elt.toDataURL("image/png");
  link.download = "radial-field-shapes.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadTextFile(contents, filename, type) {
  downloadBlob(new Blob([contents], { type }), filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toSvgNumber(value) {
  return Number(value).toFixed(2);
}

function escapeSvgAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}
