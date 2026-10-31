"""Genera los 29 sonidos de NEO en app/sounds/ (WAV 48 kHz, 16 bits, mono).

Todo es síntesis propia (tonos, glissandos y ruido filtrado), sin muestras de
terceros, así que los sonidos son libres de distribuir. Solo librería estándar:

    uv run --no-project scripts/gen-sounds.py

Las duraciones siguen las de los sonidos originales, porque las animaciones de
la isla esperan esos tiempos.
"""

import math
import random
import struct
import wave
from pathlib import Path

SR = 48_000
SALIDA = Path(__file__).resolve().parent.parent / "sounds"
random.seed(7)  # el mismo ruido en cada ejecución: los WAV no cambian si no cambia el script


def nota(n: str) -> float:
    """'A4' -> 440 Hz."""
    nombres = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    semis = nombres[n[0]] + (1 if "#" in n else 0) + (int(n[-1]) - 4) * 12
    return 440.0 * 2 ** (semis / 12)


def silencio(dur: float) -> list[float]:
    return [0.0] * int(SR * dur)


def tono(f0, f1=None, dur=0.1, forma="sine", vol=0.6, ataque=0.005, caida=0.06, vibrato=0.0, vib_hz=6.0):
    """Un tono con glissando de f0 a f1 (exponencial) y envolvente suave."""
    f1 = f1 or f0
    n = int(SR * dur)
    fase = 0.0
    out = []
    for i in range(n):
        t = i / SR
        p = i / max(1, n - 1)
        f = f0 * (f1 / f0) ** p
        f *= 1 + vibrato * math.sin(2 * math.pi * vib_hz * t)
        fase += 2 * math.pi * f / SR
        if forma == "sine":
            s = math.sin(fase)
        elif forma == "tri":
            s = 2 / math.pi * math.asin(math.sin(fase))
        else:  # "suave": cuadrada redondeada, timbre de robot sin ser áspera
            s = math.tanh(3 * math.sin(fase)) * 0.8
        env = min(1.0, t / ataque) if ataque > 0 else 1.0
        resto = dur - t
        if resto < caida:
            env *= max(0.0, resto / caida)
        out.append(s * env * vol)
    return out


def ruido(dur, vol=0.3, corte=0.15, caida=None):
    """Ruido blanco filtrado (paso bajo de un polo) con caída exponencial."""
    n = int(SR * dur)
    caida = caida or dur
    y = 0.0
    out = []
    for i in range(n):
        y += corte * (random.uniform(-1, 1) - y)
        out.append(y * vol * math.exp(-i / SR / (caida / 4)))
    return out


def unir(*partes):
    out = []
    for p in partes:
        out.extend(p)
    return out


def mezclar(*capas):
    """Suma capas (lista de (inicio_s, muestras))."""
    largo = max(int(SR * ini) + len(m) for ini, m in capas)
    out = [0.0] * largo
    for ini, m in capas:
        o = int(SR * ini)
        for i, v in enumerate(m):
            out[o + i] += v
    return out


def eco(m, retardo=0.09, ganancia=0.3, veces=2):
    d = int(SR * retardo)
    out = m + [0.0] * d * veces
    for k in range(1, veces + 1):
        g = ganancia**k
        for i, v in enumerate(m):
            out[i + d * k] += v * g
    return out


def arpegio(notas, paso, dur, forma="tri", vol=0.5):
    return mezclar(*[(i * paso, tono(nota(n), dur=dur, forma=forma, vol=vol)) for i, n in enumerate(notas)])


