# Design System

Tokens, tipografia e componentes. Leia este arquivo antes de construir qualquer documento. Os valores aqui são o padrão, não sugestões: a consistência entre documentos vem de não improvisar.

## Tokens de cor

Todo o sistema usa uma única cor de destaque sobre uma base neutra de papel e tinta. As cores secundárias têm significado fixo.

```css
:root {
  /* Destaque */
  --accent:      #2449C8;   /* blocos, bordas, traços de gráfico, palavra em itálico */
  --accent-soft: #5B78E6;   /* hover, segundo plano */
  --accent-text: #2449C8;   /* destaque usado como TEXTO: precisa de contraste 4,5:1 sobre --paper */

  /* Tinta */
  --ink:       #1a1612;     /* texto principal, bordas fortes */
  --ink-soft:  #3d342b;     /* prosa */
  --ink-mute:  #7a6f63;     /* metadados, rótulos, legendas */

  /* Papel */
  --paper:      #f5f1ea;    /* fundo da página, nunca branco puro */
  --paper-warm: #ede6d9;    /* cards e blocos */
  --highlight:  #e4e9fb;    /* fundo de destaque, derivado do --accent */

  /* Estrutura */
  --rule:      #d4c9b8;
  --rule-soft: #e5dccb;

  /* Significado */
  --olive:  #6b6d3a;  --olive-bg:  #ecf0e3;   /* positivo, confirmado */
  --danger: #a64545;  --danger-bg: #f5e6e6;   /* alerta, descartado */
}
```

O tema escuro é obrigatório e declarado duas vezes: uma para seguir o sistema de quem abre, outra para permitir forçar o tema.

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* tokens escuros */ }
}
:root[data-theme="dark"] { /* os mesmos tokens escuros */ }
```

Valores escuros do padrão: `--accent #8FA6FF`, `--accent-text #8FA6FF`, `--ink #EEE6DA`, `--ink-soft #C9BFB2`, `--ink-mute #9A8F82`, `--paper #17130F`, `--paper-warm #211C17`, `--highlight #1E2440`, `--rule #3A332C`, `--rule-soft #2A241F`, `--olive #A4A66A`, `--danger #D98080`.

O template aceita `?tema=claro` ou `?tema=escuro` no endereço para forçar o tema, o que é útil para tirar print.

### Regras de cor

- Nunca use branco puro ou preto puro. Fundo é `--paper`, texto é `--ink`.
- O fundo do documento é sempre `--paper`. `--paper-warm` e `--highlight` só em blocos pequenos.
- `--olive` e `--danger` só aparecem juntos em tabela de risco ou indicador de estado.
- Quando o destaque for texto pequeno (rótulo, número de seção, link), use `--accent-text`.
- Não escreva o hex do destaque solto no CSS. Sempre `var(--accent)`.

## Tipografia

Três famílias, cada uma com um papel.

```css
:root {
  --display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --sans:    'Inter', system-ui, sans-serif;
  --mono:    'JetBrains Mono', ui-monospace, monospace;
}
```

| Família | Onde usar | Onde não usar |
|---|---|---|
| display | h1, h2, números grandes, abertura, resumo, callout | metadados, código, tabela pequena |
| sans | prosa, tabela, texto de card | título grande |
| mono | eyebrow, rótulos, número de seção, pills, rodapé, código, eixos de gráfico | título, prosa |

Pesos: display em 400 e 600 (itálico em 600), sans em 400, 500 e 600, mono em 400 e 500. Peça ao Google Fonts só os pesos usados, sempre com `display=swap` e `preconnect`.

**A assinatura tipográfica do sistema** é uma palavra em itálico na cor de destaque dentro de cada título:

```html
<h1 class="hero">O desconto que <em>sumiu</em> na pista.</h1>
<h2 class="section-h"><span class="num">03</span><span>Três hipóteses, uma <em>sobrevive</em></span></h2>
```

Uma palavra por título, nunca duas. No h2, o texto do título vai dentro de um `<span>`, para o itálico não se separar do resto.

### Tamanhos

| Elemento | Tamanho | Observação |
|---|---|---|
| h1 | `clamp(2.2rem, 4.5vw, 3.4rem)` | line-height 1.05, letter-spacing -0.02em |
| h2 | 1.8rem (1.5rem no celular) | com borda superior de 2px em `--ink` |
| abertura | 1.15rem | largura máxima de 38em |
| prosa | 1rem | largura máxima de 44em |
| tabela | 0.92rem | |
| rótulo mono | 0.65 a 0.7rem | caixa alta, letter-spacing 0.1em |
| número grande | 2.4rem (2rem no celular) | |

