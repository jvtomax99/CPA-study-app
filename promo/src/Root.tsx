import {Composition} from 'remotion';
import {HowTo} from './HowTo';
import {FPS, TOTAL} from './timeline';

// Vertical 1080 x 1920 at 30 fps, for phones. Length follows the narration (src/timing.json).
export const Root = () => (
  <Composition id="HowTo" component={HowTo} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
