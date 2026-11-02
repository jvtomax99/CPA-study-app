import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
fs.mkdirSync('out/stills', {recursive: true});
const frames = process.argv.slice(2).map(Number);
// Test stills of the how-to video at half size: node tools/stills.mjs 120 900 2400 (frame numbers; run in promo/).
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER; // unset: Remotion fetches its own
const composition = await selectComposition({serveUrl, id: 'HowTo', browserExecutable});
for (const frame of frames) {
  await renderStill({composition, serveUrl, frame, output: `out/stills/${String(frame).padStart(5, '0')}.png`, browserExecutable, scale: 0.5});
  console.log('still', frame);
}
