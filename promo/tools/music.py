"""An original, quiet lo-fi bed for the how-to video: soft electric-piano chords, a warm bass,
a light kick and hat at 84 bpm, synthesized here (no samples, nothing licensed).
Run: python3 promo/tools/music.py <seconds> <out.wav>"""
import sys, numpy as np, soundfile as sf
SR, BPM = 44100, 84
secs, out = float(sys.argv[1]), sys.argv[2]
beat = 60 / BPM; n = int(secs * SR); mix = np.zeros(n)
t_of = lambda d: np.arange(int(d * SR)) / SR
def add(sig, at):
    i = int(at * SR); j = min(n, i + len(sig))
    if i < n: mix[i:j] += sig[: j - i]
def keys(freqs, dur):  # Rhodes-ish: sine + soft 2nd harmonic, slow attack, long decay, gentle tremolo
    t = t_of(dur); env = np.minimum(1, t / 0.04) * np.exp(-t * 1.1)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
    return sum((np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) * np.exp(-t * 3)) for f in freqs) * env * trem / len(freqs)
def bass(f, dur):
    t = t_of(dur); return np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.01) * np.exp(-t * 2.2)
def kick():
    t = t_of(0.35); f = 50 + 70 * np.exp(-t * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
rng = np.random.default_rng(7)
def hat():
    t = t_of(0.06); x = rng.standard_normal(len(t)); x = np.diff(x, prepend=0); return x * np.exp(-t * 70) * 0.25
m = lambda k: 440 * 2 ** ((k - 69) / 12)
prog = [([60, 64, 67, 71], 48), ([57, 60, 64, 67], 45), ([53, 57, 60, 64], 41), ([55, 59, 62, 65], 43)]  # Cmaj7 Am7 Fmaj7 G7
bar = 4 * beat; b = 0
while b * bar < secs:
    ch, root = prog[b % 4]; at = b * bar
    add(keys([m(k) for k in ch], bar * 1.1) * 0.5, at); add(keys([m(ch[-1] + 12)], beat) * 0.15, at + 2.5 * beat)
    add(bass(m(root), beat * 1.6) * 0.45, at); add(bass(m(root), beat * 0.9) * 0.35, at + 2.5 * beat)
    for q in range(4):
        if q in (0, 2): add(kick() * 0.55, at + q * beat)
        add(hat(), at + q * beat + beat / 2); add(hat() * 0.5, at + q * beat + beat * 0.75)
    b += 1
fade = np.minimum(1, np.minimum(np.arange(n) / (SR * 1.5), (n - np.arange(n)) / (SR * 2.5)))
mix = np.tanh(mix * 1.2) * fade; mix /= np.abs(mix).max() + 1e-9
sf.write(out, np.stack([mix, mix], 1) * 0.9, SR)
