#!/usr/bin/env python3
import math
import os
import random
import wave
import struct
from typing import Callable, List

SR = 16000
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'audio')


def clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def env(t: float, attack: float, release: float, dur: float) -> float:
    a = min(1.0, t / max(attack, 1e-4))
    r = min(1.0, max(0.0, (dur - t) / max(release, 1e-4)))
    return a * r


def write_wav(name: str, samples: List[float]):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray()
        for s in samples:
            v = int(clamp(s) * 32767)
            frames.extend(struct.pack('<h', v))
        wf.writeframes(bytes(frames))
    print(path)


def render(seconds: float, fn: Callable[[float], float]) -> List[float]:
    n = int(seconds * SR)
    return [fn(i / SR) for i in range(n)]


def menu_loop():
    dur = 12.0
    freqs = [55.0, 82.4, 110.0]
    def fn(t: float) -> float:
        pad = 0.0
        for i, f in enumerate(freqs):
            pad += math.sin(2 * math.pi * (f + 0.04 * math.sin(2 * math.pi * 0.11 * t + i)) * t) * (0.13 - i * 0.02)
        pulse = 0.04 * math.sin(2 * math.pi * 1.8 * t) * (0.5 + 0.5 * math.sin(2 * math.pi * 0.08 * t))
        grit = (random.random() * 2 - 1) * 0.015
        return (pad + pulse + grit) * 0.7
    return render(dur, fn)


def gameplay_loop():
    dur = 10.0
    beat = 120 / 60.0
    def fn(t: float) -> float:
        bass = math.sin(2 * math.pi * (85 + 8 * math.sin(2 * math.pi * 0.3 * t)) * t) * 0.18
        arp = math.sin(2 * math.pi * (220 + 30 * math.sin(2 * math.pi * beat * t)) * t) * 0.06
        step = (1.0 if math.sin(2 * math.pi * beat * 2 * t) > 0.6 else 0.0) * 0.08
        hiss = (random.random() * 2 - 1) * 0.01
        return (bass + arp + step + hiss) * 0.8
    return render(dur, fn)


def game_over_sting():
    dur = 1.6
    def fn(t: float) -> float:
        f = 520 * (1 - 0.65 * (t / dur))
        tone = math.sin(2 * math.pi * f * t) * 0.38
        sub = math.sin(2 * math.pi * (f / 2.5) * t) * 0.2
        return (tone + sub) * env(t, 0.02, 0.7, dur)
    return render(dur, fn)


def jump_sfx():
    dur = 0.22
    def fn(t: float) -> float:
        f = 260 + 600 * (t / dur)
        return math.sin(2 * math.pi * f * t) * 0.48 * env(t, 0.01, 0.15, dur)
    return render(dur, fn)


def hit_sfx():
    dur = 0.28
    def fn(t: float) -> float:
        noise = (random.random() * 2 - 1) * 0.7
        tone = math.sin(2 * math.pi * 120 * t) * 0.2
        return (noise + tone) * env(t, 0.005, 0.2, dur) * 0.5
    return render(dur, fn)


def score_sfx():
    dur = 0.18
    def fn(t: float) -> float:
        f = 700 + 420 * (t / dur)
        return math.sin(2 * math.pi * f * t) * 0.4 * env(t, 0.005, 0.1, dur)
    return render(dur, fn)


def ui_click_sfx():
    dur = 0.08
    def fn(t: float) -> float:
        return (math.sin(2 * math.pi * 1400 * t) * 0.4 + (random.random() * 2 - 1) * 0.08) * env(t, 0.001, 0.04, dur)
    return render(dur, fn)


if __name__ == '__main__':
    random.seed(42)
    write_wav('menu-loop.wav', menu_loop())
    write_wav('gameplay-loop.wav', gameplay_loop())
    write_wav('game-over-sting.wav', game_over_sting())
    write_wav('sfx-jump.wav', jump_sfx())
    write_wav('sfx-hit.wav', hit_sfx())
    write_wav('sfx-score.wav', score_sfx())
    write_wav('sfx-ui-click.wav', ui_click_sfx())
