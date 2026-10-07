"""data/audio.json for the choir track: the engine's audio API (envelopes, onsets, beat grid, sections)
measured from the music itself.

There are no stems, so the per-instrument features are proxies from a harmonic/percussive split
(median filtering of the spectrogram):
  vocal  = harmonic energy 200-4000 Hz (the choir and anything else sustained in that range)
  bass   = harmonic energy below 150 Hz
  other  = harmonic energy above 4000 Hz (air, shimmer)
  drums  = percussive energy, all bands
  kick / snare / hat onsets = percussive hits below 150 Hz / 150-5000 Hz / above 5000 Hz
  vocal onsets = harmonic entries (a new chord or voice coming in)
Beats come from an autocorrelation tempo estimate and dynamic-programming beat tracking; downbeats
assume 4/4 and take the phase with the strongest low-end hits. Check both by ear in the preview.

    python analysis/analyze_music.py            (needs numpy, scipy and ffmpeg)
"""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy.ndimage import median_filter, maximum_filter1d, uniform_filter1d

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "audio" / "battlezik-choir.mp3"
SR, FPS, NFFT = 22000, 100, 1024
HOP = SR // FPS

raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(AUDIO), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, dtype=np.float32)
dur = len(y) / SR
n = int(np.ceil(dur * FPS))
pad = np.concatenate([np.zeros(NFFT // 2, np.float32), y, np.zeros(NFFT + HOP, np.float32)])
win = np.hanning(NFFT).astype(np.float32)
S = np.abs(np.fft.rfft(np.stack([pad[i * HOP: i * HOP + NFFT] * win for i in range(n)]), axis=1)).astype(np.float32)
freqs = np.fft.rfftfreq(NFFT, 1 / SR)

# harmonic / percussive split (Fitzgerald): sustained partials are smooth in time, hits are smooth in frequency
Hm = median_filter(S, size=(31, 1))
Pm = median_filter(S, size=(1, 31))
mh = Hm ** 2 / (Hm ** 2 + Pm ** 2 + 1e-12)
Sh, Sp = S * mh, S * (1 - mh)


def band(X, a, b):
    return np.sqrt((X[:, (freqs >= a) & (freqs < b)] ** 2).mean(1))


def norm(x, smooth=3):
    x = uniform_filter1d(x, smooth)
    return np.clip(x / (np.percentile(x, 99.5) + 1e-9), 0, 1)


feat = {
    "rms": norm(band(S, 20, 11000)), "low": norm(band(S, 20, 200)), "mid": norm(band(S, 200, 2000)), "high": norm(band(S, 2000, 10000)),
    "vocal": norm(band(Sh, 200, 4000), 5), "bass": norm(band(Sh, 20, 150), 5), "other": norm(band(Sh, 4000, 11000), 5), "drums": norm(band(Sp, 20, 11000)),
}


def flux(X, a, b):
    L = np.log1p(40 * X[:, (freqs >= a) & (freqs < b)])
    d = np.maximum(0, L[1:] - L[:-1]).mean(1)
    return np.concatenate([[0], d])


def peaks(f, wait=0.1, k=2.2, floor=0.2):
    """Onsets: local maxima of a flux curve above a moving threshold. Returns [[t, strength 0..1]]."""
    f = f / (np.percentile(f, 99.8) + 1e-9)
    w = int(wait * FPS)
    mx = maximum_filter1d(f, 2 * w + 1)
    mean = uniform_filter1d(f, FPS)
    sd = np.sqrt(np.maximum(0, uniform_filter1d(f * f, FPS) - mean ** 2))
    idx = np.where((f == mx) & (f > mean + k * sd) & (f > floor))[0]
    return [[round(i / FPS, 3), round(float(min(1, f[i])), 3)] for i in idx]


onsets = {
    "kick": peaks(flux(Sp, 20, 150)), "snare": peaks(flux(Sp, 150, 5000)), "hat": peaks(flux(Sp, 5000, 11000), wait=0.05),
    "vocal": peaks(flux(Sh, 200, 4000), wait=0.2, k=1.6, floor=0.15),
}

# impacts: the whole mix jumping up within a tenth of a second (the hits a cut or a slam should land on)
rise = np.concatenate([np.zeros(2), feat["rms"][10:] - feat["rms"][:-10], np.zeros(8)])
onsets["impact"] = [[round(i / FPS + 0.02, 3), round(float(min(1, rise[i] / 0.6)), 3)]
                    for i in np.where((rise == maximum_filter1d(rise, 61)) & (rise > 0.22))[0]]

# silences: the mix below 4% for at least 0.35 s
quiet = np.concatenate([[False], feat["rms"] < 0.04, [False]])
q0, q1 = np.where(quiet[1:] & ~quiet[:-1])[0], np.where(~quiet[1:] & quiet[:-1])[0]
silences = [[round(a / FPS, 2), round(b / FPS, 2)] for a, b in zip(q0, q1) if b - a >= 35]

# ---------------------------------------------------------------- tempo and beats
env = flux(S, 20, 11000)
env = env - uniform_filter1d(env, FPS)
env = np.maximum(0, env) / (env.std() + 1e-9)
ac = np.correlate(env, env, "full")[len(env) - 1:]
lags = np.arange(len(ac))
bpm_of = lambda lag: 60 * FPS / lag
cand = lags[(lags >= int(60 * FPS / 200)) & (lags <= int(60 * FPS / 50))]
prior = np.exp(-0.5 * (np.log2(bpm_of(cand) / 120) / 0.8) ** 2)  # of two octave-related tempi, the finer grid is the more useful one
score = ac[cand] * prior
lag = int(cand[np.argmax(score)])
# refine by parabolic interpolation
a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]
period = lag + 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
bpm = 60 * FPS / period
top = cand[np.argsort(score)[::-1]]
alts = []
for l in top:
    if all(abs(l - m) > 3 for m in alts):
        alts.append(int(l))
    if len(alts) == 4:
        break

# dynamic programming (Ellis 2007): beats maximise onset strength with a penalty for leaving the tempo
tight = 100.0
N = len(env)
cum = env.copy()
back = -np.ones(N, int)
lo, hi = int(round(period * 0.5)), int(round(period * 2))
prange = np.arange(-hi, -lo)
pen = -tight * np.log(-prange / period) ** 2
for i in range(hi, N):
    sc = cum[i + prange] + pen
    j = int(np.argmax(sc))
    cum[i] = env[i] + sc[j]
    back[i] = i + prange[j]
i = int(np.argmax(cum[-int(period):]) + N - int(period))
bt = []
while i >= 0:
    bt.append(i)
    i = back[i]
bt = np.array(bt[::-1]) / FPS
# extend the grid to both ends at the local period
per = np.median(np.diff(bt))
while bt[0] - per > -0.02:
    bt = np.concatenate([[bt[0] - per], bt])
while bt[-1] + per < dur:
    bt = np.concatenate([bt, [bt[-1] + per]])
bt = bt[bt >= 0]
# a track made on a click has one tempo: when the tracked beats sit on a straight line, use the line
# (the tracker wanders a few hundredths of a second from beat to beat; the music does not)
k = np.arange(len(bt))
slope, icpt = np.polyfit(k, bt, 1)
wander = float(np.median(np.abs(bt - (slope * k + icpt))))
steady = wander < 0.05
if steady:
    half = round(60 / slope * 2) / 2  # a click track is set to a round tempo
    if abs(60 / slope - half) < 0.15:
        slope = 60 / half
    icpt = float(np.median(bt - slope * k))
    icpt -= slope * np.floor(icpt / slope + 0.5)  # nearest grid line to 0
    bt = np.arange(0, int((dur - icpt) / slope) + 1) * slope + icpt
    bt = bt[(bt >= -0.03) & (bt < dur)].clip(0)
    per, bpm = slope, 60 / slope

lowhit = flux(S, 20, 200)
strength = np.array([lowhit[max(0, int(t * FPS) - 3): int(t * FPS) + 4].max() for t in bt])
phase = int(np.argmax([strength[p::4].mean() for p in range(4)]))
down = bt[phase::4]

# ---------------------------------------------------------------- sections
# novelty of a checkerboard kernel over the self-similarity of half-second band-energy frames
edges = np.geomspace(60, 10000, 17)
B = np.stack([np.log1p(30 * band(S, edges[k], edges[k + 1])) for k in range(16)], 1)
step = FPS // 2
m = len(B) // step
F = B[: m * step].reshape(m, step, -1).mean(1)
F = (F - F.mean(0)) / (F.std(0) + 1e-9)
F /= np.linalg.norm(F, axis=1, keepdims=True) + 1e-9
SS = F @ F.T
K = 12  # 6 s either side
g = np.exp(-0.5 * (np.arange(-K, K) + 0.5) ** 2 / (K / 2) ** 2)
ker = np.outer(g, g) * np.outer(np.sign(np.arange(-K, K) + 0.5), np.sign(np.arange(-K, K) + 0.5))
nov = np.zeros(m)
for i in range(K, m - K):
    nov[i] = (SS[i - K: i + K, i - K: i + K] * ker).sum()
nov = np.maximum(0, nov)
nov /= nov.max() + 1e-9
mxn = maximum_filter1d(nov, 2 * 12 + 1)  # at least 6 s apart
cuts = [i * step / FPS for i in np.where((nov == mxn) & (nov > 0.12))[0]]
# musical changes land on the nearest downbeat; a silence opens and closes a section exactly
cuts = [float(down[np.argmin(np.abs(down - c))]) for c in cuts if 4 < c < dur - 4]
hard = [t for a0, b0 in silences for t in (a0, b0) if 1 < t < dur - 0.5]
cuts = sorted(hard + [c for c in cuts if all(abs(c - h) > 3 for h in hard)])
bounds = [0.0] + [c for i, c in enumerate(cuts) if i == 0 or c - cuts[i - 1] > 0.3] + [dur]
sections = []
for k in range(len(bounds) - 1):
    a0, b0 = bounds[k], bounds[k + 1]
    sl = slice(int(a0 * FPS), max(int(a0 * FPS) + 1, int(b0 * FPS)))
    sections.append({"name": f"s{k}", "start": round(a0, 3), "end": round(b0, 3),
                     "energy": round(float(feat["rms"][sl].mean()), 3), "vocal": round(float(feat["vocal"][sl].mean()), 3),
                     "drums": round(float(feat["drums"][sl].mean()), 3), "bass": round(float(feat["bass"][sl].mean()), 3)})

out = {
    "duration": round(dur, 3), "bpm": round(float(bpm), 2), "beat_period": round(float(per), 4), "time_signature": 4,
    "beats": [round(float(t), 3) for t in bt], "downbeats": [round(float(t), 3) for t in down],
    "sections": sections, "fps": FPS,
    **{k: v.round(4).tolist() for k, v in feat.items()},
    "onsets": onsets, "silences": silences,
    "notes": "No stems: vocal/bass/other/drums are harmonic-percussive proxies, see analysis/analyze_music.py. Downbeats assume 4/4.",
}
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "audio.json").write_text(json.dumps(out), encoding="utf-8")

print(f"duration {dur:.2f}s  tempo {bpm:.2f} BPM (period {per:.3f}s)  beats {len(bt)}  bars {len(down)}  first downbeat {down[0]:.2f}s")
print("tempo candidates: " + ", ".join(f"{bpm_of(l):.1f}" for l in alts))
print(f"beat grid: {'regular' if steady else 'tracked (tempo varies)'}, tracker wander {wander * 1000:.0f} ms, first beat {bt[0]:.3f}s")
print("onsets: " + ", ".join(f"{k} {len(v)}" for k, v in onsets.items()))
print("impacts: " + " ".join(f"{t:.2f}({v:.2f})" for t, v in onsets["impact"]))
print("silences: " + " ".join(f"{a:.2f}-{b:.2f}" for a, b in silences))
print("section  start    end   bars  energy vocal drums bass")
for s in sections:
    bars = (s["end"] - s["start"]) / (per * 4)
    print(f"  {s['name']:<4} {s['start']:6.2f} {s['end']:6.2f}  {bars:5.1f}  {s['energy']:.2f}   {s['vocal']:.2f}  {s['drums']:.2f}  {s['bass']:.2f}")
print("energy per 5 s: " + " ".join(f"{feat['rms'][i * 500:(i + 1) * 500].mean():.2f}" for i in range(int(dur // 5) + 1)))
