import type {
  IHeroBuilderThread,
  IHeroClaim,
  IHeroEdge,
  IHeroLogLine,
  IProductFeature,
  THandleId,
  THeroEdgeTone,
  THeroExhibitId,
  THeroMiniTone,
  THeroPhase,
  TLandingSectionGround,
  TLandingSurface,
  TNodeBandTone,
} from '@interfaces';

export const LIGHT_SCHEME_QUERY = '(prefers-color-scheme: light)';
export const FINE_POINTER_QUERY = '(pointer: fine)';
export const DESKTOP_QUERY = '(min-width: 1024px)';

export const LANDING_SCREEN_SELECTOR = ':scope > .snap-start';

export const LANDING_SECTION_GROUND_CLASSES: Record<TLandingSectionGround, string> = {
  field: 'bg-[color:var(--hero-veil-field)]',
  deep: 'bg-[color:var(--hero-veil-deep)]',
  close: 'bg-[color:var(--hero-veil-close)]',
};

export const LANDING_SURFACE_CLASSES: Record<TLandingSurface, string> = {
  card: 'landing-glass rounded-xl border border-[color:var(--hero-card-border)] bg-[color:var(--hero-card)] shadow-[var(--hero-card-shadow)] backdrop-blur-md',
  panel:
    'landing-glass rounded-xl border border-[color:var(--hero-panel-border)] bg-[color:var(--hero-panel)] backdrop-blur-md',
  sheet:
    'landing-glass rounded-xl border border-[color:var(--hero-card-border)] bg-[color:var(--hero-ground-deep)]/90 shadow-[var(--hero-panel-shadow)] backdrop-blur-sm',
};

export const HERO_BAND_TONES: Record<THeroMiniTone, TNodeBandTone> = {
  question: 'question',
  answer: 'answer',
  valid: 'valid',
  refuted: 'invalid',
  affected: 'affected',
  reference: 'reference',
  open: 'open',
};

export const HERO_EDGE_TONE_STROKES: Record<THeroEdgeTone, string> = {
  default: 'var(--hero-edge)',
  valid: 'var(--hero-edge-valid)',
  answer: 'var(--decision)',
  invalid: 'var(--hero-edge-invalid)',
  tainted: 'var(--hero-edge-tainted)',
  reference: 'var(--hero-edge-reference)',
};

export const HERO_EDGE_MARKER_TONES = Object.keys(HERO_EDGE_TONE_STROKES) as THeroEdgeTone[];

export const HERO_FLOWING_EDGE_TONES: readonly THeroEdgeTone[] = ['tainted', 'invalid', 'reference'];

export const HERO_CLAIM_HANDLE_CLASSES: Record<THandleId, string> = {
  top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
  left: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
  right: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
};

export const HERO_EXHIBITS: THeroExhibitId[] = ['chat', 'meetings', 'docs'];

export const HERO_BUILDER_THREADS: IHeroBuilderThread[] = [
  {
    id: 'founders',
    code: 'T-014',
    nodeTones: { a: 'valid', b: 'valid' },
    edges: [{ id: 'bv-f', source: 'bv-f-a', target: 'bv-f-b' }],
    edgeTones: new Map([['bv-f', 'valid']]),
  },
  {
    id: 'researchers',
    code: 'T-027',
    nodeTones: { a: 'reference', b: 'valid' },
    edges: [{ id: 'bv-r', source: 'bv-r-a', target: 'bv-r-b' }],
    edgeTones: new Map([['bv-r', 'reference']]),
  },
  {
    id: 'engineers',
    code: 'T-033',
    nodeTones: { a: 'refuted', b: 'affected' },
    edges: [{ id: 'bv-e', source: 'bv-e-a', target: 'bv-e-b' }],
    edgeTones: new Map([['bv-e', 'invalid']]),
  },
];

export const PRODUCT_FEATURES: IProductFeature[] = [
  { id: 'validation', span: 'lg:col-span-7' },
  { id: 'structured', span: 'lg:col-span-5' },
  { id: 'references', span: 'lg:col-span-4' },
  { id: 'collaboration', span: 'lg:col-span-8' },
];

export const EMPTY_VIGNETTE_EDGES: IHeroEdge[] = [];
export const EMPTY_VIGNETTE_TONES: ReadonlyMap<string, THeroEdgeTone> = new Map();

export const STRUCTURED_VIGNETTE_EDGES: IHeroEdge[] = [
  { id: 'sv-qa', source: 'sv-q', target: 'sv-a' },
  { id: 'sv-qb', source: 'sv-q', target: 'sv-b' },
];

