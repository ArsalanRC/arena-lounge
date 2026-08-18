#!/usr/bin/env python3
"""Background music: an original, royalty-free lounge loop, synthesised here (numpy) and
encoded with ffmpeg to assets/Audio/lounge-loop.ogg (Vorbis loops without the MP3 gap).

96 s, twelve slow chords in D major / B minor with a warm pad, an electric-piano arpeggio
with a dotted echo, a soft bass, a few far bells and a plate-style reverb; the reverb tail
is wrapped onto the start so the loop is seamless. Deterministic (seeded).

Run: python3 tools/gen-music.py    (needs ffmpeg on PATH)
"""
import numpy as np, subprocess, wave, os

SR = 44100
BAR = 8.0                      # seconds per chord
rng = np.random.default_rng(2026)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
# note names -> midi (octave 4 = 60..71)
N = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def m(name, octv): return 12 * (octv + 1) + N[name]

CHORDS = [   # (root name for the bass, chord tones as (name, octave))
    ('D',  [('D', 3), ('F#', 3), ('A', 3), ('C#', 4), ('E', 4)]),
    ('B',  [('B', 2), ('D', 3), ('F#', 3), ('A', 3), ('C#', 4)]),
    ('E',  [('E', 3), ('G', 3), ('B', 3), ('D', 4), ('F#', 4)]),
    ('A',  [('A', 2), ('C#', 3), ('G', 3), ('B', 3), ('F#', 4)]),
    ('G',  [('G', 2), ('B', 2), ('D', 3), ('F#', 3), ('A', 3)]),
    ('F#', [('F#', 2), ('A', 2), ('C#', 3), ('E', 3), ('G#', 3)]),
    ('B',  [('B', 2), ('D', 3), ('F#', 3), ('A', 3), ('E', 4)]),
    ('E',  [('E', 3), ('G#', 3), ('B', 3), ('D', 4), ('F#', 4)]),
    ('G',  [('G', 2), ('B', 2), ('D', 3), ('F#', 3), ('A', 3), ('E', 4)]),
    ('A',  [('A', 2), ('D', 3), ('E', 3), ('G', 3), ('B', 3)]),
    ('D',  [('D', 3), ('F#', 3), ('A', 3), ('C#', 4), ('E', 4), ('G', 4)]),
    ('A',  [('A', 2), ('C#', 3), ('E', 3), ('G', 3), ('D', 4)]),
]
TOTAL = BAR * len(CHORDS)
TAIL = 5.0
n_total = int((TOTAL + TAIL) * SR)
t_axis = np.arange(n_total) / SR
L = np.zeros(n_total); R = np.zeros(n_total)

def env_asr(n, a, r, sr=SR):
    e = np.ones(n)
    na, nr = int(a * sr), int(r * sr)
    if na > 0: e[:na] = np.linspace(0, 1, na) ** 2
    if nr > 0: e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e

def add(buf_l, buf_r, start, sig_l, sig_r=None):
    s = int(start * SR); e = min(s + len(sig_l), n_total)
    if s >= n_total: return
    buf_l[s:e] += sig_l[:e - s]
    buf_r[s:e] += (sig_l if sig_r is None else sig_r)[:e - s]

def pad_note(freq, dur, detune=0.0025):
    n = int(dur * SR); t = np.arange(n) / SR
    out_l = np.zeros(n); out_r = np.zeros(n)
    for k, (w, dt) in enumerate([(1.0, 0), (0.55, detune), (0.55, -detune)]):
        f = freq * (1 + dt)
        ph = 2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * 0.11 * t + k)   # slow vibrato-ish drift
        wave_ = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.10 * np.sin(3 * ph) + 0.05 * np.sin(4 * ph)
        out_l += w * wave_ * (1.0 if k != 2 else 0.6)
        out_r += w * wave_ * (1.0 if k != 1 else 0.6)
    e = env_asr(n, 1.8, 2.6)
    # gentle tremolo
    trem = 1 - 0.08 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * t))
    return out_l * e * trem, out_r * e * trem

def ep_note(freq, dur, vel):
    """Electric-piano-like: bell partials with fast decay, soft attack."""
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 1.6)
         + 0.35 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t * 3.5)
         + 0.12 * np.sin(2 * np.pi * freq * 3.99 * t) * np.exp(-t * 6.0)
         + 0.08 * np.sin(2 * np.pi * freq * 6.0 * t) * np.exp(-t * 9.0))
    att = np.minimum(1, t / 0.012)
    return s * att * vel

