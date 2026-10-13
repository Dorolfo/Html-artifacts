# /// script
# requires-python = ">=3.10"
# dependencies = ["opencv-python-headless>=4.9", "numpy>=1.26"]
# ///
"""
aquarela.py — aquarela digital procedural (OpenCV + NumPy) para os HTMLs.

Rodar sempre com `uv run` (as dependências acima são instaladas sozinhas, sem venv):

  uv run aquarela.py pintar  cena.json  --out projeto/layers        # cena de primitivas -> base + camadas + manifesto
  uv run aquarela.py foto    foto.jpg   --out projeto/layers/x.webp  # foto/print -> aquarela
  uv run aquarela.py historica foto.jpg --out projeto/layers/y.webp  # foto de arquivo -> tratamento sépia/duotone
  uv run aquarela.py bleed   --out projeto/layers/bleed.png          # máscara de "florescer" (entrada da pintura)
  uv run aquarela.py figura  projeto/layers/posto.json --alt "..." --legenda "..."   # imprime o <figure> pronto

Modelo físico (simplificado, mas é o que dá o "jeito de aquarela"):
  - a tinta é TRANSMITÂNCIA: cada aguada multiplica o que está embaixo (glazing), nunca cobre;
  - borda úmida: o pigmento migra para a borda da poça ao secar -> borda mais escura que o miolo;
  - granulação: pigmento assenta nos vales do papel -> ruído fino modulado pela textura do papel;
  - variação de poça: ruído de baixa frequência deixa a aguada irregular (manchas, "backruns");
  - borda trêmula: a máscara é deformada por um campo de ruído suave (mão humana, não vetor);
  - nanquim: contorno sépia tremido por cima, opcional por forma;
  - papel: textura de fibra gerada, cor do token --paper; a pintura termina em borda rasgada.

Cada objeto com "layer": true sai como WEBP com alfa, recortado no próprio bounding box, com
x/y/w/h no manifesto — pronto para o motor de cenas (assets/narrativa-kit.js, NK.cena) animar.
"""
from __future__ import annotations

import argparse
import html
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

# ----------------------------------------------------------------------------- util

def hex2rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], np.float32)


def rgb2bgr8(img: np.ndarray) -> np.ndarray:
    return (np.clip(img, 0, 1)[..., ::-1] * 255 + 0.5).astype(np.uint8)


class Noise:
    """Ruído de valor multi-oitava, determinístico por seed (sem dependências extras)."""

    def __init__(self, seed: int):
        self.rng = np.random.default_rng(seed)

    def field(self, h: int, w: int, scale: float, octaves: int = 3, persistence: float = 0.5) -> np.ndarray:
        out = np.zeros((h, w), np.float32)
        amp, total, s = 1.0, 0.0, scale
        for _ in range(octaves):
            gh, gw = max(2, int(h / s) + 2), max(2, int(w / s) + 2)
            g = self.rng.random((gh, gw), dtype=np.float32)
            out += amp * cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
            total += amp
            amp *= persistence
            s /= 2
        out /= total
        return (out - out.min()) / max(1e-6, out.max() - out.min())


