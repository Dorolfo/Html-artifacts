# Cenas animadas e dataviz editorial

Como dar vida às pinturas e fazer gráficos que respondem, no nível NYT/Pudding, sem framework. Tudo está em `assets/narrativa-kit.js` (objeto global `NK`). Leia junto com `narrativa-ilustrada.md`.

## Sumário
1. Regras de performance (inegociáveis)
2. Motor de cenas: `NK.cena(nome, spec)`
3. Biblioteca de comportamentos (copie e adapte)
4. Padrões de gráfico editorial
5. Acessibilidade e tema escuro

---

## 1. Regras de performance

Cada uma existe porque a versão ingênua trava o celular:

1. **Nada roda fora da tela.** Um `IntersectionObserver` com margem de 25% liga e desliga cada cena, e o loop de `requestAnimationFrame` para sozinho quando nenhuma está perto.
2. **Ler tudo, depois escrever tudo.** No quadro, primeiro todos os `getBoundingClientRect()`, depois todos os `style.transform`. Intercalar os dois força o layout a cada linha (layout thrashing).
3. **Só `transform`, `opacity` e `mask` animam.** Nunca `top`, `left`, `width` ou `height` em loop.
4. **`translate3d` só enquanto a cena está viva.** Fora da tela, o kit troca por `translate()` e devolve a camada da GPU.
5. **Listeners de scroll e pointer são `{passive: true}`** e só "acordam" o loop; o trabalho acontece no rAF.
6. **Escreva no DOM só quando muda.** O kit guarda o último `transform`, `opacity` e `textContent` e compara antes de escrever.
7. **`prefers-reduced-motion`**: as cenas não iniciam, os `tween` pulam para o fim e os gráficos aparecem completos.
8. **Redesenhe gráfico só quando a LARGURA muda** (`NK.util.responsive`). A altura muda o tempo todo no celular por causa da barra do navegador.
9. **Nada de scroll-jacking.** No celular a câmera passeia pela pintura conforme a rolagem, mas o scroll nunca fica preso.
10. **Dados em `<script type="application/json">`**, lidos com `NK.util.dados(id)`. Assim o HTML fica legível e os números ficam num lugar só.

## 2. Motor de cenas

```js
NK.cena('posto', {
  entrada: 'florescer',           // 'florescer' (aguada se espalha, precisa de layers/bleed.png) | 'esboco' (grafite -> cor) | omitido
  pivos: { carro: [760, 700] },    // origem de rotação/escala, em coords da pintura
  profundidade: { carro: 10 },     // parallax com o mouse (só desktop)
  foco: [700, 1100],               // celular: x inicial e final da câmera ao rolar
  toque: { caixa: [x0,y0,x1,y1], hover: true },   // área que responde a clique (e hover)
  // várias áreas: toque: [{ nome: 'bico_g', caixa: [...] }, { nome: 'bico_e', caixa: [...] }] -> S.desde('toque:bico_g')
  iniciar: function (F) { /* overlays SVG: NK.brilhos, NK.overlay + texto */ },
  pose: function (S) {             // chamada a cada quadro enquanto a cena está viva
    return { carro: { x, y, r, s, o, mask } };    // px na escala da pintura, graus, escala, opacidade, mask CSS
  }
});
```

O que `S` traz:

| Campo | O que é |
|---|---|
| `S.t` | relógio em segundos (para loops: `Math.sin(S.t * f)`) |
| `S.et` | segundos desde a **chegada** (evento único: `clamp((S.et - atraso) / dur, 0, 1)`); 999 se a cena já estava na tela quando a página abriu |
| `S.p` | progresso suave da pintura na tela, de 0 (entrando por baixo) a 1 (saindo por cima). Use para cenas guiadas pelo scroll |
| `S.desde('toque')` | segundos desde o último clique/hover em qualquer área (999 se nunca); `S.desde('toque:nome')` para uma área específica |
| `S.vel(chave, v)` | velocidade suavizada de qualquer grandeza. Faz o carro inclinar ao frear e pular quando anda rápido |
| `S.F` | a figura (para overlays criados em `iniciar`) |

