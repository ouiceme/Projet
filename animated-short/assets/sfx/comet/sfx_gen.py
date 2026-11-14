# Synthesised sound effects and a quiet music bed for the Comet short. Pure Python (wave / struct / math / random).
import wave, struct, math, random
SR = 48000
random.seed(11)
TAU = 2 * math.pi
def save(name, s, peak=0.8):
    m = max(1e-9, max(abs(x) for x in s)); k = peak / m
    with wave.open('sfx/' + name + '.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, x * k)) * 32767)) for x in s))
def lp(s, a):
    y = 0.0; out = []
    for x in s: y += a * (x - y); out.append(y)
    return out
def hp(s, a): l = lp(s, a); return [x - y for x, y in zip(s, l)]
def env(n, att, rel): return [min(1.0, i / (att * SR + 1), (n - i) / (rel * SR + 1)) for i in range(n)]
# jet whine of the Comet: filtered noise + a rising turbine tone, slow swell
n = int(4.5 * SR); e = env(n, 1.6, 1.8); s = []; y = 0.0
for i in range(n):
    t = i / SR; y += 0.09 * ((random.random() * 2 - 1) - y)
    s.append((y * 2.2 + 0.16 * math.sin(TAU * (900 + 260 * t / 4.5) * t) + 0.08 * math.sin(TAU * (1810 + 500 * t / 4.5) * t)) * e[i])
save('jet', s, 0.5)
# cabin chime (two soft notes)
n = int(1.4 * SR); s = [0.0] * n
for f, t0 in ((659.26, 0.0), (523.25, 0.42)):
    for i in range(int(t0 * SR), n):
        t = (i - t0 * SR) / SR; s[i] += (math.sin(TAU * f * t) + 0.3 * math.sin(TAU * 2 * f * t)) * math.exp(-t / 0.35) * min(1.0, t * 400)
save('chime', s, 0.45)
# one low, soft bell (1954: sober, no dramatic effect)
n = int(3.0 * SR); s = []
for i in range(n):
    t = i / SR; v = 0
    for f, a, d in ((196, 1, 1.3), (392.5, .5, .9), (588, .25, .6), (831, .12, .4)): v += a * math.sin(TAU * f * t) * math.exp(-t / d)
    s.append(v * min(1.0, t * 120))
save('bell', s, 0.5)
# wheel chock / heavy thud (the fleet is grounded)
n = int(0.45 * SR); s = [math.sin(TAU * (95 - 45 * i / n) * i / SR) * math.exp(-i / (0.09 * SR)) + 0.4 * (random.random() * 2 - 1) * math.exp(-i / (0.012 * SR)) for i in range(n)]
save('thud', lp(s, 0.3), 0.7)
# splash (the hull goes into the tank)
n = int(1.1 * SR); s = []; y = 0.0
for i in range(n):
    u = i / n; a = 0.5 - 0.42 * u; y += a * ((random.random() * 2 - 1) - y); s.append(y * (min(1.0, u * 40) * (1 - u) ** 1.6))
save('splash', hp(s, 0.02), 0.55)
# pump: pressure up (rising hiss) and pressure down (falling hiss)
for name, up in (('pump_up', True), ('pump_down', False)):
    n = int(0.42 * SR); s = []; y = 0.0
    for i in range(n):
        u = i / n; k = u if up else 1 - u; a = 0.05 + 0.3 * k; y += a * ((random.random() * 2 - 1) - y)
        s.append((y + 0.25 * math.sin(TAU * (150 + 170 * k) * i / SR)) * math.sin(math.pi * u) ** 0.8)
    save(name, s, 0.45)
# metal crack: sharp transient + short inharmonic ring
n = int(0.7 * SR); s = []
for i in range(n):
    t = i / SR; v = (random.random() * 2 - 1) * 1.6 * math.exp(-t / 0.006)
    for f, a, d in ((520, 1, .12), (1370, .7, .1), (2950, .5, .06), (4100, .3, .04)): v += a * math.sin(TAU * f * t + f) * math.exp(-t / d)
    s.append(v)
save('crack', s, 0.8)
# rubbery stretch (the cabin swells like a balloon)
n = int(0.6 * SR); s = [math.sin(TAU * (180 + 260 * (i / n) ** 2) * i / SR) * (1 + 0.5 * math.sin(TAU * 31 * i / SR)) * math.sin(math.pi * i / n) for i in range(n)]
save('stretch', lp(s, 0.25), 0.4)
# small pop (labels, check marks) and soft whoosh (the effort spreads)
n = int(0.14 * SR); s = [math.sin(TAU * (620 + 500 * (i / n)) * i / SR) * math.exp(-i / (0.035 * SR)) for i in range(n)]
save('pop', s, 0.45)
n = int(0.8 * SR); s = []; y = 0.0
for i in range(n):
    u = i / n; a = 0.02 + 0.2 * math.sin(math.pi * u) ** 2; y += a * ((random.random() * 2 - 1) - y); s.append(y * math.sin(math.pi * u) ** 1.5)
save('whoosh', s, 0.5)
# music bed: slow warm pad, Dm - Bb - F - C, 4 s per chord, soft bell on each change
DUR = 66.7; n = int(DUR * SR); s = [0.0] * n
CH = [(73.42, 146.83, 174.61, 220.0), (58.27, 116.54, 146.83, 174.61), (87.31, 130.81, 174.61, 220.0), (65.41, 130.81, 164.81, 196.0)]
L = int(4.0 * SR); X = int(1.2 * SR); k = 0; pos = 0
while pos < n:
    notes = CH[k % 4]; ln = min(L + X, n - pos)
    for j, f in enumerate(notes):
        w = TAU * f / SR; a = (0.5, 0.32, 0.26, 0.22)[j]; w2 = TAU * f * 2.003 / SR
        for i in range(ln):
            g = min(1.0, i / X, (ln - i) / X); s[pos + i] += a * g * (math.sin(w * i) + 0.18 * math.sin(w2 * i))
    wb = TAU * notes[3] * 2 / SR
    for i in range(min(int(2.5 * SR), n - pos)): s[pos + i] += 0.1 * math.sin(wb * i) * math.exp(-i / (0.7 * SR)) * min(1.0, i / 200)
    pos += L; k += 1
fi = int(2.0 * SR); fo = int(3.0 * SR)
s = [x * min(1.0, i / fi, (n - i) / fo) for i, x in enumerate(s)]
save('music', lp(s, 0.35), 0.5)
print('ok')