export const VALIDATION_VIGNETTE_EDGES: IHeroEdge[] = [
  { id: 'vv-pc', source: 'vv-p', target: 'vv-c' },
  { id: 'vv-sc', source: 'vv-s', target: 'vv-c' },
];

export const VALIDATION_VIGNETTE_REPAIRED_EDGES = VALIDATION_VIGNETTE_EDGES.filter((edge) => edge.source !== 'vv-p');

export const COLLABORATION_VIGNETTE_EDGES: IHeroEdge[] = [{ id: 'cv-ab', source: 'cv-a', target: 'cv-b' }];

export const REFERENCES_VIGNETTE_EDGES: IHeroEdge[] = [{ id: 'rv-sr', source: 'rv-s', target: 'rv-r' }];
export const REFERENCES_VIGNETTE_TONES: ReadonlyMap<string, THeroEdgeTone> = new Map([['rv-sr', 'reference']]);

export const ARGUE_VIGNETTE_EDGES: IHeroEdge[] = [
  { id: 'hv2-qa', source: 'hv2-q', target: 'hv2-a' },
  { id: 'hv2-qb', source: 'hv2-q', target: 'hv2-b' },
];

export const DECIDE_VIGNETTE_EDGES: IHeroEdge[] = [{ id: 'hv3-ac', source: 'hv3-a', target: 'hv3-c' }];
export const DECIDE_VIGNETTE_TONES: ReadonlyMap<string, THeroEdgeTone> = new Map([['hv3-ac', 'valid']]);

const HERO_REFUTED_CLAIM_ID = 'p2';

export const HERO_CLAIMS: IHeroClaim[] = [
  { id: 'q', code: 'T-001', kind: 'question', status: null, x: 24, y: 7, width: 16 },
  {
    id: 'p2',
    code: 'P-02',
    kind: 'statement',
    status: 'valid',
    x: 3,
    y: 25,
    width: 14,
    anchor: 'right',
    align: 'end',
  },
  { id: 'p1', code: 'P-01', kind: 'statement', status: 'valid', x: 4, y: 31, width: 14, align: 'start' },
  {
    id: 'c1',
    code: 'C-01',
    kind: 'statement',
    status: 'valid',
    x: 13,
    y: 54,
    width: 15,
    anchor: 'right',
    align: 'end',
  },
  { id: 'p3', code: 'P-03', kind: 'statement', status: 'valid', x: 8, y: 79, width: 13.5, desktopOnly: true },
  {
    id: 'c2',
    code: 'C-02',
    kind: 'statement',
    status: null,
    isAnswer: true,
    x: 3,
    y: 77,
    width: 14.5,
    anchor: 'right',
    align: 'start',
  },
];

const HERO_REPAIR_CLAIM: IHeroClaim = {
  id: 'p5',
  code: 'P-05',
  kind: 'statement',
  status: 'valid',
  x: 4,
  y: 58,
  width: 13.5,
  align: 'start',
};

export const HERO_CLAIMS_REPAIRED: IHeroClaim[] = [
  ...HERO_CLAIMS.slice(0, 3),
  HERO_REPAIR_CLAIM,
  ...HERO_CLAIMS.slice(3),
];

export const HERO_EDGES: IHeroEdge[] = [
  { id: 'q-p1', source: 'q', target: 'p1' },
  { id: 'q-p2', source: 'q', target: 'p2' },
  { id: 'p1-c1', source: 'p1', target: 'c1' },
  { id: 'p2-c1', source: 'p2', target: 'c1' },
  { id: 'p3-c1', source: 'p3', target: 'c1' },
  { id: 'c1-c2', source: 'c1', target: 'c2' },
];

export const HERO_EDGES_REPAIRED: IHeroEdge[] = [
  ...HERO_EDGES.filter((edge) => edge.id !== 'p2-c1'),
  { id: 'p5-c1', source: 'p5', target: 'c1' },
];

export const HERO_PHASE_DURATION_MS: Record<THeroPhase, number> = {
  healthy: 3200,
  refuted: 3600,
  repaired: 8400,
};

export const HERO_NEXT_PHASE: Record<THeroPhase, THeroPhase> = {
  healthy: 'refuted',
  refuted: 'repaired',
  repaired: 'healthy',
};

export const HERO_SCRIPT_REFUTED: Record<THeroPhase, readonly string[]> = {
  healthy: [],
  refuted: [HERO_REFUTED_CLAIM_ID],
  repaired: [HERO_REFUTED_CLAIM_ID],
};

export const HERO_LOG_LINES: IHeroLogLine[] = [
  { id: 'opened', time: '10:31', phases: ['healthy', 'refuted', 'repaired'] },
  { id: 'refuted', time: '10:52', phases: ['refuted', 'repaired'] },
  { id: 'tainted', time: '10:52', phases: ['refuted'] },
  { id: 'rerouted', time: '11:04', phases: ['repaired'] },
  { id: 'restored', time: '11:04', phases: ['repaired'] },
];