Texto de corpo nunca abaixo de 0.78rem.

## Espaçamento

- Container com `max-width: 1080px` e `padding: 3.5rem clamp(16px, 4vw, 2rem) 5rem`.
- Cada h2 abre uma seção com `margin-top: 3.5rem`, `padding-top: 2.5rem` e borda superior forte. É a borda que marca a troca de assunto.
- Cards com 1.25 a 1.5rem de padding. Grids com gap de pelo menos 1rem.
- Mais respiro vertical do que horizontal.

## Componentes

Todos já estão em `assets/base-template.html`, com o CSS pronto.

| Componente | Classe | Para quê |
|---|---|---|
| Eyebrow | `.eyebrow` | linha mono no topo: projeto e contexto |
| Título | `h1.hero` | com uma palavra em `<em>` |
| Abertura | `.lede` | o que é o documento e para quem |
| Pills | `.pill`, `.pill.ok`, `.pill.med` | metadados curtos: status, severidade, dono |
| Resumo | `.tldr` | a conclusão antes das seções |
| Seção | `h2.section-h` | número mono e título |
| Números grandes | `.signals` e `.signal` | até três por linha; `.signal.hot` destaca um |
| Diagrama | `.diagram` com `.caption` | SVG inline, com legenda e fonte do dado |
| Tabela | `.table-wrap` e `table.simple` | `td.num` alinha números à direita |
| Badge | `.sev.high`, `.sev.med`, `.sev.low` | estado ou prioridade em tabela |
| Código | `.codeblock` | `.del` e `.add` para diff |
| Destaque | `.callout` | a frase que o leitor precisa levar |
| Rodapé | `footer` | projeto, documento e fonte dos dados |

## SVG

SVG inline usa as classes do template, que apontam para os tokens e por isso acompanham o tema escuro:

- formas: `.box`, `.box-hot`, `.arrow`, `.axis`, `.grid`
- texto: `.t-mono`, `.t-mono-hot`, `.t-title`, `.t-sub`
- gráfico: `.line-hot`, `.line-ghost`, `.dot`

Sempre com `viewBox`, sem `width` e `height` fixos, e com `role="img"` e `aria-label` descrevendo o que o desenho mostra. Diagrama largo vai dentro de `.scroll-x`, para rolar no próprio bloco no celular.

Hex literal só quando o SVG vai sair da página (arquivo separado, slide, imagem exportada).

## Responsivo

Um breakpoint principal, `@media (max-width: 700px)`:

- margem lateral de 16px;
- grids de cards viram coluna única;
- tabelas e diagramas largos rolam dentro do próprio bloco;
- a página nunca rola na horizontal. Confira com `document.documentElement.scrollWidth === window.innerWidth`.

## Como trocar a marca

1. **Cor de destaque.** Troque `--accent`, `--accent-soft` e `--accent-text` em `:root` e nos dois blocos escuros. Confira o contraste de `--accent-text` sobre `--paper`: precisa ser de pelo menos 4,5:1. Se a cor da marca for clara demais para texto, mantenha `--accent` na cor original e use um tom mais escuro só em `--accent-text`.
2. **Fundo de destaque.** Derive `--highlight` da nova cor: um tom bem claro dela no tema claro, um bem escuro no tema escuro.
3. **Fonte display.** Troque `--display` e o link do Google Fonts. Escolha uma família que tenha itálico, porque a palavra em destaque depende dele. Se a fonte da marca for licenciada e não estiver no Google Fonts, embuta em base64 com subset dos caracteres usados, e não distribua o arquivo junto com a skill.
4. **Logo.** Se quiser, coloque o logo como SVG inline no início do eyebrow e do rodapé, com cerca de 18px de altura e `fill="currentColor"` para herdar a cor do texto. Nunca use `<img>` apontando para arquivo externo: o documento é standalone.
5. **Atualize este arquivo** com os novos valores, para que o agente leia os tokens certos.

## Checklist final

- [ ] Eyebrow no topo e rodapé no fim
- [ ] h1 com exatamente uma palavra em itálico de destaque
- [ ] Resumo com a conclusão antes das seções
- [ ] Todo número com fonte e data
- [ ] Sem emoji, sem branco puro, sem preto puro
- [ ] Pelo menos um diagrama em SVG inline, quando houver fluxo, comparação ou série
- [ ] Tema escuro declarado e conferido
- [ ] 375px sem rolagem horizontal
- [ ] CSS e JS inline; nenhum recurso externo além das fontes
