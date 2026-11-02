"""Sound effects for the how-to video, synthesized here (no samples, nothing licensed):
whoosh (scene changes), tick (taps), pop (cards), chime (good news), buzz (bad news), hit (the hook's slam).
Also writes the music bed with music.py. Run from the repo root: python3 promo/tools/sfx.py"""
import os, subprocess, sys, numpy as np, soundfile as sf
SR = 44100
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "public", "sfx"); os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(3)
t_of = lambda d: np.arange(int(d * SR)) / SR

def lowpass(x, a):  # one-pole, a in (0,1): smaller = darker
    y = np.zeros_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y

def whoosh():
    t = t_of(0.55); n = rng.standard_normal(len(t))
    env = np.sin(np.pi * np.clip(t / 0.55, 0, 1)) ** 2
    # sweep brightness up then down by blending two filtered copies
    dark, bright = lowpass(n, 0.04), lowpass(n, 0.35)
    mixw = np.sin(np.pi * t / 0.55)
    return (dark * (1 - mixw) * 3 + bright * mixw) * env * 0.5

def tick():
    t = t_of(0.07); return (np.sin(2 * np.pi * 2400 * t) * 0.6 + np.sin(2 * np.pi * 1200 * t) * 0.4) * np.exp(-t * 90)

def pop():
    t = t_of(0.18); f = 380 + 900 * np.exp(-t * 40); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * 0.8

def chime():
    t = t_of(1.6); s = 0
    for f, a in [(1046.5, 1), (1568, 0.6), (2093, 0.35), (2637, 0.2)]: s = s + a * np.sin(2 * np.pi * f * t) * np.exp(-t * (2.5 + f / 1500))
    return s * np.minimum(1, t / 0.005) * 0.45

def buzz():
    t = t_of(0.45); s = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.5 + np.sin(2 * np.pi * 116 * t) * 0.5
    return lowpass(s, 0.15) * np.exp(-t * 6) * 0.6

def hit():
    t = t_of(1.2); f = 45 + 90 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)
    noise = lowpass(rng.standard_normal(len(t)), 0.2) * np.exp(-t * 14) * 0.6
    return np.tanh((body + noise) * 1.6) * 0.8

for name, fn in [("whoosh", whoosh), ("tick", tick), ("pop", pop), ("chime", chime), ("buzz", buzz), ("hit", hit)]:
    x = fn(); x = x / (np.abs(x).max() + 1e-9) * 0.9
    sf.write(os.path.join(out, name + ".wav"), x.astype(np.float32), SR, subtype="PCM_16")
    print(name, round(len(x) / SR, 2))

secs = sys.argv[1] if len(sys.argv) > 1 else "160"
wav = os.path.join(root, "public", "music.wav")
subprocess.run([sys.executable, os.path.join(root, "tools", "music.py"), secs, wav], check=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-b:a", "160k", os.path.join(root, "public", "music.mp3")], check=True)
os.remove(wav)
print("music", secs, "s")