export const HERO_VISIBLE_LOG_LINES = 2;

export const HERO_CASCADE_STEP_MS = 260;
export const HERO_ENTRANCE_TOTAL_MS = 1800;
export const HERO_ENTRANCE_NODE_STAGGER_MS = 70;
export const HERO_ENTRANCE_EDGE_BASE_MS = 500;
export const HERO_ENTRANCE_EDGE_STAGGER_MS = 90;
export const HERO_REMEASURE_DELAY_MS = 320;

export const HOW_IT_WORKS_STEP_DELAY_MS = 550;
export const VALIDATION_VIGNETTE_PHASES = 3;
export const VALIDATION_VIGNETTE_INTERVAL_MS = 3400;
export const COLLABORATION_VIGNETTE_PHASES = 3;
export const COLLABORATION_VIGNETTE_INTERVAL_MS = 2600;
export const STREAM_DECISION_INDEX = 4;

export const TILT_MAX_DEG = 2.4;
export const TICKER_DURATION_MS = 650;
export const SCREEN_VISIBLE_THRESHOLD = 0.5;
export const SNAP_HEADER_OFFSET_PX = 80;
export const SNAP_GESTURE_LOCK_MS = 900;
export const SNAP_EDGE_TOLERANCE_PX = 4;
export const SNAP_MIN_DELTA_PX = 8;
export const ARRIVAL_CONTENT_CAP_MS = 2200;

export const AURORA_FRAME_STEP_CAP_MS = 100;
export const AURORA_STATIC_FRAME_TIME_S = 18;
export const AURORA_IDLE_STOP_MS = 400;
export const AURORA_RENDER_SCALE = 0.5;

export const HERO_EDGE_CONTROL_MIN_PX = 28;
export const HERO_EDGE_CONTROL_MAX_PX = 130;
export const HERO_EDGE_CONTROL_RATIO = 0.42;

export const AURORA_VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const AURORA_FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform float time;

float hash(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  return mix(
    mix(hash(cell), hash(cell + vec2(1.0, 0.0)), curve.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), curve.x),
    curve.y
  );
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotate = mat2(0.8, 0.6, -0.6, 0.8);
  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * noise(point);
    point = rotate * point * 2.03;
    amplitude *= 0.55;
  }
  return value;
}

uniform float paper;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 point = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y * mix(1.4, 1.0, paper);
  float drift = time * 0.045;

  vec2 warpA = vec2(fbm(point + vec2(0.0, drift)), fbm(point - vec2(drift * 0.7, 0.0)));
  vec2 warpB = vec2(
    fbm(point + 1.9 * warpA + vec2(1.7, 9.2) + drift * 0.35),
    fbm(point + 1.9 * warpA + vec2(8.3, 2.8) - drift * 0.26)
  );
  float field = fbm(point + 2.4 * warpB);

  float silk = pow(max(1.0 - abs(2.0 * field - 1.0), 0.0), 7.0);
  float glow = smoothstep(0.42, 0.9, field);

  float fringeX = abs(uv.x - 0.5) * 2.0;
  float fringeY = abs(uv.y - 0.5) * 2.0;
  float ring = smoothstep(mix(0.68, 0.45, paper), 1.0, max(fringeX, fringeY));
  float presence = mix(mix(0.32, 0.62, paper), 1.0, ring);

  vec3 lime = vec3(0.29, 0.871, 0.502);
  vec3 cyan = vec3(0.404, 0.91, 0.976);
  vec3 moss = vec3(0.055, 0.19, 0.11);
  float dither = (hash(gl_FragCoord.xy + fract(time)) - 0.5) * 0.012;

  vec3 glowColor = moss * glow * 0.4;
  glowColor += lime * silk * 0.34 * presence;
  glowColor += cyan * silk * glow * 0.1 * presence;
  glowColor += dither;

  float ribbon = silk * presence;
  vec3 mist = vec3(0.952, 0.965, 0.955);
  mist = mix(mist, vec3(0.3, 0.72, 0.47), ribbon * 0.9);
  mist = mix(mist, vec3(0.33, 0.74, 0.85), ribbon * glow * 0.5);
  mist -= glow * presence * (1.0 - silk) * vec3(0.05, 0.014, 0.036);
  mist += dither;

  vec3 color = mix(max(glowColor, vec3(0.0)), clamp(mist, 0.0, 1.0), paper);
  gl_FragColor = vec4(color, 1.0);
}
`;