def warp(mask: np.ndarray, noise: Noise, amount: float, scale: float = 60) -> np.ndarray:
    """Deforma a máscara por um campo suave: a borda fica de pincel, não de vetor."""
    if amount <= 0:
        return mask
    h, w = mask.shape
    dx = (noise.field(h, w, scale, 2) - 0.5) * 2 * amount
    dy = (noise.field(h, w, scale, 2) - 0.5) * 2 * amount
    xs, ys = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(mask, xs + dx, ys + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def paper_texture(h: int, w: int, noise: Noise) -> np.ndarray:
    """Altura do papel (0..1): fibras alongadas + grão fino. Usada na granulação e no sombreado."""
    fine = noise.field(h, w, 3, 2)
    fib = cv2.GaussianBlur(noise.rng.random((h, w), dtype=np.float32), (0, 0), sigmaX=6, sigmaY=0.8)
    fib = (fib - fib.min()) / max(1e-6, fib.max() - fib.min())
    coarse = noise.field(h, w, 120, 3)
    t = 0.45 * fine + 0.35 * fib + 0.2 * coarse
    return (t - t.min()) / max(1e-6, t.max() - t.min())


def ragged_frame(h: int, w: int, margin: int, ragged: float, noise: Noise) -> np.ndarray:
    """Máscara da área pintada com borda irregular de aguada (o resto é papel limpo)."""
    m = np.zeros((h, w), np.float32)
    cv2.rectangle(m, (margin, margin), (w - margin, h - margin), 1.0, -1)
    m = warp(m, noise, ragged, scale=45)
    m = warp(m, noise, ragged * 0.35, scale=9)        # franja fina da aguada encostando na margem
    m = cv2.GaussianBlur(m, (0, 0), 1.6)
    edge_noise = noise.field(h, w, 14, 2)
    return np.clip(m * (0.85 + 0.3 * edge_noise), 0, 1) ** 1.2


# ----------------------------------------------------------------------------- formas

def shape_mask(sh: dict, h: int, w: int) -> np.ndarray:
    m = np.zeros((h, w), np.float32)
    t = sh["type"]
    if t in ("rect", "wash"):
        x, y, rw, rh = sh["rect"]
        cv2.rectangle(m, (int(x), int(y)), (int(x + rw), int(y + rh)), 1.0, -1)
    elif t == "poly":
        pts = np.array(sh["pts"], np.float32).reshape(-1, 1, 2)
        cv2.fillPoly(m, [np.round(pts * 4).astype(np.int32)], 1.0, lineType=cv2.LINE_AA, shift=2)
    elif t == "ellipse":
        (cx, cy), (rx, ry) = sh["c"], sh["r"]
        cv2.ellipse(m, (int(cx), int(cy)), (int(rx), int(ry)), sh.get("angle", 0), 0, 360, 1.0, -1, cv2.LINE_AA)
    elif t == "circle":
        (cx, cy), r = sh["c"], sh["r"]
        cv2.circle(m, (int(cx), int(cy)), int(r), 1.0, -1, cv2.LINE_AA)
    elif t == "line":
        pts = np.array(sh["pts"], np.int32).reshape(-1, 1, 2)
        cv2.polylines(m, [pts], False, 1.0, int(sh.get("width", 6)), cv2.LINE_AA)
    else:
        raise ValueError(f"forma desconhecida: {t}")
    return m


def outline_pts(sh: dict) -> list[np.ndarray]:
    t = sh["type"]
    if t in ("rect", "wash"):
        x, y, rw, rh = sh["rect"]
        return [np.array([[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh], [x, y]], np.float32)]
    if t == "poly":
        p = np.array(sh["pts"], np.float32)
        return [np.vstack([p, p[:1]])]
    if t in ("ellipse", "circle"):
        cx, cy = sh["c"]
        rx, ry = (sh["r"], sh["r"]) if t == "circle" else sh["r"]
        a = math.radians(sh.get("angle", 0))
        th = np.linspace(0, 2 * np.pi, 72)
        xs, ys = rx * np.cos(th), ry * np.sin(th)
        return [np.stack([cx + xs * math.cos(a) - ys * math.sin(a), cy + xs * math.sin(a) + ys * math.cos(a)], 1).astype(np.float32)]
    if t == "line":
        return [np.array(sh["pts"], np.float32)]
    return []


def resample(p: np.ndarray, step: float = 6) -> np.ndarray:
    out = [p[0]]
    for a, b in zip(p[:-1], p[1:]):
        n = max(1, int(np.linalg.norm(b - a) / step))
        for k in range(1, n + 1):
            out.append(a + (b - a) * k / n)
    return np.array(out, np.float32)


def ink_layer(shapes: list[dict], h: int, w: int, noise: Noise, width: float) -> np.ndarray:
    """Densidade de nanquim (0..1): caneta de bico desenhada à mão.

    Cada aresta vira um traço próprio que passa um pouco do canto (overshoot), com curvatura
    suave, pressão que respira ao longo do traço e uma levantada de caneta de vez em quando.
    """
    ink = np.zeros((h, w), np.float32)
    rng = noise.rng
    for sh in shapes:
        if not sh.get("ink"):
            continue
        for p in outline_pts(sh):
            closed = sh["type"] not in ("line",)
            curvy = sh["type"] in ("ellipse", "circle")
            edges = [p] if (curvy or sh["type"] == "line") else [p[i:i + 2] for i in range(len(p) - 1)]
            for e in edges:
                e = e.astype(np.float32)
                if not curvy and len(e) == 2:                       # passa do canto 2–6 px
                    d = e[1] - e[0]
                    n = d / max(1e-3, np.linalg.norm(d))
                    e = np.stack([e[0] - n * rng.uniform(1, 6), e[1] + n * rng.uniform(1, 6)])
                q = resample(e, 4)
                if len(q) < 2:
                    continue
                k = np.linspace(0, 1, len(q))[:, None]
                bow = np.sin(np.pi * k) * rng.normal(0, 1.4, (1, 2))   # leve barriga no traço
                wav = np.cumsum(rng.normal(0, 0.25, q.shape), 0)
                wav -= np.linspace(0, 1, len(q))[:, None] * wav[-1:]     # volta ao ponto (sem deriva)
                q = q + bow + wav
                press = 0.55 + 0.45 * np.sin(np.linspace(0, rng.uniform(2, 6), len(q)) + rng.uniform(0, 6))
                gap = rng.random() < 0.18 and len(q) > 12               # caneta levanta às vezes
                g0 = rng.integers(len(q) // 4, 3 * len(q) // 4) if gap else -1
                for i in range(len(q) - 1):
                    if gap and g0 <= i < g0 + 3:
                        continue
                    tw = max(1, int(round(width * 4 * press[i])))       # espessura em 1/4 px (shift=2)
                    cv2.line(ink, tuple(np.round(q[i] * 4).astype(int)), tuple(np.round(q[i + 1] * 4).astype(int)),
                             float(0.55 + 0.4 * press[i]), max(1, tw // 4), cv2.LINE_AA, shift=2)
    ink = cv2.GaussianBlur(ink, (0, 0), 0.55)
    return np.clip(ink, 0, 1)


def paint_object(obj: dict, h: int, w: int, noise: Noise, paper_h: np.ndarray, defaults: dict) -> tuple[np.ndarray, np.ndarray]:
    """Pinta um objeto. Devolve (T, cobertura): T = transmitância RGB (1 = papel limpo)."""
    T = np.ones((h, w, 3), np.float32)
    cover = np.zeros((h, w), np.float32)
    for sh in obj["shapes"]:
        wob = sh.get("wobble", defaults["wobble"])
        m = shape_mask(sh, h, w)
        off = sh.get("offset", defaults["offset"])                 # tinta descolada da linha (registro à mão)
        if off and sh.get("mode") != "lift" and sh["type"] != "wash":
            ang = noise.rng.uniform(0, 2 * np.pi)
            M = np.float32([[1, 0, off * math.cos(ang)], [0, 1, off * math.sin(ang)]])
            m = cv2.warpAffine(m, M, (w, h))
        m = warp(m, noise, wob, scale=sh.get("wobble_scale", 50))
        m = cv2.GaussianBlur(m, (0, 0), sh.get("soft", 1.1))
        if sh.get("reserva"):                            # goma de reserva: a forma não recebe o que veio antes
            T = T + (1 - T) * m[..., None]
        if sh.get("mode") == "lift":                     # tirar tinta (nuvem, reflexo): volta ao papel
            amt = sh.get("amount", 0.8)
            T = T + (1 - T) * (m * amt)[..., None]
            continue
        dens = sh.get("density", defaults["density"])
        # variação de poça + granulação nos vales do papel
        pool = 0.78 + 0.4 * noise.field(h, w, sh.get("pool_scale", 70), 3)
        gran = 1 + defaults["granulation"] * (0.5 - paper_h) * 2
        D = m * dens * pool * gran
        # borda úmida: pigmento acumula onde a poça termina
        wet = sh.get("wet", defaults["wet"])
        if wet > 0:
            inner = np.clip(m - cv2.GaussianBlur(m, (0, 0), sh.get("wet_width", 4)), 0, 1)
            D = D + wet * inner * 2.2 * m
        if sh["type"] == "wash" and "to" in sh:          # degradê vertical (céu, parede ao entardecer)
            x, y, rw, rh = sh["rect"]
            g = np.clip((np.arange(h, dtype=np.float32) - y) / max(1, rh), 0, 1)[:, None, None]
            col = hex2rgb(sh["from"]) * (1 - g) + hex2rgb(sh["to"]) * g
        else:
            col = hex2rgb(sh["color"])[None, None, :]
        hj = sh.get("hue_jitter", defaults["hue_jitter"])          # o pigmento não mistura por igual na poça
        if hj > 0:   # varia valor e temperatura (quente/frio), nunca matiz aleatório — senão vira arco-íris
            v = noise.field(h, w, 90, 2)[..., None] - 0.5
            t = noise.field(h, w, 140, 2)[..., None] - 0.5
            col = np.clip(col * (1 + hj * v) + hj * 0.5 * t * np.array([1, 0.15, -0.8], np.float32), 0, 1)
        D = np.clip(D, 0, 1.0)[..., None]
        T = T * (1 - D * (1 - col))                      # glazing: multiplica, nunca cobre
        cover = np.maximum(cover, m)
    ink = ink_layer(obj["shapes"], h, w, noise, obj.get("ink_width", defaults["ink_width"]))
    if ink.any():
        T = T * (1 - ink[..., None] * (1 - defaults["ink_rgb"]))
        cover = np.maximum(cover, ink)
    return T, np.clip(cover, 0, 1)


def shadow_of(cover: np.ndarray, sh: dict) -> np.ndarray:
    dx, dy = sh.get("dx", 0), sh.get("dy", 10)
    M = np.float32([[1, 0, dx], [0, sh.get("squash", 0.35), dy + cover.shape[0] * 0]])
    # achata a silhueta a partir da base do objeto (sombra no chão)
    ys = np.where(cover.max(1) > 0.05)[0]
    base = ys.max() if len(ys) else 0
    M[1, 2] = base * (1 - M[1, 1]) + dy
    s = cv2.warpAffine(cover, M, (cover.shape[1], cover.shape[0]))
    return cv2.GaussianBlur(s, (0, 0), sh.get("blur", 6)) * sh.get("density", 0.35)


def export_layer(path: Path, rgba: np.ndarray, quality: int) -> None:
    bgra = np.dstack([rgb2bgr8(rgba[..., :3]), (np.clip(rgba[..., 3], 0, 1) * 255 + 0.5).astype(np.uint8)])
    cv2.imwrite(str(path), bgra, [cv2.IMWRITE_WEBP_QUALITY, quality])


def crop_box(alpha: np.ndarray, pad: int = 6) -> tuple[int, int, int, int] | None:
    ys, xs = np.where(alpha > 0.01)
    if not len(xs):
        return None
    h, w = alpha.shape
    x0, y0 = max(0, int(xs.min()) - pad), max(0, int(ys.min()) - pad)
    x1, y1 = min(w, int(xs.max()) + pad + 1), min(h, int(ys.max()) + pad + 1)
    return x0, y0, x1 - x0, y1 - y0


# ----------------------------------------------------------------------------- comandos

def cmd_pintar(a: argparse.Namespace) -> None:
    spec = json.loads(Path(a.cena).read_text())
    name = spec.get("name", Path(a.cena).stem)
    W, H = spec["w"], spec["h"]
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    noise = Noise(spec.get("seed", 7))
    defaults = {"density": 0.8, "wet": 0.55, "granulation": 0.35, "wobble": 3.5, "ink_width": 1.8,
                "offset": 3.0, "hue_jitter": 0.14,
                "ink_rgb": hex2rgb(spec.get("ink", "#2A231E"))}
    defaults.update({k: v for k, v in spec.get("defaults", {}).items() if k != "ink_rgb"})
    paper = hex2rgb(spec.get("paper", "#F5F1EA"))
    paper_h = paper_texture(H, W, noise)
    paper_rgb = paper[None, None, :] * (0.965 + 0.05 * paper_h[..., None])      # papel com relevo leve
    fr = spec.get("frame", {"margin": 36, "ragged": 16})
    frame = ragged_frame(H, W, fr["margin"], fr["ragged"], noise) if fr else np.ones((H, W), np.float32)

    T_base = np.ones((H, W, 3), np.float32)
    manifest = {"w": W, "h": H, "layers": []}
    for obj in spec["objects"]:
        T, cover = paint_object(obj, H, W, noise, paper_h, defaults)
        if obj.get("reserva") and not obj.get("layer"):  # objeto opaco na base: limpa o fundo sob ele antes
            res = cv2.GaussianBlur(np.clip(cover * 1.3, 0, 1), (0, 0), 1.2)[..., None]
            T_base = T_base + (1 - T_base) * res
        if not obj.get("layer"):
            T_base *= T
            if obj.get("shadow"):
                T_base *= 1 - shadow_of(cover, obj["shadow"])[..., None] * (1 - defaults["ink_rgb"] * 0.6)
            continue
        oname = obj["name"]
        blend = obj.get("blend", "normal")
        if obj.get("shadow"):                                                    # sombra = camada multiply separada
            s = shadow_of(cover, obj["shadow"])
            sh_col = np.ones_like(T) * (defaults["ink_rgb"] * 0.6 + 0.2)
            T_s = 1 - s[..., None] * (1 - sh_col)
            a_s = (1 - T_s).max(-1)
            rgb_s = 1 - (1 - T_s) / np.maximum(a_s[..., None], 1e-4)
            box = crop_box(a_s)
            if box:
                x, y, bw, bh = box
                f = f"{name}--{oname}-m.webp"
                export_layer(out / f, np.dstack([rgb_s, a_s])[y:y + bh, x:x + bw], a.quality)
                manifest["layers"].append({"name": oname, "part": "shadow", "file": f, "x": x, "y": y, "w": bw, "h": bh, "blend": "multiply"})
        if blend == "multiply":
            # alfa exato para que  fundo*(1-a) + fundo*rgb*a == fundo*T  (camada só "tinge")
            a_ = (1 - T).max(-1)
            rgb = 1 - (1 - T) / np.maximum(a_[..., None], 1e-4)
        else:
            # objeto opaco: traz o próprio papel por baixo e esconde o fundo
            a_ = np.clip(cover * 1.15, 0, 1)
            rgb = paper_rgb * T
        box = crop_box(a_)
        if not box:
            continue
        x, y, bw, bh = box
        f = f"{name}--{oname}.webp"
        export_layer(out / f, np.dstack([rgb, a_])[y:y + bh, x:x + bw], a.quality)
        manifest["layers"].append({"name": oname, "part": "body", "file": f, "x": x, "y": y, "w": bw, "h": bh, "blend": blend})

    base = paper_rgb * (1 - frame[..., None] * (1 - T_base))
    cv2.imwrite(str(out / f"{name}.webp"), rgb2bgr8(base), [cv2.IMWRITE_WEBP_QUALITY, a.quality])
    manifest["base"] = f"{name}.webp"
    (out / f"{name}.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    if a.preview:   # composição estática p/ conferir antes do HTML (base + todas as camadas em repouso)
        comp = base.copy()
        for L in manifest["layers"]:
            img = cv2.imread(str(out / L["file"]), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
            rgb, al = img[..., 2::-1], img[..., 3:4]
            x, y = L["x"], L["y"]
            dst = comp[y:y + L["h"], x:x + L["w"]]
            dst[:] = dst * (1 - al + al * rgb) if L["blend"] == "multiply" else dst * (1 - al) + rgb * al
        cv2.imwrite(str(Path(a.preview)), rgb2bgr8(comp), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(json.dumps({"base": str(out / manifest["base"]), "camadas": len(manifest["layers"]),
                      "manifesto": str(out / f"{name}.json")}, ensure_ascii=False))


def cmd_foto(a: argparse.Namespace) -> None:
    """Foto/print -> aquarela: achata em manchas de pigmento, borda úmida, granulação, nanquim leve."""
    img = cv2.imread(a.entrada)
    if img is None:
        sys.exit(f"não consegui abrir {a.entrada}")
    h0, w0 = img.shape[:2]
    k = a.largura / w0
    img = cv2.resize(img, (a.largura, int(h0 * k)), interpolation=cv2.INTER_AREA)
    h, w = img.shape[:2]
    noise = Noise(a.seed)
    flat = img
    for _ in range(2):
        flat = cv2.bilateralFilter(flat, 9, 40, 9)
    flat = cv2.pyrMeanShiftFiltering(flat, 10, 24)
    # quantiza em poucas "tintas" (k-means) — é o que tira cara de foto
    Z = flat.reshape(-1, 3).astype(np.float32)
    _, lab, cen = cv2.kmeans(Z, a.tintas, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 12, 1.0), 2, cv2.KMEANS_PP_CENTERS)
    q = cen[lab.flatten()].reshape(h, w, 3) / 255.0
    q = cv2.GaussianBlur(q, (0, 0), 1.2)
    rgb = q[..., ::-1].astype(np.float32)
    paper = hex2rgb(a.papel)
    T = np.clip(rgb / paper[None, None, :], 0, 1)
    D = 1 - T
    paper_h = paper_texture(h, w, noise)
    D = D * (0.8 + 0.4 * noise.field(h, w, 60, 3))[..., None] * (1 + 0.35 * (0.5 - paper_h) * 2)[..., None]
    # borda úmida nas fronteiras entre manchas
    g = cv2.cvtColor((q * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    edges = cv2.GaussianBlur(cv2.Canny(g, 20, 60).astype(np.float32) / 255, (0, 0), 1.6)
    D = np.clip(D * (1 + 0.6 * edges[..., None]) * a.densidade, 0, 1)
    T = 1 - D
    # nanquim esparso a partir da foto original (só contornos fortes)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lines = cv2.adaptiveThreshold(cv2.GaussianBlur(gray, (0, 0), 1.5), 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 11, 7)
    ink = (255 - lines).astype(np.float32) / 255 * a.nanquim
    ink = warp(ink, noise, 1.2, 30)
    T = T * (1 - ink[..., None] * (1 - hex2rgb("#2A231E")))
    paper_rgb = paper[None, None, :] * (0.965 + 0.05 * paper_h[..., None])
    frame = ragged_frame(h, w, int(0.025 * w), 0.012 * w, noise)
    out = paper_rgb * (1 - frame[..., None] * (1 - T))
    cv2.imwrite(a.out, rgb2bgr8(out), [cv2.IMWRITE_WEBP_QUALITY, a.quality])
    print(json.dumps({"saida": a.out, "w": w, "h": h}))


def cmd_historica(a: argparse.Namespace) -> None:
    """Foto de arquivo: duotone tinta/papel, curva de contraste, grão de filme, vinheta, borda de cópia."""
    img = cv2.imread(a.entrada, cv2.IMREAD_GRAYSCALE)
    if img is None:
        sys.exit(f"não consegui abrir {a.entrada}")
    h0, w0 = img.shape
    img = cv2.resize(img, (a.largura, int(h0 * a.largura / w0)), interpolation=cv2.INTER_AREA)
    h, w = img.shape
    g = img.astype(np.float32) / 255
    g = cv2.createCLAHE(2.0, (8, 8)).apply((g * 255).astype(np.uint8)).astype(np.float32) / 255
    g = 1 / (1 + np.exp(-(g - 0.5) * 5.5))                                 # curva S
    rng = np.random.default_rng(a.seed)
    g = np.clip(g + cv2.GaussianBlur(rng.normal(0, 0.06, (h, w)).astype(np.float32), (0, 0), 0.7), 0, 1)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    vig = 1 - 0.35 * (((xx / w - 0.5) ** 2 + (yy / h - 0.5) ** 2) * 2.2)
    g = g * vig
    ink, paper = hex2rgb(a.tinta), hex2rgb(a.papel)
    rgb = ink[None, None, :] * (1 - g[..., None]) + paper[None, None, :] * g[..., None]
    cv2.imwrite(a.out, rgb2bgr8(rgb), [cv2.IMWRITE_WEBP_QUALITY, a.quality])
    print(json.dumps({"saida": a.out, "w": w, "h": h}))


def cmd_bleed(a: argparse.Namespace) -> None:
    """Máscara (PNG alfa) de mancha com borda franjada: cresce de 1% a 270% no CSS = pintura florescendo."""
    n = a.tamanho
    noise = Noise(a.seed)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    r = np.sqrt((xx - n / 2) ** 2 + (yy - n / 2) ** 2) / (n / 2)
    ang = np.arctan2(yy - n / 2, xx - n / 2)
    wav = 0.08 * np.sin(ang * 5 + 1.3) + 0.05 * np.sin(ang * 11 + 0.4) + 0.12 * (noise.field(n, n, n / 6, 3) - 0.5)
    m = np.clip((0.62 + wav - r) / 0.10, 0, 1)
    m = warp(m, noise, n * 0.02, n / 10)
    rgba = np.dstack([np.zeros((n, n, 3), np.uint8), (m * 255).astype(np.uint8)])
    cv2.imwrite(a.out, rgba)
    print(json.dumps({"saida": a.out}))


def cmd_figura(a: argparse.Namespace) -> None:
    """Imprime o <figure> pronto (base + camadas posicionadas em %) a partir do manifesto JSON.
    Posição em porcentagem: a pintura aparece certa SEM JavaScript (impressão, reduced-motion)."""
    m = json.loads(Path(a.manifesto).read_text())
    W, H = m["w"], m["h"]
    alt, legenda = html.escape(a.alt, quote=True), html.escape(a.legenda, quote=False)
    pre = a.prefixo.rstrip("/") + "/" if a.prefixo else ""
    nome = Path(a.manifesto).stem
    lazy = "" if a.eager else ' loading="lazy"'
    lin = [f'<figure class="pintura{" larga" if a.larga else ""}" data-cena="{nome}">',
           f'  <div class="moldura"><div class="palco" style="--ar:{W}/{H}">',
           f'    <img class="base" src="{pre}{m["base"]}" width="{W}" height="{H}" alt="{alt}" decoding="async"{lazy}>']
    for L in m["layers"]:
        st = f'left:{L["x"]/W*100:.3f}%;top:{L["y"]/H*100:.3f}%;width:{L["w"]/W*100:.3f}%'
        cls = "ly mul" if L["blend"] == "multiply" else "ly"
        lin.append(f'    <img class="{cls}" data-obj="{L["name"]}" data-part="{L["part"]}" data-box="{L["x"]},{L["y"]},{L["w"]},{L["h"]}" '
                   f'src="{pre}{L["file"]}" width="{L["w"]}" height="{L["h"]}" style="{st}" alt="" decoding="async">')
    lin += ['  </div></div>', f'  <figcaption>{legenda}</figcaption>', '</figure>']
    print("\n".join(lin))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = p.add_subparsers(dest="cmd", required=True)
    c = sp.add_parser("pintar"); c.add_argument("cena"); c.add_argument("--out", required=True)
    c.add_argument("--quality", type=int, default=80); c.add_argument("--preview")
    c.set_defaults(fn=cmd_pintar)
    c = sp.add_parser("foto"); c.add_argument("entrada"); c.add_argument("--out", required=True)
    c.add_argument("--largura", type=int, default=1600); c.add_argument("--tintas", type=int, default=12)
    c.add_argument("--densidade", type=float, default=1.0); c.add_argument("--nanquim", type=float, default=0.35)
    c.add_argument("--papel", default="#F5F1EA"); c.add_argument("--seed", type=int, default=7)
    c.add_argument("--quality", type=int, default=80); c.set_defaults(fn=cmd_foto)
    c = sp.add_parser("historica"); c.add_argument("entrada"); c.add_argument("--out", required=True)
    c.add_argument("--largura", type=int, default=1400); c.add_argument("--tinta", default="#2A231E")
    c.add_argument("--papel", default="#F5F1EA"); c.add_argument("--seed", type=int, default=3)
    c.add_argument("--quality", type=int, default=80); c.set_defaults(fn=cmd_historica)
    c = sp.add_parser("figura"); c.add_argument("manifesto"); c.add_argument("--prefixo", default="layers")
    c.add_argument("--alt", default=""); c.add_argument("--legenda", default=""); c.add_argument("--larga", action="store_true")
    c.add_argument("--eager", action="store_true", help="primeira dobra: sem lazy-load"); c.set_defaults(fn=cmd_figura)
    c = sp.add_parser("bleed"); c.add_argument("--out", required=True)
    c.add_argument("--tamanho", type=int, default=512); c.add_argument("--seed", type=int, default=11)
    c.set_defaults(fn=cmd_bleed)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
