#!/usr/bin/env python3
"""Synthesise the scene's sound effects as small 16-bit mono WAVs (no deps).

  assets/Audio/drop.wav   plastic disc landing with a tiny bounce
  assets/Audio/win.wav    four-note ascending chime
  assets/Audio/lose.wav   soft two-note descending sting
  assets/Audio/turn.wav   gentle "your move" ding
  assets/Audio/sit.wav    soft click when taking a seat

Run: python3 tools/gen-sounds.py
"""
import math, random, struct, wave, os

SR = 22050
random.seed(3)

def write_wav(path, samples):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    peak = max(1e-6, max(abs(s) for s in samples))
    gain = 0.92 / peak
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * gain)) * 32767)) for s in samples))
    print(f'wrote {path} ({len(samples)/SR:.2f}s)')

def env(t, attack, decay, total):
    if t < attack: return t / attack
    return math.exp(-(t - attack) / decay) if t < total else 0.0

def tone(freq, dur, attack=0.005, decay=0.15, harmonics=((1, 1.0), (2, 0.35), (3, 0.12)), start=0.0, out=None):
    n = int(dur * SR)
    if out is None: out = [0.0] * n
    for i in range(n):
        t = i / SR
        a = env(t, attack, decay, dur)
        v = sum(amp * math.sin(2 * math.pi * freq * h * t) for h, amp in harmonics)
        idx = int(start * SR) + i
        while idx >= len(out): out.append(0.0)
        out[idx] += a * v
    return out

def drop():
    dur = 0.32
    n = int(dur * SR); out = [0.0] * n
    for i in range(n):
        t = i / SR
        # thunk: pitch falls 220 -> 120 Hz over 60 ms, fast decay
        f = 120 + 100 * math.exp(-t / 0.03)
        thunk = math.sin(2 * math.pi * f * t) * math.exp(-t / 0.045)
        # click transient (filtered noise) in the first 6 ms
        click = (random.random() * 2 - 1) * math.exp(-t / 0.004) * 0.9
        # small bounce at 110 ms, and a fainter one at 190 ms
        b1 = math.sin(2 * math.pi * 170 * (t - 0.11)) * math.exp(-(t - 0.11) / 0.03) * 0.5 if t > 0.11 else 0
        b2 = math.sin(2 * math.pi * 190 * (t - 0.19)) * math.exp(-(t - 0.19) / 0.025) * 0.25 if t > 0.19 else 0
        out[i] = thunk + click + b1 + b2
    return out

def chime(notes, note_len, decay=0.35, gap=0.12):
    total = gap * (len(notes) - 1) + note_len + 0.4
    out = [0.0] * int(total * SR)
    for k, f in enumerate(notes):
        tone(f, note_len + 0.4, attack=0.008, decay=decay, start=k * gap, out=out)
    return out

def click():
    dur = 0.12; n = int(dur * SR); out = [0.0] * n
    for i in range(n):
        t = i / SR
        out[i] = (random.random() * 2 - 1) * math.exp(-t / 0.006) * 0.6 + math.sin(2 * math.pi * 900 * t) * math.exp(-t / 0.02) * 0.5
    return out

write_wav('assets/Audio/drop.wav', drop())
write_wav('assets/Audio/win.wav', chime([523.25, 659.25, 783.99, 1046.5], 0.16, decay=0.32, gap=0.13))
write_wav('assets/Audio/lose.wav', chime([659.25, 523.25], 0.22, decay=0.4, gap=0.22))
write_wav('assets/Audio/turn.wav', chime([880.0, 1174.66], 0.12, decay=0.22, gap=0.11))
write_wav('assets/Audio/sit.wav', click())
