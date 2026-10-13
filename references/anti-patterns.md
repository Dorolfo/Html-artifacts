# Anti-Patterns

O que **não fazer** ao construir artefatos. Cada item desta lista existe porque é uma armadilha comum de IA — quando você está construindo um documento e algo "parece feito por IA genérica", role esta lista e procure o anti-pattern.

## Visuais

### ❌ Branco puro como fundo

`background: white` ou `background: #fff` em qualquer lugar do documento. Sempre `--paper` (#f5f1ea) no body, `--paper-warm` (#ede6d9) em cards. Branco puro é estética default de framework JS — não é estética editorial.

### ❌ Emoji decorativo

Nada de 📊, 🎯, 🚀, ✅, ⚡. Substitua por marcadores tipográficos: `·`, `→`, `←`, `↑`, `↓`, `—`. Se precisar de indicador de status, use uma `pill` com cor (badges `.sev.high` etc) ou um quadrado/círculo SVG colorido.

### ❌ Box-shadow exagerado

Shadow forte (`0 4px 12px rgba(0,0,0,0.1)+`) é estética Material/Tailwind genérica. Use shadow apenas para "device frames" em mockup (`0 2px 6px rgba(0,0,0,0.04)`) ou nada. Border de 1px solid `--rule` faz melhor o trabalho.

### ❌ Border-radius excessivo

`border-radius: 8px+` em cards faz parecer Notion. Use `border-radius: 3px` a `4px` em cards, `2px` em pills, `50%` em circles, e `24px` apenas em device-frame de mockup mobile (notch). Cantos quase-vivos.

### ❌ Gradiente

Sem gradiente. Paleta é flat. Se sentir vontade de gradient, está procurando contraste — resolva com bordas, ou troca de fill, ou hierarquia tipográfica.

### ❌ Ícones SVG decorativos

Folder, gear, star — não. Se precisar de ícone, é provavelmente metadata (nome de seção) e vai em mono caps. Se for *de verdade* visual, faça um símbolo SVG inline simples (linha, círculo, triângulo).

### ❌ Cores fora da paleta

Qualquer azul, roxo, verde-grama, vermelho-tomate. A paleta tem 10 cores nomeadas. Não invente.

## Tipografia

### ❌ Mais de 1 palavra italic accent no h1

`<h1>O <em>grande</em> e <em>magnífico</em> relatório</h1>` — não. Uma palavra italic, no ponto-chave. Italic é destaque conceitual, não decoração.

### ❌ Italic em fonte errada

Italic vale na fonte display (títulos e destaques). Inter italic em UI e JetBrains Mono italic ficam fracos e ilegíveis em tamanho pequeno.

### ❌ Bold em prosa

Prosa fica em weight 400. `<strong>` dentro da prosa vai para `font-weight: 500/600` ou `color: var(--ink)` (contra `--ink-soft` da prosa), nunca bold pesado.

### ❌ Tamanhos arbitrários

`font-size: 19px`, `21px`, `28px` — não. Use os tamanhos canônicos do design-system. Se um tamanho do design não bate exatamente, escolha o mais próximo, não invente.

### ❌ Line-height apertado em prosa serif

Prosa serif precisa de `line-height: 1.55`. Default 1.5 em sans, 1.55 em serif body. Apertar mais que isso cansa.

### ❌ Letter-spacing em prosa

`letter-spacing` é só para mono uppercase (eyebrow, labels, tags). Em prosa normal, deixa default.

## Conteúdo e prosa

### ❌ Bullets gratuitos

Converter prosa em bullets quando os itens não são paralelos. Sintoma: cada bullet começa com gerúndio diferente, ou tem comprimento muito diferente. Reescreva em prosa.

### ❌ "Em conclusão", "Resumindo", "Em suma"

Linguagem de essay genérica. Se você está concluindo, conclua. Se está resumindo, resuma. A meta-narração rouba autoridade.

### ❌ Hedging excessivo

"Talvez", "provavelmente", "pode ser que", "em alguns casos" — peso de palavras que dilui o argumento. Use só quando há genuína incerteza. Em vez de "talvez vale considerar X", escreva "Vale considerar X" ou "X resolve" — direto.

### ❌ Marcadores de transição artificiais

"Adicionalmente,", "Além disso,", "Por outro lado," — quase sempre desnecessários em prosa serif boa. O parágrafo seguinte já implica progressão.

### ❌ Linguagem corporativa vaga

"Sinergia", "alavancagem" (no sentido businessês), "stakeholder buy-in", "value proposition" — substitua por palavra concreta. "Alavancagem" é OK em contexto ODI; "sinergia" raramente.

### ❌ Frases muito longas em UI

Em h1, h2, labels, eyebrow, helpers — frases curtas. Prosa serif aceita parágrafos longos. UI não.

### ❌ Inglês desnecessário

Termos técnicos consagrados em inglês são OK (PMF, NPS, JTBD, MVP, KPI, OKR). Mas `roadmap`, `framework`, `feature` — escolha com cuidado. `roadmap` virou termo BR, OK. `framework` também. `feature` no plural ("features") soa estrangeiro — considera "recursos" ou "funcionalidades" se couber. Não force tradução, mas não force inglês.

## Estrutura

### ❌ Sem eyebrow no topo

Toda página HTML começa com eyebrow. Sempre. Mesmo standalone — ele dá contexto: nome do projeto, número do arquivo, link de volta se for galeria.

### ❌ Sem footer no fim

Toda página termina com footer (mono pequeno) que repete o nome do projeto + nav prev/next se for galeria.

### ❌ H2 sem border-top

H2 marca mudança forte de seção. Sempre `border-top: 2px solid var(--ink); padding-top: 2.5rem;`. Se uma seção não merece esse peso, não é h2 — é h3 ou nem é seção separada.

### ❌ Ordem de leitura confusa

Construir o documento fora da ordem em que ele é lido cria documentos que parecem montagem. Sempre: eyebrow → h1 → lede → meta → TL;DR → seções na ordem → footer.

### ❌ Mais que 2 níveis de nesting em listas

Lista dentro de lista dentro de lista é Markdown thinking. Em HTML editorial, raramente passa de 2 níveis. Se você precisa de 3, é hierarquia — use h3 + lista.

### ❌ Tabela quando é prosa

Tabela é para comparar N itens em M dimensões. Se você tem 1 item e várias dimensões, é definition list ou parágrafo com bold no termo. Se tem N itens em 1 dimensão, é lista.

### ❌ Tabela quando é diagrama

Trade-offs, fluxos, sobreposições — não viram tabela bem. Viram SVG.

## Interatividade

### ❌ Animação por animação

Slide-in, fade-up, scroll-trigger em elementos que não precisam de animação. Animação serve quando há mudança de estado (toggle, modal, slide-deck transition). Não como decoração.

### ❌ Hover effect em tudo

Hover faz sentido em: cards de gallery clicáveis, bubbles de scatter, options de toggle, botões. Não em texto, headings, ou conteúdo passivo.

### ❌ Dependência de JS pesado

Se o documento depende de JS para mostrar conteúdo (não interação, conteúdo), o JS está fazendo trabalho que devia ser HTML/CSS. Mostrar/esconder com toggle é OK. "Carregar" o conteúdo via JS não é.

### ❌ Localstorage / sessionstorage

Skill para artefatos não usa storage. Estado vive na sessão da aba. Se precisar persistir algo, é arquivo separado, não state.

### ❌ Form com `<form>` real

Mockups de form usam `<div>` com classes simulando estados — não `<form>` real (que dispara submit, recarrega página). É mockup, não app.

## SVG

### ❌ Hex literal em SVG inline

SVG inline no HTML deve usar `var(--token)`, senão o diagrama não acompanha o tema escuro. Hex literal só quando o SVG sai da página (arquivo `.svg` separado, colado em slide ou exportado como imagem), porque lá as variáveis não existem.

### ❌ Width/height fixos no SVG

`<svg width="700" height="400">` em vez de `viewBox`. Quebra responsividade. Sempre `viewBox`.

### ❌ SVG complexo demais

Mais de 50 elementos, paths com 100+ pontos, gradientes elaborados — provavelmente é caso para imagem real, ou para repensar o diagrama. Mantenha simples.

### ❌ Texto sem text-anchor

Default text-anchor é `start`. Em diagrama, isso causa desalinhamento. Sempre declare: `text-anchor="middle"` para labels centrados, `"end"` para labels à direita.

### ❌ Mermaid

Não. SVG inline puro.

## Geral

### ❌ Múltiplos arquivos sem index

Se você fez 3+ HTMLs relacionados, precisa de um index. Sem ele, o usuário não navega — abre um, fecha, esquece dos outros.

### ❌ Esquecer mobile breakpoint

Sempre `@media (max-width: 700px)` (e às vezes 900px para sidebars). Sem isso, o documento quebra em celular — e muito do team vai abrir no celular.

### ❌ Esquecer Google Fonts link

O documento sem fonts vira Times New Roman + Arial. Fica genérico instantaneamente. Sempre carregar fonts no `<head>`.

### ❌ Postamble longo após entregar o arquivo

Depois de salvar e mostrar o arquivo ao usuário, encerre com 2-4 frases curtas dizendo o que cada arquivo entrega. Não escreva mais um relatório explicando o relatório. O usuário vai abrir o arquivo — deixa o arquivo falar.

### ❌ Conversação dentro do HTML

Documentos HTML não são chat. Não usar "Espero que isso ajude!", "Posso refinar se necessário", "Me diga se quiser ajustar". Documento é entregável, não mensagem.

### ❌ Genérico

Se um título funciona igualzinho para qualquer empresa, está genérico. Se um exemplo poderia ser qualquer outro exemplo, está genérico. Use nomes reais, números reais (placeholders são OK desde que com a label "placeholder"), referências reais.

## Checklist final · antes de empacotar

- [ ] Sem branco puro
- [ ] Sem emoji
- [ ] H1 tem 1 palavra italic accent
- [ ] Eyebrow no topo, footer no fim
- [ ] Pelo menos 1 diagrama SVG inline (exceto em arquivo puramente textual)
- [ ] Mobile breakpoint aplicado
- [ ] Google Fonts link incluído
- [ ] Conteúdo em PT-BR
- [ ] `--accent` definido uma única vez em `:root` (e na versão escura), nunca repetido como hex solto no CSS
- [ ] Nenhum item desta lista de anti-patterns
- [ ] Standalone (CSS + JS inline, sem deps externas além de fonts)
- [ ] Footer com prev/next se for galeria
- [ ] Tema escuro declarado (media query + `[data-theme]`) e testado
- [ ] Texto de destaque usa `--accent-text`, não `--accent`
- [ ] Toda `<img>` com `width`/`height`; hero com `fetchpriority="high"`, resto `loading="lazy"`
- [ ] 375px sem rolagem horizontal; console sem erro
- [ ] `prefers-reduced-motion` deixa tudo completo e parado

Se algum falhar, ajuste antes de entregar.

## Movimento e performance (qualquer documento animado)

### ❌ Animação que deixa o documento incompleto
Elemento que começa invisível e só aparece se o scroll "passar certo". Quem chega por link no meio, imprime ou usa reduced-motion vê buraco. Anime só o que entra por baixo da tela, e deixe o resto pronto.

### ❌ Scroll-jacking
Prender a rolagem para tocar uma animação. O documento pode *reagir* ao scroll, mas nunca pode *sequestrá-lo*.

### ❌ Loop de animação rodando fora da tela
`requestAnimationFrame` eterno, ou `setInterval`, para cena que ninguém está vendo. Use IntersectionObserver e deixe o loop dormir.

### ❌ Layout thrashing
Ler `getBoundingClientRect()` e escrever `style` intercalados dentro do mesmo quadro. Leia tudo primeiro e escreva depois.

### ❌ Animar top/left/width/height
Só `transform`, `opacity` e `mask`. O resto força layout a cada quadro.

### ❌ Tudo se mexendo
Cena com cinco coisas animadas vira GIF de 2005. É UM comportamento principal por cena e no máximo dois sutis.

