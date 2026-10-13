# Archetype Catalog

Catálogo dos 17 archetypes de documentos HTML produzidos por esta skill. Para cada um: quando usar, estrutura canônica, componentes obrigatórios, exemplos do que entra em cada seção.

## Quando ler este arquivo

- Quando o pedido do usuário não bate exatamente com nenhum archetype da tabela do SKILL.md
- Quando precisar da estrutura canônica de um archetype (lista de seções, ordem, o que entra em cada)
- Quando estiver decidindo se um archetype simples cabe ou se precisa combinar dois

## Índice de archetypes

### Exploração & Planejamento
1. **research-deep-dive** · estudo profundo com bibliografia
2. **concept-explainer** · explicação de um conceito com interatividade
3. **implementation-plan** · spec técnico para implementer

### Apresentação & Decisão
4. **slide-deck** · apresentação navegável por teclado
5. **decision-framework** · regra de decisão com cenários

### Reporte recorrente
6. **status-report** · update semanal/mensal
7. **incident-report** · post-mortem
8. **roadmap** · planejamento temporal

### Técnico & Engenharia
9. **pr-writeup** · descrição de PR para reviewers
10. **rfc** · request for comments técnico
11. **code-review-annotated** · review com diff anotado

### Pesquisa & Validação
12. **survey-blueprint** · spec de pesquisa quantitativa
13. **analysis-dashboard** · painel de leitura de dados

### Design & UI
14. **interactive-mockup** · telas navegáveis com toggle
15. **design-system-spec** · biblioteca de componentes
16. **gallery-index** · navegação entre múltiplos arquivos

### Narrativa & Editorial
17. **narrativa-ilustrada** · história em capítulos com aquarelas animadas, gráficos interativos e lições

---

## 1. research-deep-dive

**Quando usar:** estudo profundo sobre um tema, com bibliografia, hipóteses formais, fundamentação teórica. Tipicamente 15-20 min de leitura.

**Estrutura canônica (na ordem):**

1. Eyebrow + h1 italic
2. Lede (1 parágrafo serif explicando o escopo)
3. Meta-strip (fontes consultadas, idiomas, decisões servidas, hipóteses formais, tempo de leitura)
4. TL;DR (callout serif com border-left accent)
5. **Sidebar TOC com scroll-spy** (lateral sticky, grid 220px + 1fr + 4rem gap)
6. Seções principais com border-top 2px ink, cada uma:
   - h2 com num mono + título serif italic
   - Prosa serif denso (~1.05rem, line-height 1.55)
   - Pelo menos 1 diagrama SVG inline
   - Tabela `simple-table` quando comparativo
   - **Hypothesis box** se houver hipótese formal (H1, H2…)
   - Fórmula em `.formula` (mono, fundo ink) se quantitativa
7. FAQ com `<details>`/`<summary>` ao fim do conteúdo
8. Bibliografia anotada (multi-grupo, prosa serif, list-style none com bullets ·)
9. Footer

**Componentes obrigatórios:** sidebar TOC, h2 com border-top, hypothesis box, biblio.

---

## 2. concept-explainer

**Quando usar:** ensinar um conceito (técnico ou de negócio) com interatividade. Mais curto que research, mais focado, com elemento didático interativo.

**Estrutura canônica:**

1. Eyebrow + h1 com a pergunta-conceito
2. Lede que estabelece o problema (não a solução)
3. **Seção "A ideia"** — explica o conceito com 1 diagrama SVG principal
4. **Elemento interativo** central (calculadora, slider, toggle, ring com nós, etc) — é o "clay" do documento
5. Comparação contra alternativa (tabela)
6. Onde aparece na prática (parágrafo + bullets de exemplos reais)
7. Glossário ao final (3-8 termos, mini-cards)
8. Footer

**Componentes obrigatórios:** 1 diagrama SVG, 1 elemento interativo, 1 tabela de comparação.

**Exemplo:** o slide §4 do `01-research-foundation.html` (Sean Ellis matrix) ou o Kano interativo.

---

## 3. implementation-plan

**Quando usar:** plano de implementação técnico que vai para o implementer. Inclui timeline, data flow, mockups, código, riscos.

**Estrutura canônica:**