Utilitários de movimento: `NK.util.ease.out/inOut/back/smooth(a,b,v)`, `NK.util.mola.damp(t,a,w)` (balanço que assenta) e `mola.sdamp` (começa parado: ideal para resposta ao toque), além de `NK.cintilar(t,k)` (chama/lâmpada).

## 3. Biblioteca de comportamentos

Uma pintura tem UM comportamento principal e no máximo dois secundários sutis.

```js
// CHEGA E FREIA — carro, caminhão, moto (evento de chegada)
var d = Math.pow(1 - clamp((S.et - 0.2) / 3, 0, 1), 3), tx = -760 * d;
var v = S.vel('v', tx), a = S.vel('a', v), mv = Math.min(1, Math.abs(v) / 150);
carro: { x: tx, y: -Math.abs(Math.sin(S.t * 18)) * 1.6 * mv, r: clamp(a * 0.0016, -1.5, 1.5) }

// BALANÇA NO GANCHO e responde ao toque — placa, bico, avental, etiqueta
bico: { r: 1.2 * Math.sin(S.t * 0.9) + 10 * mola.sdamp(S.desde('toque'), 1.1, 4.2) }

// CONTADOR NO VISOR — litros, pontos, preço (texto SVG criado em iniciar)
var L = 18 * ease.inOut(clamp((S.et - 0.6) / 3.2, 0, 1)); F.txt.textContent = fmt(L, 1);

// IMPRIME / REVELA de cima para baixo — comprovante, mapa, reforma (mask)
var k = clamp((S.et - 4) / 1.6, 0, 1), b = -10 + k * 120;
comprovante: { mask: k >= 1 ? 'none' : 'linear-gradient(to bottom,#000 '+(b-8)+'%,transparent '+b+'%)', o: k <= 0 ? 0 : 1 }

// PINGA — gota, óleo (loop com fase: cresce, cai, some)
var u = (S.t % 2.8) / 2.8;
gota: u < .55 ? { s: .4 + .6 * u / .55 } : u < .75 ? { y: 160 * Math.pow((u - .55) / .2, 2) } : { o: 0 }

// PLANA — pássaros, nuvem, drone (senóides lentas e defasadas)
passaros: { x: 80 * Math.sin(S.t / 11), y: 9 * Math.sin(S.t / 2.6) + 3 * Math.sin(S.t / 1.1) }

// CAI E EMPILHA — caixas, latas, moedas (queda com quique; uma de cada vez)
col_i: { y: -1100 * (1 - dropEase(clamp((S.et - .2 - .17 * i) / .62, 0, 1))) }

// GUIADO PELO SCROLL — fila andando, carro estacionando enquanto se lê
fila: { s: clamp(1.3 - .6 * S.p, .7, 1.3) }

// LUZ — luminária, letreiro, cobertura ao entardecer (overlay criado em iniciar)
F.luzes.forEach(function (c, i) { c.style.opacity = .55 + .2 * Math.sin(S.t * .8 + i) + .08 * NK.cintilar(S.t, i); });
```

## 4. Padrões de gráfico editorial

Todos seguem a mesma regra: **o gráfico conta uma coisa só, o título diz qual, e a interação revela a segunda leitura.**

