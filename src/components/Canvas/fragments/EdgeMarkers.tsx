import { ARROW_MARKER_ATTRIBUTES, ARROW_PATH_D } from '@/lib/canvas';

import { EDGE_TONE_STROKES, EDGE_TONES } from '../consts';

export const EdgeMarkers = () => (
  <svg aria-hidden width="0" height="0" className="absolute overflow-hidden">
    <defs>
      {EDGE_TONES.map((tone) => (
        <marker key={tone} id={`canvas-arrow-${tone}`} {...ARROW_MARKER_ATTRIBUTES}>
          <path d={ARROW_PATH_D} fill={EDGE_TONE_STROKES[tone]} />
        </marker>
      ))}
    </defs>
  </svg>
);