def bell(freq, dur, vel):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 0.9) + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 2.2) + 0.15 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 4.0))
    return s * np.minimum(1, t / 0.005) * vel

def bass_note(freq, dur, vel):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 2)
    return s * env_asr(n, 0.05, 0.6) * np.exp(-t * 0.35) * vel

# ---------------------------------------------------------------- arrangement
for ci, (root, tones) in enumerate(CHORDS):
    t0 = ci * BAR
    # pad: every chord tone, staggered entries for movement
    for k, (nm, oc) in enumerate(tones):
        l, r = pad_note(midi(m(nm, oc)), BAR + 2.2)
        g = 0.055 if k < 3 else 0.045
        add(L, R, t0 + 0.15 * k, l * g, r * g)
    # bass: root on 1, fifth on 3, root octave up occasionally
    fr = midi(m(root, 2 if m(root, 2) >= 40 else 3))
    add(L, R, t0, bass_note(fr, 3.6, 0.22))
    add(L, R, t0 + 4.0, bass_note(fr * (1.5 if ci % 3 else 1.0), 3.4, 0.16))
    # electric piano: arpeggio over the upper tones with a swing, gaps, echoes
    upper = [midi(m(nm, oc) + 12) for nm, oc in tones]
    step = 0.5
    k = 0
    tt = t0 + 0.25
    while tt < t0 + BAR - 0.4:
        if rng.random() < 0.72:
            f = upper[(k * 2 + ci) % len(upper)] if rng.random() < 0.7 else upper[rng.integers(len(upper))]
            vel = 0.13 + 0.06 * rng.random()
            note = ep_note(f, 2.4, vel)
            pan = 0.35 + 0.3 * rng.random()
            add(L, R, tt, note * (1 - pan), note * pan)
            # dotted-eighth echo, two repeats
            for rep, (dl, gain) in enumerate([(0.75, 0.42), (1.5, 0.2)]):
                add(L, R, tt + dl, note * gain * pan, note * gain * (1 - pan))
        tt += step * (1.0 if k % 2 == 0 else 1.15)   # light swing
        k += 1
    # far bells: one or two per chord, high, quiet
    for _ in range(rng.integers(1, 3)):
        f = upper[rng.integers(len(upper))] * 2
        b = bell(f, 4.5, 0.05 + 0.03 * rng.random())
        pan = rng.random()
        add(L, R, t0 + rng.random() * (BAR - 4), b * (1 - pan), b * pan)

# ---------------------------------------------------------------- reverb (plate-ish, FFT convolution) and loop wrap
def reverb(sig, decay=2.6, mix=0.32, seed=1):
    r = np.random.default_rng(seed)
    n = int(decay * SR)
    ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR * (6.9 / decay))
    ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))   # pre-delay ramp
    # darken the tail with a simple one-pole low-pass
    a = 0.12
    y = np.zeros_like(ir); acc = 0.0
    for i in range(0, n, 1):
        acc = acc + a * (ir[i] - acc); y[i] = acc
    ir = y / (np.abs(y).sum() * 0.5)
    wet = np.fft.irfft(np.fft.rfft(sig, len(sig) + n) * np.fft.rfft(ir, len(sig) + n))[:len(sig)]
    return sig * (1 - mix) + wet * mix

L = reverb(L, seed=1); R = reverb(R, seed=2)
n_loop = int(TOTAL * SR)
# wrap the tail (everything after TOTAL) onto the beginning, with a short fade so the seam is silent
tail_l, tail_r = L[n_loop:], R[n_loop:]
L = L[:n_loop].copy(); R = R[:n_loop].copy()
L[:len(tail_l)] += tail_l; R[:len(tail_r)] += tail_r
# master: gentle soft clip + normalise to -2 dB
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= 10 ** (-2 / 20) / np.max(np.abs(mix))
os.makedirs('assets/Audio', exist_ok=True)
tmp = 'assets/Audio/lounge-loop.wav'
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
# Homebrew's ffmpeg has no libvorbis; the native encoder needs -strict -2 and a fixed bitrate
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'vorbis', '-strict', '-2', '-b:a', '112k', 'assets/Audio/lounge-loop.ogg'], check=True)
os.remove(tmp)
print('wrote assets/Audio/lounge-loop.ogg', round(os.path.getsize('assets/Audio/lounge-loop.ogg') / 1024), 'KB,', TOTAL, 's')