def guardar(nombre, m, duracion):
    """Recorta o rellena a la duración pedida, normaliza a -2 dB y escribe el WAV."""
    n = int(SR * duracion)
    m = (m + [0.0] * n)[:n]
    fade = int(SR * 0.01)
    for i in range(min(fade, n)):
        m[n - 1 - i] *= i / fade
    pico = max(1e-9, max(abs(v) for v in m))
    k = 0.8 / pico
    datos = b"".join(struct.pack("<h", int(max(-1, min(1, v * k)) * 32767)) for v in m)
    with wave.open(str(SALIDA / f"{nombre}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(datos)


SONIDOS = {
    # Aparecer, abrir y cerrar la isla.
    "peek": (lambda: eco(tono(520, 880, 0.16, "sine", ataque=0.01)), 0.45),
    "open": (lambda: arpegio(["C6", "G6"], 0.07, 0.14), 0.5),
    "close": (lambda: arpegio(["G5", "C5"], 0.07, 0.14), 0.43),
    "hover": (lambda: tono(1400, dur=0.05, vol=0.4, caida=0.03), 0.08),
    "blip": (lambda: tono(990, dur=0.08, forma="tri", caida=0.04), 0.1),
    "tick": (lambda: tono(2000, 1800, 0.04, vol=0.4, ataque=0.001, caida=0.03), 0.07),
    # Reacciones al tocarlo.
    "slap": (lambda: mezclar((0, ruido(0.12, 0.6, 0.4)), (0, tono(140, 60, 0.18, vol=0.7)), (0.05, tono(420, 260, 0.25, "tri"))), 0.6),
    "annoyed": (lambda: unir(tono(220, dur=0.2, forma="suave", vibrato=0.03), silencio(0.05), tono(196, 185, 0.28, "suave", vibrato=0.03)), 0.59),
    "dizzy": (lambda: tono(640, 300, 0.95, "sine", vibrato=0.12, vib_hz=7, caida=0.2), 0.98),
    "love": (lambda: eco(arpegio(["A5", "C#6", "E6"], 0.12, 0.3, "sine")), 0.79),
    "wink": (lambda: tono(900, 1300, 0.12, "sine", caida=0.05), 0.21),
    "pop": (lambda: tono(900, 380, 0.12, "sine", ataque=0.002), 0.38),
    # Estados de los agentes.
    "work": (lambda: unir(tono(660, dur=0.08, forma="tri"), silencio(0.04), tono(880, dur=0.1, forma="tri")), 0.38),
    "think": (lambda: tono(300, 330, 0.4, "tri", vibrato=0.02, ataque=0.05, caida=0.15), 0.44),
    "search": (lambda: eco(tono(1200, 1150, 0.12, "sine"), 0.1, 0.35, 3), 0.46),
    "question": (lambda: unir(tono(500, 800, 0.3, "tri"), silencio(0.06), tono(990, dur=0.12, forma="tri")), 0.7),
    "approval": (lambda: eco(arpegio(["C6", "C6", "E6"], 0.14, 0.12, "sine", 0.6), 0.12, 0.25), 0.88),
    "approve": (lambda: arpegio(["G5", "C6"], 0.1, 0.22), 0.6),
    "error": (lambda: unir(tono(330, dur=0.25, forma="suave"), silencio(0.05), tono(247, 233, 0.4, "suave", caida=0.15)), 0.84),
    "finish": (lambda: eco(arpegio(["C5", "E5", "G5", "C6"], 0.11, 0.5, "tri")), 1.16),
    "proud": (lambda: arpegio(["G5", "C6", "E6", "G6"], 0.09, 0.35, "tri"), 0.86),
    "rate": (lambda: arpegio(["C5", "D5", "E5", "G5", "A5"], 0.09, 0.14, "sine"), 0.67),
    "sleep": (lambda: tono(400, 250, 0.42, "sine", ataque=0.05, caida=0.2), 0.45),
    "yawn": (lambda: unir(tono(500, 300, 0.4, "sine", vibrato=0.03, ataque=0.06), tono(300, 420, 0.3, "sine", vibrato=0.03)), 0.73),
    # Archivos, envíos y saludos.
    "attach": (lambda: mezclar((0, ruido(0.05, 0.4, 0.5)), (0.12, arpegio(["E5", "A5", "E6"], 0.1, 0.12, "sine"))), 0.9),
    "gulp": (lambda: mezclar((0, tono(800, 200, 0.4, "sine", ataque=0.01)), (0.35, tono(300, 520, 0.12, "sine")), (0.5, tono(260, 480, 0.1, "sine", vol=0.4))), 0.75),
    "send": (lambda: mezclar((0, tono(400, 1600, 0.3, "sine")), (0, ruido(0.35, 0.2, 0.08))), 0.48),
    "greet": (lambda: unir(arpegio(["E5", "G5", "C6"], 0.1, 0.2), tono(1200, 1600, 0.1, "sine", vol=0.4)), 0.75),
    # Arranque de NEO (~4 s): zumbido que sube, arpegio y acorde final.
    "greeting": (
        lambda: mezclar(
            (0.0, tono(110, 220, 1.2, "suave", vol=0.25, ataque=0.4, caida=0.3)),
            (1.0, arpegio(["C5", "E5", "G5", "B5", "D6"], 0.14, 0.3, "tri", 0.45)),
            (1.9, eco(tono(nota("G6"), dur=0.15, vol=0.3), 0.12, 0.3, 3)),
            (2.4, tono(nota("C5"), dur=1.6, forma="tri", vol=0.35, ataque=0.05, caida=0.9)),
            (2.4, tono(nota("E5"), dur=1.6, forma="tri", vol=0.3, ataque=0.05, caida=0.9)),
            (2.4, tono(nota("G5"), dur=1.6, forma="sine", vol=0.3, ataque=0.05, caida=0.9)),
        ),
        4.17,
    ),
}


def main():
    SALIDA.mkdir(exist_ok=True)
    for nombre, (hacer, duracion) in SONIDOS.items():
        guardar(nombre, hacer(), duracion)
    print(f"{len(SONIDOS)} sonidos en {SALIDA}")


if __name__ == "__main__":
    main()
