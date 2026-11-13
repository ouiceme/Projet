# Synthesised sound effects and a quiet music bed for the Wald short. Pure Python (wave / struct / math / random).
import wave, struct, math, random
SR = 48000
random.seed(7)
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
def env(n, att, rel):  # linear attack, linear release (seconds)
    return [min(1.0, i / (att * SR + 1), (n - i) / (rel * SR + 1)) for i in range(n)]
TAU = 2 * math.pi
# bomber coming home: four radial engines beating, slow swell
n = int(4.0 * SR); e = env(n, 1.4, 1.5); s = []
for i in range(n):
    t = i / SR; v = 0
    for f, a in ((82, 1), (86.5, .9), (91, .7), (164, .45), (173, .4), (246, .2)):
        ph = (f * t) % 1.0; v += a * (2 * ph - 1)
    s.append(v * (0.75 + 0.25 * math.sin(TAU * 9 * t)) * e[i])
save('drone', lp(s, 0.06), 0.55)
# pencil tick on the tally sheet
n = int(0.09 * SR); s = [(random.random() * 2 - 1) * math.exp(-i / (0.012 * SR)) + 0.6 * math.sin(TAU * 1900 * i / SR) * math.exp(-i / (0.006 * SR)) for i in range(n)]
save('tick', hp(s, 0.25), 0.6)
# armour plate landing: inharmonic metal partials + transient
n = int(0.9 * SR); s = []
for i in range(n):
    t = i / SR; v = 0
    for f, a, d in ((410, 1, .22), (935, .8, .3), (1580, .6, .2), (2390, .45, .14), (3310, .3, .1), (4420, .2, .07)):
        v += a * math.sin(TAU * f * t + 0.3 * f) * math.exp(-t / d)
    s.append(v + (random.random() * 2 - 1) * 1.2 * math.exp(-t / 0.008))
save('clang', s, 0.8)
# sheet of paper landing on the pile
n = int(0.22 * SR); e = env(n, 0.03, 0.16); s = [(random.random() * 2 - 1) * e[i] for i in range(n)]
save('paper', hp(lp(s, 0.5), 0.12), 0.35)
# soft whoosh (the planes that vanish / the forgotten crowd)
n = int(0.8 * SR); s = []; y = 0.0
for i in range(n):
    u = i / n; a = 0.02 + 0.2 * math.sin(math.pi * u) ** 2; y += a * ((random.random() * 2 - 1) - y); s.append(y * math.sin(math.pi * u) ** 1.5)
save('whoosh', s, 0.5)
# small pop (check marks, winners)
n = int(0.14 * SR); s = [math.sin(TAU * (620 + 500 * (i / n)) * i / SR) * math.exp(-i / (0.035 * SR)) for i in range(n)]
save('pop', s, 0.45)
# rubber stamp
n = int(0.3 * SR); s = [math.sin(TAU * (120 - 60 * i / n) * i / SR) * math.exp(-i / (0.06 * SR)) + 0.5 * (random.random() * 2 - 1) * math.exp(-i / (0.01 * SR)) for i in range(n)]
save('stamp', lp(s, 0.3), 0.7)
# music bed: slow warm pad, Am - F - C - G, 4 s per chord, with a soft high bell on each change
DUR = 68.4; n = int(DUR * SR); s = [0.0] * n
CH = [(110.0, 220.0, 261.63, 329.63), (87.31, 174.61, 220.0, 261.63), (130.81, 196.0, 261.63, 329.63), (98.0, 196.0, 246.94, 293.66)]
L = int(4.0 * SR); X = int(1.2 * SR)
k = 0; pos = 0
while pos < n:
    notes = CH[k % 4]; ln = min(L + X, n - pos)
    for j, f in enumerate(notes):
        w = TAU * f / SR; a = (0.5, 0.32, 0.26, 0.22)[j]; w2 = TAU * f * 2.003 / SR
        for i in range(ln):
            g = min(1.0, i / X, (ln - i) / X)
            s[pos + i] += a * g * (math.sin(w * i) + 0.18 * math.sin(w2 * i))
    fb = notes[3] * 2; wb = TAU * fb / SR
    for i in range(min(int(2.5 * SR), n - pos)): s[pos + i] += 0.12 * math.sin(wb * i) * math.exp(-i / (0.7 * SR)) * min(1.0, i / 200)
    pos += L; k += 1
fi = int(2.0 * SR); fo = int(3.0 * SR)
s = [x * min(1.0, i / fi, (n - i) / fo) for i, x in enumerate(s)]
save('music', lp(s, 0.35), 0.5)
print('ok')
