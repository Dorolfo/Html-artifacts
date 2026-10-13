---
name: html-artifacts
description: Use sempre que alguém pedir um documento estruturado para ser lido por outras pessoas — relatório, análise, spec, plano de implementação, RFC, post-mortem, investigação de bug ou ticket, status semanal, roadmap, deck ou dashboard — inclusive em pedidos casuais como "monta um relatório" ou "escreve uma spec". Também é a skill para peças editoriais caprichadas — narrativa ilustrada ou scrollytelling estilo NYT, New Yorker ou The Pudding, "conta a história de X", companion de podcast, livro ou entrevista, aquarelas e ilustrações pintadas por código (OpenCV), gráficos interativos e animações de cena. Produz um HTML standalone, com identidade visual consistente, tema claro e escuro, mobile e diagramas em SVG inline. Não use para resposta de chat, lista curta, rascunho de email ou código sem narrativa.
---

# HTML Artifacts

Skill para produzir documentos HTML standalone, com identidade visual consistente e feitos para leitura. Tem dois registros:

- **Documento** (archetypes 1 a 16): relatório, spec, deck, status, RFC, investigação. Denso, feito para consultar e decidir.
- **Narrativa ilustrada** (archetype 17): história contada capítulo por capítulo, com aquarelas pintadas por código que se mexem, gráficos que respondem e uma lição destacada por capítulo. Feita para encantar e convencer.

## Filosofia

Quando o agente faz a busca, o gargalo passa a ser a atenção de quem lê. Um documento importante não é feito para ser passado o olho: é feito para ser entendido. HTML bem composto faz a pessoa parar e ler, em vez de fechar a aba depois de quinze linhas. Markdown fica para arquivo de configuração e nota de trabalho. Tudo o que vai ser lido por mais de uma pessoa, ou consultado mais de uma vez, ganha em ser HTML.

## Qual archetype

| Pedido | Archetype |
|---|---|
| relatório de pesquisa, estudo, análise profunda | research-deep-dive / concept-explainer |
| spec de produto, plano de implementação, RFC | implementation-plan / rfc |
| deck para liderança, apresentação | slide-deck |
| status semanal, métricas, dashboard | status-report / analysis-dashboard |
| post-mortem, incidente, investigação de ticket | incident-report |
| descrição de mudança técnica | pr-writeup |
| roadmap, OKRs | roadmap |
| mockup de tela, protótipo | interactive-mockup |
| vários documentos ligados | gallery-index |
| "conta a história", "narra", companion ilustrado, estilo NYT ou New Yorker, peça que precisa encantar | **narrativa-ilustrada** |

A estrutura canônica de cada um está em `references/archetypes.md`. Se o pedido for vago e couber em mais de um, pergunte ao usuário com duas ou três opções concretas. Na dúvida entre documento e narrativa, a pergunta é: "é para consultar ou para contar?". A narrativa custa de três a cinco vezes mais trabalho, então só vá nela quando o pedido pedir capricho ou a peça for circular fora do time.

## Fluxo

1. **Identifique o archetype** pela tabela acima.
2. **Leia as referências.** Sempre `references/design-system.md`. Leia `references/archetypes.md` para a estrutura, `references/svg-patterns.md` antes de desenhar um diagrama e `references/anti-patterns.md` antes de fechar.
3. **Liste a estrutura antes de construir.** Seções (número, título, uma linha do que entra), onde vão os diagramas e onde vai a interatividade. Em documento grande, confirme com o usuário.
4. **Construa em ordem de leitura**, a partir de `assets/base-template.html`: eyebrow, título, abertura, resumo, seções, rodapé. Se o trabalho for interrompido no meio, o que existe já é coerente.
5. **Teste antes de entregar.** Abra no navegador e confira: console sem erro, 375px de largura sem rolagem horizontal, tema escuro legível.
6. **Salve perto do assunto**, com nome em kebab-case, e diga ao usuário em duas a quatro frases o que o arquivo entrega.

`examples/investigacao-ticket.html` é um documento completo, com dados fictícios, que serve de calibragem de nível.

## Fluxo da narrativa ilustrada

Leia `references/narrativa-ilustrada.md` inteiro antes de começar. Leia `references/aquarela-opencv.md` antes de pintar e `references/cenas-e-dataviz.md` antes de animar ou fazer gráfico.

