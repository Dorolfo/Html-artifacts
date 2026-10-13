# Padrões de Diagramas SVG

Padrões canônicos de diagramas SVG para os artefatos. **Cada padrão tem um caso de uso específico** — escolha o certo, não tente forçar um padrão em situação que não pede. Implementação completa em `assets/svg-snippets.html`.

## Princípios gerais de SVG no sistema

1. **SVG inline sempre** — nunca como `<img>` ou external file.
2. **`viewBox`, não width/height fixo** — escala fluida. Tipicamente `viewBox="0 0 700 NNN"` com `width: 100%` no CSS.
3. **`<style>` interno ao SVG** — classes nomeadas dentro do próprio SVG, sem depender de CSS global.
4. **Hex literal**, não CSS variables (não funcionam em todos os contextos de render).
5. **Tipografia mono para metadata, display (Plus Jakarta Sans) para títulos, sans (Inter) para descrições.** Cores sempre via `var(--token)` para o diagrama funcionar no tema escuro.
6. **Sem gradientes complexos.** O sistema é flat com paleta fechada.
7. **Stroke-width entre 1 e 2.5px.** Acima disso vira ilustração; abaixo desaparece.
8. **fill-opacity 0.18 a 0.7** para fills coloridos em Venn/quadrants/zonas — nunca opaco total.

## Catálogo · 7 padrões

### 1. Flowchart (boxes + connectors)

**Quando usar:** mostrar fluxo de processo, sequência de etapas, cadeia de transformações, branching condicional.

**Anatomia:**
- Boxes retangulares com bordas arredondadas (`rx="3"`)
- 3 tipos de box: padrão (fill paper-warm, stroke ink), accent (fill highlight, stroke accent 2px), final (fill paper, stroke ink 2px)
- Cada box com: num mono (canto sup esq), título display, sub em sans
- Connectors com `<marker>` para setas
- Connectors padrão sólidos, branching/alternativo tracejado (`stroke-dasharray="4 3"`)
- Stage labels em mono pequeno acima das colunas

**Exemplo de marker (sempre defina no `<defs>`):**

```svg
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#7a6f63"/>
  </marker>
</defs>
```

**Largura/altura típica:** `viewBox="0 0 1000 200"` para fluxo horizontal de 5 boxes. `viewBox="0 0 1000 380"` para fluxos com branching vertical.

**Exemplos de uso:**
- Cadeia de arquivos num gallery-index (5 boxes horizontais)
- Fluxo de respondente num survey-blueprint (boxes com branching)

---

### 2. Venn diagram (sobreposição de conjuntos)

**Quando usar:** mostrar como N conceitos/sinais/dimensões se sobrepõem, ou que a interseção produz algo.

**Anatomia:**
- N círculos sobrepostos (2 a 4 círculos é o sweet spot — mais que isso vira ilegível)
- Cada círculo: `fill-opacity="0.18"`, `stroke` 1.5px na mesma cor
- Labels mono uppercase fora de cada círculo
- Sub-labels sans pequenos
- Label central (no overlap principal) em display italic

**Cores recomendadas para 4 círculos:** `--accent (#2449C8)`, `--olive`, `--danger`, `--ink` (com fill-opacity 0.12 para o ink, senão fica preto sólido).

**Tamanho típico:** `viewBox="0 0 700 300"`, círculos r=100, posicionados em 280/420 (x) e 140/200 (y) para 4 círculos.

**Exemplo:** triangulação dos 4 sinais no `01-research-foundation.html`.

---

### 3. Matrix / quadrant (2×2)

**Quando usar:** classificar coisas por 2 dimensões, mostrar trade-offs, "X vs Y", brand stretch quadrants.

**Anatomia:**
- 4 rectangles formando grid 2×2
- Eixos com axis-labels mono uppercase
- Tick labels (anchors) mono pequenos
- Cada quadrant com fill diferenciado:
  - "Go" / positive: `fill="#ecf0e3"` (olive paper)
  - "Mixed" / warning: `fill="#e4e9fb"` (highlight)
  - "Stop" / negative: `fill="#f5e6e6"` (danger paper)
  - "Neutral" / indifferent: `fill="#f5f1ea"` (paper)
- Tag mono uppercase em cada quadrant ("PROSPECTS", "LOYALISTS")
- Nome em display + descrição em sans

**Tamanho típico:** `viewBox="0 0 700 480"`, quadrants 280x180 cada.

**Exemplo:** brand stretch matrix no `04-analysis-dashboard.html`.

---

### 4. Bubble chart / scatter (com hover)

**Quando usar:** plotar N entidades em 2 dimensões (importância × satisfação, CS+ × CS−), com tamanho de bubble indicando 3ª dimensão.

**Anatomia:**
- Eixos com `<line>` ink 1.5px stroke
- Grid lines tracejados em rule
- Zonas de fundo opcionais (rect com fill-opacity 0.35) para destacar quadrants de interesse
- Bubbles: `<circle>` com fill (uma cor por categoria), stroke ink 1px
- Cada bubble com label sans pequeno (id curto: A1, B2, C3...)
- **Hover interativo:** group `#hoverInfo` escondido por default, mostrado via JS no mouseenter

**JS para hover:**

