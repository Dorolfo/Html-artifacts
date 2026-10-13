#!/usr/bin/env python3
"""
empacotar.py — transforma um projeto (index.html + layers/ + kit.js) em UM arquivo HTML standalone.

Autoria em pasta é mais rápida de iterar (o browser recarrega imagens soltas, o diff fica legível);
a entrega standalone é o que circula (chat, e-mail, drive). Este script faz a ponte:

  python3 empacotar.py projeto/index.html --saida projeto/entrega.html

O que ele embute:
  - <script src="local.js"></script>           -> <script>conteúdo</script>
  - <link rel="stylesheet" href="local.css">   -> <style>conteúdo</style>
  - /* @embed caminho.css */ dentro de <style> -> conteúdo do arquivo (ex.: fonte-embed.css)
  - src="..." / url(...) de imagens locais     -> data: URI (webp, png, jpg, svg, gif)
URLs http(s) e data: ficam como estão. Avisa se o resultado passar de 8 MB (fica pesado no celular).
Só stdlib — roda com python3 puro.
"""
import argparse
import base64
import mimetypes
import re
import sys
from pathlib import Path

MIME = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml", ".gif": "image/gif", ".woff2": "font/woff2"}


def local(ref: str) -> bool:
    return not re.match(r"^(https?:|data:|//|#|mailto:)", ref)


def data_uri(base: Path, ref: str, cache: dict) -> str:
    p = (base / ref.split("?")[0]).resolve()
    if p in cache:
        return cache[p]
    if not p.exists():
        print(f"aviso: não achei {ref}", file=sys.stderr)
        return ref
    mt = MIME.get(p.suffix.lower()) or mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    uri = f"data:{mt};base64,{base64.b64encode(p.read_bytes()).decode()}"
    cache[p] = uri
    return uri


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("--saida")
    a = ap.parse_args()
    src = Path(a.entrada)
    base = src.parent
    html = src.read_text()
    cache: dict = {}

    def emb_css(m):
        return (base / m.group(1).strip()).read_text()

    html = re.sub(r"/\*\s*@embed\s+([^*]+?)\s*\*/", emb_css, html)

    # <script ... src="local.js" ...></script> em qualquer ordem de atributos (defer/type/async)
    def emb_js(m):
        attrs, src = m.group(1) + m.group(3), m.group(2)
        if not local(src):
            return m.group(0)
        abre = '<script type="module">' if re.search(r'type="module"', attrs) else "<script>"
        return abre + "\n" + (base / src).read_text() + "\n</script>"
    html = re.sub(r'<script\b([^>]*?)\ssrc="([^"]+)"([^>]*)>\s*</script>', emb_js, html)
    html = re.sub(r'<link\b(?=[^>]*rel="stylesheet")[^>]*\shref="([^"]+)"[^>]*>',
                  lambda m: f"<style>\n{(base / m.group(1)).read_text()}\n</style>" if local(m.group(1)) else m.group(0), html)

    # preload de imagem local não serve no arquivo único (a imagem já vai embutida) e duplicaria o peso
    html = re.sub(r'<link\b(?=[^>]*rel="preload")(?=[^>]*as="image")[^>]*\shref="([^"]+)"[^>]*>\n?',
                  lambda m: "" if local(m.group(1)) else m.group(0), html)

    # imagens: só FORA de <script> (comentários e strings de JS não são referências reais)
    img_ext = r"\.(?:webp|png|jpe?g|svg|gif)"
    partes = re.split(r"(<script\b[^>]*>.*?</script>)", html, flags=re.S)
    for i, trecho in enumerate(partes):
        if trecho.startswith("<script"):
            continue
        trecho = re.sub(r'(src|href)="([^"]+' + img_ext + r')"',
                        lambda m: f'{m.group(1)}="{data_uri(base, m.group(2), cache)}"' if local(m.group(2)) else m.group(0), trecho)
        trecho = re.sub(r"url\((['\"]?)([^'\")]+" + img_ext + r")\1\)",
                        lambda m: f'url("{data_uri(base, m.group(2), cache)}")' if local(m.group(2)) else m.group(0), trecho)
        partes[i] = trecho
    html = "".join(partes)

    # sobrou referência local? avisa (o standalone ficaria quebrado em silêncio)
    fora = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
    resto = [r for r in re.findall(r'(?:src|href)="([^"#][^"]*)"', fora) if local(r) and not r.startswith("data:")]
    for r in sorted(set(resto)):
        print(f"aviso: referência local não embutida: {r}", file=sys.stderr)
    out = Path(a.saida) if a.saida else src.with_name(src.stem + "-standalone.html")
    out.write_text(html)
    mb = out.stat().st_size / 1e6
    print(f"{out}: {mb:.2f} MB · {len(cache)} arquivos embutidos")
    if mb > 8:
        print("aviso: acima de 8 MB — reduza --quality das pinturas ou entregue como pasta", file=sys.stderr)


if __name__ == "__main__":
    main()