1. **Lições primeiro.** Liste os capítulos com uma lição de uma linha e o número-âncora de cada, a metáfora física e as cenas a pintar. Mostre ao usuário e só depois pinte.
2. **Esqueleto.** `python3 scripts/nova_narrativa.py <pasta> --titulo "..."` cria `index.html`, `kit/`, `cenas/` e `layers/`.
3. **Pinte.** Escreva `cenas/<nome>.json` e rode `uv run scripts/aquarela.py pintar cenas/<nome>.json --out layers --preview prev.jpg`. Abra a prévia, olhe e itere duas ou três vezes: a primeira versão sempre sai "vetor demais".
4. **Monte e coreografe.** Gere o markup com `aquarela.py figura`, registre cada cena com `NK.cena(...)` e chame `NK.iniciar()` por último.
5. **Teste** num servidor local (`python3 -m http.server`): desktop, 375px, tema escuro e `prefers-reduced-motion`.
6. **Empacote.** `python3 scripts/empacotar.py <pasta>/index.html --saida <pasta>/<nome>.html` gera o arquivo único, abaixo de 3 MB.

Os scripts de pintura precisam do [uv](https://docs.astral.sh/uv/), que instala OpenCV e NumPy sozinho na primeira execução. Os outros dois usam só a biblioteca padrão do Python.

## Regras de conteúdo

- **Número tem fonte.** Todo número vem de dado real (banco, arquivo, material do usuário) e carrega fonte e data. Nunca invente um número para preencher um componente. Se o dado não existe, o componente sai.
- **Conclusão primeiro.** O resumo no topo diz o que o leitor precisa saber se parar ali.
- **Hipótese se testa contra o observado.** Em investigação, liste cada hipótese com o valor que ela produziria e compare com o valor real. Mantenha as descartadas no documento: elas mostram o caminho.
- **Prosa, não bullets.** Bullet só para lista genuinamente paralela.

## Regras visuais

1. **Sem emoji.** Use marcadores tipográficos (·, →) ou rótulos em texto.
2. **Uma cor de destaque**, definida em `--accent`. Como texto, use `--accent-text`.
3. **Nunca branco puro nem preto puro.** Fundo em `--paper`, texto em `--ink`.
4. **Uma palavra em itálico de destaque por título**, nunca duas.
5. **Três famílias tipográficas com papel fixo:** display em títulos e números grandes, sans em prosa e interface, mono em rótulos, metadados e código.
6. **Diagramas e gráficos em SVG inline**, com cores por `var(--token)`. Nunca imagem de gráfico, nunca ASCII.
7. **Standalone.** CSS e JS dentro do arquivo. Único recurso externo permitido: Google Fonts.
8. **Tema claro e escuro** em todo documento.
9. **Mobile de verdade.** Margem lateral de 16px, tabelas e diagramas largos rolam dentro do próprio bloco, a página nunca rola na horizontal.
10. **Densidade editorial.** É documento de leitura, não landing page.
11. **Movimento só quando explica**, sempre respeitando `prefers-reduced-motion`.

## Adaptar à sua marca

A skill vem com uma identidade neutra. Para aplicar a sua, edite apenas o bloco de tokens em `assets/base-template.html` e a seção correspondente de `references/design-system.md`: cor de destaque, fonte display e, se houver, o logo em SVG inline no eyebrow e no rodapé. O passo a passo está em `references/design-system.md`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `references/design-system.md` | tokens, tipografia, espaçamento, componentes e como trocar a marca |
| `references/archetypes.md` | 17 archetypes com estrutura canônica |
| `references/svg-patterns.md` | padrões de diagrama em SVG |
| `references/anti-patterns.md` | o que evitar e checklist final |
| `references/narrativa-ilustrada.md` | archetype 17: estrutura, metáforas, componentes e checklist |
| `references/aquarela-opencv.md` | como pintar por código: modelo físico, JSON da cena, receitas e erros comuns |
| `references/cenas-e-dataviz.md` | motor de cenas (`NK.cena`), comportamentos e padrões de gráfico editorial |
| `assets/base-template.html` | ponto de partida do registro documento, com todos os componentes |
| `assets/narrativa.css` · `assets/narrativa-kit.js` | CSS e motor JS do registro narrativa |
| `assets/cena-exemplo.json` · `assets/bleed.png` | cena inicial e máscara de entrada usadas pelo esqueleto |
| `scripts/aquarela.py` | pinta cena JSON em camadas WEBP; também trata foto e foto histórica |
| `scripts/nova_narrativa.py` | cria o esqueleto de uma narrativa numa pasta |
| `scripts/empacotar.py` | transforma a pasta num HTML único |
| `examples/investigacao-ticket.html` | exemplo completo, com dados fictícios |
