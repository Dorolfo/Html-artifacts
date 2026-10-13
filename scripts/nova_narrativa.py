#!/usr/bin/env python3
"""
nova_narrativa.py — monta o esqueleto de uma narrativa ilustrada em qualquer pasta.

  python3 nova_narrativa.py docs/estudo-x --titulo "Um programa por descobrir" --metafora rodovia

Cria:
  <pasta>/index.html          esqueleto em ordem de leitura (medidor, abertura, hero, 1 capítulo-modelo, manual, rodapé)
  <pasta>/kit/                CÓPIA de narrativa.css e narrativa-kit.js
                              -> a pasta é autossuficiente: abre em qualquer servidor local
  <pasta>/cenas/abertura.json cena inicial (cópia de assets/cena-exemplo.json) para editar
  <pasta>/layers/bleed.png    máscara da entrada "florescer"

Depois: pinte (aquarela.py pintar), gere as figuras (aquarela.py figura), escreva, e empacote:
  python3 <skill>/scripts/empacotar.py <pasta>/index.html --saida <pasta>/<nome>.html

Por que copiar o kit em vez de referenciar a skill: um servidor na pasta do projeto não enxerga
a pasta da skill, e o projeto não pode quebrar quando a skill evoluir. Atualizar o kit = rodar de novo com --so-kit.
Só stdlib.
"""
import argparse
import html
import shutil
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
MET = {"pista": ("", "CAP"), "rodovia": ("rodovia", "KM"), "extrato": ("extrato", "PTS")}


def esqueleto(titulo: str, metafora: str) -> str:
    attr, pre = MET[metafora]
    t = html.escape(titulo)
    dm = f' data-metafora="{attr}"' if attr else ""
    return f'''<!doctype html>
<html lang="pt-BR"{dm}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>{t}</title>
<meta name="description" content="[uma frase: do que trata a narrativa e para quem]">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;1,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="kit/narrativa.css">
<style>
.palco.bleed {{ --bleed: url(layers/bleed.png); }}
/* overrides desta peça: mude VARIÁVEIS; layout só dentro de @media (min-width: 521px) */
</style>
<!-- a pintura hero é o LCP: troque o nome quando pintar (o empacotar.py remove este preload no arquivo único) -->
<link rel="preload" as="image" href="layers/abertura.webp" fetchpriority="high">
</head>
<body>

<div class="medidor" id="medidor" role="navigation" aria-label="Progresso de leitura">
  <div class="medidor-visor"><span class="medidor-pre">{pre}</span><span class="medidor-num">00</span><span class="medidor-rotulo">Abertura</span></div>
  <div class="medidor-trilho"><div class="medidor-cheio"></div></div>
</div>

<main class="wrap">

<header class="abertura col">
  <p class="kicker"><span>[contexto · data]</span></p>
  <h1>{t}</h1>
  <p class="dek">[2–3 frases em itálico: a tese da peça, com o número mais forte]</p>
  <p class="byline"><span>[autoria institucional]</span><span>[fonte · período]</span><span>[n] capítulos · [n] min</span></p>
</header>

<!-- HERO: uv run {SKILL}/scripts/aquarela.py figura layers/abertura.json --larga --eager --alt "..." --legenda "..." -->

<section class="col capitulo" id="cap-1" data-cap="[título curto do capítulo]">
  <div class="cap-cab">
    <div class="placa" aria-hidden="true"><span class="l">{pre}</span><span class="n">01</span></div>
    <div><p class="cap-meta"><span class="ref">[fonte]</span> · [período]</p><h2>[Título com <em>uma</em> palavra em destaque]</h2></div>
  </div>
  <p>[prosa: 3–6 parágrafos curtos, números com fonte e data]</p>

  <!-- 1 visual forte por capítulo: .numeros | figure.fig (NK.barras / NK.curvas / NK.linhaMarcos / NK.mapaUF) | pintura -->

  <aside class="licao" data-rotulo="Cap. 01 · [título curto]">
    <div class="licao-num"><b>[número]</b><span>[o que o número mede]</span></div>
    <div class="licao-texto">
      <div class="licao-eye">A lição</div>
      <p>[uma frase de até 25 palavras]</p>
      <div class="licao-rodape"><span>[Nº 0001]</span><span>[FONTE · MÊS/AA]</span></div>
    </div>
  </aside>
</section>

<section class="col capitulo" id="manual-sec" data-cap="Manual">
  <div class="cap-cab">
    <div class="placa analise" aria-hidden="true"><span class="l">FIM</span><span class="n">··</span></div>
    <div><p class="cap-meta">As lições, juntas</p><h2>[Nome do manual]</h2></div>
  </div>
</section>
<div class="larga"><div class="manual" id="manual"></div></div>

<footer class="rodape col">
  <p>[fontes e datas] · [método: aquarelas pintadas por código; números de ...]</p>
</footer>
</main>

<script src="kit/narrativa-kit.js"></script>
<!-- dados: <script type="application/json" id="dados-x">...</script> e leia com NK.util.dados('dados-x') -->
<script>
(function () {{
  var U = NK.util;
  // NK.cena('abertura', {{ pivos: {{}}, pose: function (S) {{ return {{}}; }} }});
  NK.iniciar();
}})();
</script>
</body>
</html>
'''


def copiar_kit(dest: Path) -> None:
    k = dest / "kit"
    k.mkdir(parents=True, exist_ok=True)
    shutil.copy(SKILL / "assets/narrativa.css", k / "narrativa.css")
    shutil.copy(SKILL / "assets/narrativa-kit.js", k / "narrativa-kit.js")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pasta")
    ap.add_argument("--titulo", default="[Título da narrativa]")
    ap.add_argument("--metafora", choices=list(MET), default="pista")
    ap.add_argument("--so-kit", action="store_true", help="só atualiza kit/ de um projeto existente")
    a = ap.parse_args()
    dest = Path(a.pasta)
    copiar_kit(dest)
    if a.so_kit:
        print(f"kit atualizado em {dest / 'kit'}")
        return
    if (dest / "index.html").exists():
        sys.exit(f"{dest / 'index.html'} já existe — use --so-kit para só atualizar o kit")
    (dest / "cenas").mkdir(exist_ok=True)
    (dest / "layers").mkdir(exist_ok=True)
    cena = (SKILL / "assets/cena-exemplo.json").read_text().replace('"name": "posto"', '"name": "abertura"', 1)
    (dest / "cenas/abertura.json").write_text(cena)
    shutil.copy(SKILL / "assets/bleed.png", dest / "layers/bleed.png")
    (dest / "index.html").write_text(esqueleto(a.titulo, a.metafora))
    print(f"esqueleto criado em {dest} (metáfora: {a.metafora})\n"
          f"  1. edite cenas/abertura.json e pinte: uv run {SKILL}/scripts/aquarela.py pintar {dest}/cenas/abertura.json --out {dest}/layers --preview /tmp/prev.jpg\n"
          f"  2. sirva: python3 -m http.server 8770 --directory {dest}\n"
          f"  3. empacote: python3 {SKILL}/scripts/empacotar.py {dest}/index.html --saida {dest}/<nome>.html")


if __name__ == "__main__":
    main()