1. Eyebrow + h1
2. **Prompt-box** com a pergunta original (label "PROMPT")
3. Meta-strip com: effort, surfaces touched, new tables, feature flag
4. **TL;DR** breve
5. **Seção 1 · Milestones** — slices independentes, cada um com semana/tags de package/breve descrição
6. **Seção 2 · Data flow** — diagrama SVG do fluxo de dados (request/response sólido, fan-out tracejado)
7. **Seção 3 · Mockups** — wireframes inline em HTML/CSS (não imagens), mostrando UI relevante
8. **Seção 4 · Key code** — snippets dos pedaços mais arriscados (migration, optimistic mutation, etc) em blocos `.formula`-style mas adaptados
9. **Seção 5 · Risks & mitigations** — risk-table com severity badges
10. **Seção 6 · Open questions** — perguntas em aberto com "Decide with · X, before slice N"
11. Footer

**Componentes obrigatórios:** prompt-box, milestones com section-marker num-box, data-flow diagram SVG, mockups inline, risk-table com badges, open-questions.

**Filosofia:** o implementer abre, lê uma vez, e tem tudo que precisa. Sem perguntas pendentes implícitas.

---

## 4. slide-deck

**Quando usar:** apresentação para liderança ou stakeholders, navegável por teclado (←/→/space), 5-10 slides, ~5min de leitura.

**Estrutura canônica:**

1. Eyebrow-top fixo (top-left)
2. Deck-controls fixos (bottom-center): prev/next/indicator/hint kbd
3. Slides em divs `.slide` com `.active`:
   - **Slide 1 (cover):** label, h1 mega-grande com italic accent, subtitle, cover-meta com 4 items
   - **Slides 2 a N-1:** label/num, h2 com 1 palavra italic, deck-paragraph, conteúdo (cards/grid/tabela/timeline)
   - **Slide N (next steps):** numbered step-rows com owner + prazo
4. Cada slide tem `.slide-header` com label + num, h2 com em-italic, conteúdo denso
5. Keyboard nav obrigatório: ←/→/space/Home/End

**Componentes obrigatórios:** eyebrow-top fixo, deck-controls fixos, fadeIn animation entre slides, cover-content para slide 1, step-row para slide N.

**Filosofia:** cada slide é uma página densa, mas focada. Não slide cheio de bullets — slide com argumento.

---

## 5. decision-framework

**Quando usar:** quando o documento existe para guiar uma decisão entre N alternativas com regra explícita.

**Estrutura canônica:**

1. Eyebrow + h1 ("Decisão: X?")
2. Lede com as alternativas
3. **Os critérios** — N sinais ou critérios com card cada (signal-card)
4. **A regra** — tabela explícita combinação → veredito → ação
5. **As N ações possíveis** — uma card por alternativa, com a escolhida destacada
6. **Como sequenciar** — roadmap da ação escolhida (timeline)
7. Footer

Pode ser standalone OU virar parte final de um slide-deck.

---

## 6. status-report

**Quando usar:** update semanal ou mensal. PRs merged / metas / incidents / o que vem.

**Estrutura canônica:**