```js
const bubbles = document.querySelectorAll('.bubble');
const hoverInfo = document.getElementById('hoverInfo');
const hoverName = document.getElementById('hoverName');
const hoverVal = document.getElementById('hoverVal');

bubbles.forEach(b => {
  b.addEventListener('mouseenter', () => {
    hoverName.textContent = b.dataset.name.toUpperCase();
    hoverVal.textContent = b.dataset.value;
    hoverInfo.style.display = '';
  });
  b.addEventListener('mouseleave', () => {
    hoverInfo.style.display = 'none';
  });
});
```

**Tamanho típico:** `viewBox="0 0 700 460"`, padding 80px nos eixos.

**Exemplo:** Opportunity Landscape no `04-analysis-dashboard.html`.

---

### 5. Timeline / sequência temporal

**Quando usar:** roadmap, milestones, sequência de eventos com tempo, incident timeline.

**Variante A · horizontal (roadmap):**
- Linha base horizontal `ink` 1.5px
- Marcadores de trimestre/mês como `<circle>` pequenos
- Barras horizontais (rects) representando iniciativas, com fill por status
- Labels acima das barras em sans

**Variante B · vertical (incident report):**
- Coluna esquerda: timestamp mono
- Coluna direita: descrição sans
- Border-left rule entre elas
- Dot accent no momento crítico (mitigação, alerta)

**Tamanho horizontal típico:** `viewBox="0 0 1000 200"`. Vertical não usa SVG — usa CSS grid.

---

### 6. Curves chart (Kano-like, satisfação por implementação)

**Quando usar:** mostrar relação não-linear entre duas variáveis (Kano curves, learning curves, growth curves).

**Anatomia:**
- 2 eixos cruzando no centro do quadrant (não no canto)
- Curves desenhadas com `<path>` usando comando Q (quadratic Bezier) para curvas suaves
- 3-4 curves diferentes com cores semânticas: danger (must-be), accent (performance), olive (attractive), mute (indifferent)
- Curve-labels em display na ponta direita
- Quadrant labels (satisfação/insatisfação, presente/ausente) em mono uppercase

**Exemplo de curve performance (linear):**

```svg
<path d="M 100 320 L 600 60" class="curve-perf"/>
```

**Exemplo de curve attractive (delighter, S-curve):**

```svg
<path d="M 100 60 Q 280 65 360 175 Q 440 290 600 305" class="curve-attr"/>
```

**Tamanho típico:** `viewBox="0 0 700 360"`.

**Exemplo:** curvas Kano no `01-research-foundation.html`.

---

### 7. Network / nodes-edges (relacionamento)

**Quando usar:** mapear relacionamentos entre entidades, module map, dependências.

**Anatomia:**
- Nodes como `<circle>` ou `<rect>` rounded
- Edges como `<line>` com markers de seta
- Edges com peso/tipo distintos: sólidos para principal, tracejados para opcional/realtime
- Labels nos nodes em sans, labels nas edges em mono pequeno

**Tamanho típico:** `viewBox="0 0 700 400"`, espalhamento orgânico.

**Exemplo:** data flow num implementation-plan.

---

## Estrutura mínima de qualquer SVG

```svg
<svg viewBox="0 0 700 NNN" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- markers, gradients (raros), patterns (raros) -->
  </defs>

  <style>
    .class-1 { ... }
    .class-2 { ... }
    .label-mono { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: #2449C8; }
    .label-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; fill: var(--ink, #1a1612); font-weight: 600; }
    .label-sub { font-family: 'Inter', sans-serif; font-size: 11px; fill: var(--ink-mute, #7a6f63); }
  </style>

  <!-- Background zones (se houver) -->
  <!-- Axes / grid lines (se houver) -->
  <!-- Main elements -->
  <!-- Labels -->
  <!-- Hover info groups (último, para sobreposição) -->
</svg>
```

## Boas práticas

- **Sempre `text-anchor` explícito** para textos: `"start"`, `"middle"`, ou `"end"`. Default sem isso vira inconsistente entre navegadores.
- **Caps nos labels mono:** `text-transform` não funciona em SVG. Escreva já em CAPS no texto.
- **letter-spacing em labels mono:** `letter-spacing: 1px` (não usar em em-units em SVG).
- **Stroke alignment:** SVG não tem `stroke-align`, então conte com stroke centrado. Para alinhar com pixel grid, ajuste coordenadas em 0.5.
- **Não use `<foreignObject>` se evitável** — HTML dentro de SVG quebra em PDF e em alguns export.

## Quando NÃO usar SVG

- Para mostrar HTML real (mockup de UI): use HTML/CSS dentro de um device-frame, não SVG.
- Para fórmulas matemáticas complexas: use HTML com `<sub>`, `<sup>`, e `--mono` font.
- Para tabelas: tabela HTML real, não SVG. Sempre.

## Tamanhos / proporções recomendados

| Tipo | Aspect ratio | Quando |
|---|---|---|
| Flowchart horizontal | 5:1 (1000×200) | 4-6 etapas em linha |
| Flowchart com branch | 2.5:1 (1000×400) | branching ou colunas |
| Venn 4 círculos | 7:3 (700×300) | sobreposição central |
| Matrix 2×2 | ~3:2 (700×480) | quadrants com texto |
| Bubble chart | ~3:2 (700×460) | scatter com ~10-15 bubbles |
| Curves chart | ~2:1 (700×360) | 3-4 curves rotuladas |
| Timeline horizontal | 5:1 (1000×200) | 4-6 marcadores |

Não invente proporções estranhas — escolha a mais próxima dessa tabela.