| Padrão | Quando | Como (no kit) |
|---|---|---|
| **Barras com troca de escala ou de medida** (linear↔log, % clientes ↔ % GMV) | ordens de grandeza diferentes; a "inversão" (poucos clientes, muito faturamento) | **`NK.barras`** (pronto): seletor, transição, tooltip com todas as medidas, tabela automática, rótulo em cima no celular |
| **Curvas com play** | projeção de adoção por cenário, série mês a mês | **`NK.curvas`** (pronto): ▶ revela mês a mês, slider, seletor destaca o cenário, frase de leitura atualiza |
| **Linha desenhada à caneta + marcos** | crescimento composto, "quando cruzou 10×, 100×", base acumulada x retida | **`NK.linhaMarcos`** (pronto): log ou linear com passo redondo, pontos nos marcos, rótulo no fim da série, crosshair; `aoCruzar` sobe o número de abertura quando a ponta passa |
| **Números de abertura que sobem** | o par que abre o capítulo (1,6% vs 92,9%) | `.numeros .val[data-alvo]` + `NK.revelar` + `NK.contar` |
| **Simulador com presets** | mecânica de negócio (cupom por litro, prazo de fornecedor) | `NK.simulador`: o evento `sim` repinta o desenho; os presets nomeiam casos reais |
| **Passo a passo** | negociação, funil, "dois portões", linha do tempo curta | `NK.passos`: o diagrama ao lado acende o passo atual |
| **Mapa de tiles com play** | expansão geográfica ano a ano (postos, redes, clientes por UF) | **`NK.mapaUF`** (pronto): grade 7×8 que preserva vizinhança, escala sequencial papel→de destaque (raiz quadrada), ▶ + slider, UF pulsa ao receber o 1º valor, foco por teclado |
| **Cartões que viram** | antes/depois, "hoje vs próximo passo", "na fundação vs hoje" | **`NK.virar`** (pronto): flip 3D com `backface-visibility`, um a um ou "Virar todos" em cascata |
| **Inverter / girar** | conceito que se explica pela forma (pirâmide invertida) | `transform: rotate(180deg)` em `transform-box: fill-box`, tocado uma vez na chegada |
| **Painéis empilhados com faixas de era** | várias séries no mesmo eixo de tempo (vendas, lojas, venda/loja) com mandatos de CEO | um SVG, várias faixas Y, `rect` de fundo por era, crosshair compartilhado no hover |
| **Drawdown** | "duas quedas longas, três fundos" | área abaixo de 0 a partir do máximo acumulado, com rótulo nos fundos |

Detalhes que separam o editorial do genérico:
- **Rótulo direto na série**, sem legenda solta quando possível; a legenda fica só quando há mais de 3 séries.
- **Anotação no ponto que importa** ("$1 milhão em 1989") em texto pequeno, colado na curva.
- **Cores com papel:** `--accent` para o protagonista, `--comp` para o comparativo, `--cinza` para o benchmark. Nunca mais de 3.
- **Números tabulares** (`font-variant-numeric: tabular-nums`) em eixos, tooltips e outputs.
- **No celular, o rótulo fica em cima da barra** (`w < 560`), não ao lado.
- **Tooltip único** (`NK.dica`) que some ao rolar, posicionado sem sair da tela.
- **Fonte e ressalva** na `.nota-fig`, sempre.

Para escolher a forma e a paleta de um gráfico, a skill `dataviz` também vale. Este arquivo cobre o como animar e o como integrar à narrativa.

**Regra de ouro do gráfico animado:** desenhe COMPLETO e só esconda na função de preparação do `NK.revelar`. Se você esconder no próprio desenho, quem chega por link, imprime ou rola para cima vê um gráfico vazio. Esse bug apareceu no teste do `linhaMarcos` e foi corrigido assim.

**Dado real ou nada:** todo gráfico parte de dado com fonte. Antes de usar uma data como "início" de uma série, confira se o histórico cobre o período inteiro, senão tudo parece nascer no primeiro mês disponível.

## 5. Acessibilidade e tema escuro

- Toda pintura tem `alt` descritivo; as camadas têm `alt=""` (são decoração do mesmo quadro).
- Gráfico com `role="img"` + `aria-label` que diz a conclusão, e a tabela em `details.tabela`.
- Controles são `<button>` e `<input>` de verdade, focáveis, com `:focus-visible`. O passo a passo aceita setas.
- O texto de destaque usa `--accent-text` (contraste AA no papel); o `--accent` puro fica para barras e marcas.
- Tema escuro: tokens redefinidos em `prefers-color-scheme` **e** em `[data-theme="dark"]`. As pinturas continuam em papel (`--print`) com moldura e sombra, e nunca se inverte uma aquarela.
- Impressão: `beforeprint` termina todas as entradas pendentes; passos aparecem todos, controles somem.