1. Eyebrow (data, projeto, "auto-gerado" se for o caso)
2. h1: "Status — Semana N" ou "Status — Q1 2026"
3. Meta-banner com 4 stats grandes (PRs merged, deploys, incidents, flakies fixed) — cada com delta vs período anterior
4. **Highlights** — 3-5 bullets em prosa de coisas importantes
5. **Shipped** — tabela simple-table de PRs/features (PR# · título · autor · risco)
6. **Velocity** — mini gráfico SVG bar chart de PRs/dia ou pontos/sprint
7. **Carryover** — 3 sub-seções: In Review · Blocked · Slipped (cada com lista)
8. Footer com fontes (git log, dashboard, deploy log) + timestamp

**Componentes obrigatórios:** meta-banner com delta, simple-table de shipped, mini-chart SVG.

**Filosofia:** lê-se em 2 minutos numa segunda de manhã. Skimável mas com dado real, não vibe.

---

## 7. incident-report

**Quando usar:** post-mortem de incidente, retrospectiva de falha.

**Estrutura canônica:**

1. Eyebrow + ID do incidente
2. h1 com nome do incidente
3. **Pill row:** SEV-X · Status (Resolved/Active) · Duration · Detected · Owner
4. **TL;DR box** — 2-3 frases que explicam tudo
5. **Timeline** — linha do tempo minuto-a-minuto em formato vertical com horário esquerda, evento direita
6. **Root cause** — explicação técnica + snippet de código mostrando o diff problemático
7. **Impact** — tabela com requests failed, peak error, users affected, data loss, SLA
8. **Action items** — lista de owner + ação + prazo (formato `DP Revert cfg-9a12 Apr 12`)
9. Footer com créditos

**Componentes obrigatórios:** pill row de metadata, timeline vertical, diff snippet, impact table, action items com prazo.

**Filosofia:** post-mortem é documento de aprendizado da empresa. Não é "quem errou" — é "o que mudamos para não acontecer de novo".

---

## 8. roadmap

**Quando usar:** planejamento trimestral, OKRs, planejamento de 6 meses+.

**Estrutura canônica:**

1. Eyebrow + h1
2. Lede com escopo e horizonte temporal
3. Meta-strip (período, objetivos, métricas-chave)
4. **Tema principal** — 1-3 temas estratégicos com h2 cada
5. Para cada tema, **timeline horizontal SVG** com marcadores trimestrais e barras de iniciativas
6. **Tabela de iniciativas** simple-table: iniciativa · owner · trimestre · status · risco
7. **Métricas de sucesso** — bullets do que medimos
8. **Out of scope** — explicitar o que não faremos (callout-pos)
9. Footer

Pode virar slide de um slide-deck também.

---

## 9. pr-writeup

**Quando usar:** descrição de PR longo para reviewers que não estão no contexto recente.

**Estrutura canônica:**

1. Eyebrow ("Pull request · projeto")
2. h1: "#NNN — título"
3. **Pill row de PR:** N files +X/−Y · branch_name → main · author
4. **Prompt-box** com a pergunta que gerou o writeup
5. **TL;DR** — o problema e a solução em 2 frases
6. **Why** — motivação, com **Before/After cards** lado a lado
7. **File-by-file** — ordenado por leitura (não alfabético), cada file com:
   - file-path · diff stats · nome ("**The heart of the PR**")
   - prosa explicando o porquê
   - snippet do código mais importante
8. **Where to focus your review** — 2-3 pontos numerados destacados
9. **Test plan** — bullets do que foi testado
10. **Rollout** — Day 0 / Day 2 / Day 4 com percentuais
11. Footer

**Componentes obrigatórios:** pill row de PR, before/after side-by-side, file-by-file ordenado, where-to-focus numerado, rollout timeline.

---

## 10. rfc

**Quando usar:** request for comments sobre decisão técnica grande. Mais formal que PR writeup, espera resposta de múltiplos engineers.

**Estrutura canônica:**

1. Eyebrow + RFC number/status (Draft/Open/Accepted/Rejected)
2. h1 com título da proposta
3. Meta-strip: autor · status · created · target decision date · stakeholders
4. **TL;DR**
5. **Background** — contexto e estado atual
6. **Motivation** — por que estamos discutindo isso agora
7. **Proposal** — descrição da proposta com diagramas SVG
8. **Alternatives considered** — 2-4 alternativas com prós/contras
9. **Trade-offs** — tabela com dimensões × opções
10. **Open questions** — questões para os reviewers responderem
11. **Decision log** — quem comentou o quê (preenchido durante revisão)
12. Footer

---

## 11. code-review-annotated

**Quando usar:** review extensivo com diff inline + comentários por linha.

**Estrutura canônica:**

1. Eyebrow + h1
2. Meta de PR
3. **Summary** — overall verdict + 3-5 main points
4. **Per-file diff** — cada arquivo com:
   - file-path
   - diff renderizado: linhas adicionadas em verde olive, removidas em danger
   - margin annotations à direita (severity tags + texto curto)
5. **Jump links** no topo para arquivos
6. Footer

Na dúvida, expanda a estrutura do pr-writeup com mais detalhe de diff.

---

## 12. survey-blueprint

**Quando usar:** especificação detalhada de pesquisa quantitativa, com perguntas, lógica condicional, hipóteses.

**Estrutura canônica:**

1. Eyebrow + h1
2. Prompt-box
3. Meta-grid 4 stats (tempo total, blocos, perguntas, branching)
4. TL;DR
5. **Flow diagram SVG** do fluxo do respondente
6. **Para cada bloco** (section-marker num-box):
   - h2 com nome do bloco
   - Block-meta (perguntas, branching, framework, hipóteses testadas)
   - Block-blurb (parágrafo serif)
   - Question-cards (grid 70px 1fr) com q-id + stem + options + annot-grid 3-col
   - **Skip-logic** code-block (mono, fundo ink) ao fim
7. **Risk table** com severity badges
8. **Sampling table** com alvo de amostra
9. Próximos passos em skip-logic code-block estilizado
10. Footer

---

## 13. analysis-dashboard

**Quando usar:** painel de leitura de dados, dashboard de métricas, leitura de resultado de pesquisa.

**Estrutura canônica:**

1. Eyebrow + h1
2. **Placeholder banner** (callout olive) se valores são placeholders
3. Meta-banner com 5 stats grandes
4. **Signal cards grid 2×2** — cada card com num mono, h3, big number, threshold, verdict, tags
5. **Verdict box** ink/paper — destaque ENORME com o veredito principal
6. **Reading rule** — tabela tri-table com combinações → veredito → ação
7. **Visualizações principais** — opportunity chart, kano graph, brand stretch matrix, etc, cada uma com:
   - Wrapper card com h4 + legend
   - SVG inline interativo (hover, toggle)
   - Controls row em cima se aplicável
8. **Segments grid** com persona-cards
9. Next steps
10. Footer

**Componentes obrigatórios:** placeholder-banner se aplicável, signal-cards, verdict-box, bubble chart SVG interativo.

---

## 14. interactive-mockup

**Quando usar:** mockup navegável de telas com toggle entre estados (mobile/desktop, vazio/preenchido/erro).

**Estrutura canônica:**

1. Eyebrow + h1
2. Lede
3. **Controls** — toggle device (mobile/desktop) + toggle estado
4. **Screens-grid** com tela por bloco, cada uma:
   - Screen-header (TELA NN · h2 · tempo estimado)
   - Screen-intro (descrição do que essa tela faz)
   - Screen-display (canvas com device-frame mobile OU desktop)
   - Annotations (grid de 3 cols: framework / análise / variável)
5. JS para toggle device/estado com `data-device` e `data-state`
6. Footer

**Device frames específicos:**
- Mobile: 360px, notch, status-bar, url-bar
- Desktop: 880px, browser chrome (3 dots, url), padding 2.5rem 3rem

---

## 15. design-system-spec

**Quando usar:** spec de design system, biblioteca de componentes, tokens.

**Estrutura canônica:**

1. Eyebrow + h1
2. **Color tokens** — grid de swatches com hex + nome
3. **Type scale** — sample de cada tamanho com nome
4. **Spacing scale** — visualização de spacers
5. **Components** — cada componente em iframe-like card mostrando variants
6. **Usage rules** — tabela do/don't
7. Footer

---

## 16. gallery-index

**Quando usar:** página de navegação para um conjunto de múltiplos arquivos relacionados.

**Estrutura canônica:**

1. Eyebrow geral do projeto
2. h1 grande com 1-2 linhas
3. Lede
4. Meta-strip com 5 metas do projeto
5. **Intro-aside** — callout serif com border-left explicando como ler a galeria
6. **Diagrama da cadeia** — SVG mostrando os arquivos como boxes encadeados ou agrupados
7. **Para cada arquivo, uma seção:**
   - Section-head (num · h2 · count "1 file · ~10 min")
   - Section-blurb (parágrafo do que tem nesse arquivo)
   - Card clicável (grid auto 1fr auto: num · body · arrow)
8. Footer

**Componentes obrigatórios:** intro-aside, cadeia SVG, cards grandes hover-able.

---

## 17. narrativa-ilustrada

**Quando usar:** é preciso *contar* (a história de um projeto, de um cliente ou de uma estratégia; o resumo de um podcast, livro ou entrevista; um pitch longo) e a peça vai circular fora do time ou precisa encantar. Estilo NYT, New Yorker ou The Pudding.

**Estrutura canônica:** medidor fixo → abertura (kicker, h1, dek em itálico, byline) → pintura hero → capítulos (placa + h2 + prosa + 1 visual forte + lição em comprovante) → manual com as lições recolhidas → rodapé com fontes e método.

**Componentes obrigatórios:** medidor de progresso, placa por capítulo, uma lição por capítulo, de 2 a 5 aquarelas pintadas por código com um comportamento cada, de 2 a 5 gráficos interativos com tabela, manual no fim.

**Guia completo:** `references/narrativa-ilustrada.md` (+ `aquarela-opencv.md`, `cenas-e-dataviz.md`).

---

## Quando combinar archetypes

Alguns pedidos pedem combinação. Casos comuns:

- **Pesquisa estratégica completa:** gallery-index + research-deep-dive + survey-blueprint + interactive-mockup + analysis-dashboard + slide-deck (6 arquivos)
- **Lançamento de feature:** implementation-plan + pr-writeup + roadmap
- **Decisão técnica grande:** rfc + decision-framework + slide-deck
- **Retrospectiva de quarter:** status-report + roadmap + slide-deck

Quando combinar, sempre construa o **gallery-index primeiro** se forem 3+ arquivos. Ele amarra o conjunto.

## Regra de ouro de archetype

Se o archetype está claro: vá. Se não está: pergunte ao usuário com 2-3 opções concretas, não improvise. Documentos no archetype errado são pior que documentos em archetype certo um pouco mal-acabados.
