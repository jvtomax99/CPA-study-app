"""Narration for the how-to video, from promo/src/script.json.
Voice: Kokoro-82M (Apache 2.0, runs offline), voice am_michael at 1.08x (picked from samples, 2026-11-02). Setup:
  pip install kokoro-onnx soundfile
  download kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
Run from the repo root: python3 promo/tools/voice.py <folder holding the two model files>
Writes promo/public/voice/<scene>-<n>.wav and promo/src/timing.json (each line's length in seconds).
SAY rewrites a few section codes as they're said aloud; the subtitles keep the script's text."""
import json, os, re, sys
import soundfile as sf
from kokoro_onnx import Kokoro

VOICE, SPEED = "am_michael", 1.08
SAY = {"REG": "Reg", "FAR": "Far", "AUD": "Aud", "TCP": "T C P"}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
models = sys.argv[1]
k = Kokoro(os.path.join(models, "kokoro-v1.0.onnx"), os.path.join(models, "voices-v1.0.bin"))
script = json.load(open(os.path.join(root, "src", "script.json")))
out = os.path.join(root, "public", "voice")
os.makedirs(out, exist_ok=True)
timing = {}
for scene in script:
    for i, line in enumerate(scene["lines"]):
        said = re.sub(r"\b(" + "|".join(SAY) + r")\b", lambda m: SAY[m.group(1)], line)
        samples, rate = k.create(said, voice=VOICE, speed=SPEED, lang="en-us")
        name = f"{scene['id']}-{i}.wav"
        sf.write(os.path.join(out, name), samples, rate)
        timing[name] = round(len(samples) / rate, 3)
        print(f"{name}: {timing[name]:.2f}s")
json.dump(timing, open(os.path.join(root, "src", "timing.json"), "w"), indent=1)
print(f"total speech {sum(timing.values()):.1f}s")
