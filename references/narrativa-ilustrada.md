# Narrativa ilustrada · archetype 17

Registro editorial da skill para quando o conteúdo **conta uma história** em vez de só reportar: a história de um projeto ou de um cliente, um estudo contado capítulo por capítulo, o "porquê" de uma estratégia, um onboarding de cliente, um pitch longo, o resumo de um podcast, livro ou entrevista. O alvo é uma peça no nível do New York Times / The Pudding / New Yorker: aquarelas que se mexem, gráficos que respondem e uma lição destacada por capítulo.

Referência estudada: "Home Depot, Illustrated" (companion do episódio do Acquired). O que vale copiar é a **arquitetura**. A temática de loja de material de construção não vale.

## Sumário
1. Quando usar (e quando não usar)
2. Os 7 movimentos que fazem a peça funcionar
3. Estrutura canônica
4. Metáfora física: escolha UMA do mundo do assunto
5. Componentes (CSS em `assets/narrativa.css`, JS em `assets/narrativa-kit.js`)
6. Fluxo de produção
7. Checklist antes de entregar

---

## 1. Quando usar

| Use narrativa ilustrada | Use o registro documento (archetypes 1–16) |
|---|---|
| Há uma sequência temporal ou causal (capítulos) | É referência para consultar fora de ordem |
| O leitor precisa ser **convencido** ou **encantado** | O leitor precisa **decidir rápido** ou operar |
| Há 3+ lições que valem ser lembradas | É status, checklist, spec de implementação |
| Vai circular fora do time (cliente, liderança, rede) | É interno e efêmero |
| Pedido fala em "contar a história", "narrar", "companion", "ilustrado", "estilo NYT/New Yorker", "explorable" | Pedido fala em "status", "tabela", "spec", "RFC" |

Custa de 3 a 5 vezes mais tokens que um relatório. Se o pedido é casual ("resume isso"), não use este registro. Só use quando a pessoa pedir algo caprichado ou quando a peça for para fora do time.

## 2. Os 7 movimentos que fazem a peça funcionar

Isto foi destilado da referência. Se faltar algum, a peça cai para "blog bonito".

1. **Um fio de progresso fixo no topo** que mapeia a fonte. Lá era a fita métrica de 3h35min do episódio; aqui é o visor da bomba com os capítulos. O leitor sempre sabe onde está e pode pular. Ele dá forma ao documento inteiro.
2. **Capítulos com cabeça física**, nunca um h2 nu. Lá eram placas de corredor penduradas; aqui são totens de preço (`.placa`). O número do capítulo vira objeto.
3. **Uma lição por capítulo, num objeto destacável** (`.licao`, o comprovante): um número grande que ancora (`46×`, `15 L`, `1,6%`) mais uma frase de no máximo 25 palavras. A lição é o "nugget". O número sozinho tem de dar vontade de ler a frase.
4. **Ilustração original em aquarela** a cada 1–2 capítulos, pintada por código e em camadas (ver `aquarela-opencv.md`). Cada pintura tem **um comportamento**: algo chega, pinga, balança ou acende. Nunca tudo ao mesmo tempo.
5. **Um gráfico por ideia quantitativa, e ele responde**: slider, troca de escala, passo a passo, play, hover. Todo gráfico tem `Mostrar os números` (tabela) e uma fonte na nota.
6. **Prosa de jornal**: coluna de ~37rem, serif de leitura (Newsreader), frases curtas, números com fonte e data. Nada de bullet na narrativa.
7. **Manual no fim** (`#manual`): as lições se recolhem sozinhas num grid clicável que volta ao capítulo. É o resumo executivo que ninguém precisou escrever duas vezes.

Além disso a referência cuidava de alguns detalhes:
- o papel é o fundo **também no tema escuro**: as pinturas ficam numa moldura de papel com sombra (`--print`, `--frame-pad`);
- a entrada da pintura não se repete: ela só "prepara" o que vai entrar por baixo, e o que já está na tela fica completo (`NK.revelar`);
- no celular, a pintura sangra a tela e a câmera passeia pelo foco da cena enquanto se rola. Não há scroll-jacking;
- `prefers-reduced-motion` mostra tudo parado e completo.

## 3. Estrutura canônica

```
medidor (sticky)                       ← fio de progresso por capítulo
abertura: kicker · h1 (1 palavra em itálico de destaque) · dek em itálico · byline mono
PINTURA HERO (larga, eager, fetchpriority=high)
[Parte um]
  capítulo: placa + cap-meta + h2
    prosa (3–6 parágrafos)
    números de abertura | gráfico | pintura   ← 1 elemento visual forte por capítulo
    licao (comprovante)
  ...
[Parte dois · análise]                 ← placa .analise (cinza) nos capítulos de leitura/crítica
  ...
manual (lições recolhidas)
rodapé: logo · fontes · método (como as aquarelas e os números foram feitos)
```

Faixa saudável: de 4 a 8 capítulos, de 2 a 5 pinturas, de 2 a 5 gráficos interativos e uma lição por capítulo. A referência tinha 17 capítulos, mas era um episódio de 3h35. Dimensione pelo material.

## 4. Metáfora física: escolha UMA do mundo do assunto

A referência funciona porque a página **é** uma loja de material: placa de corredor, etiqueta de prateleira com código de barras, fita métrica. Faça o mesmo com o mundo do assunto e mantenha a metáfora em todos os componentes.

| Assunto | Fio de progresso | Cabeça de capítulo | Lição |
|---|---|---|---|
| Posto de combustível (default do kit) | visor da bomba | totem de preço | comprovante serrilhado |
| Programa de pontos | extrato de pontos acumulando | selo de nível | cupom destacável |
| Logística / estrada | mapa de rota / km rodado | placa de rodovia | nota fiscal |
| Pesquisa com usuários | gravador com tempo da entrevista | ficha de entrevista | post-it |
| Financeiro / contrato | régua de vencimentos | aba de pasta | carimbo |

**Três metáforas já estão prontas no kit**: `pista` (default, sem atributo), `rodovia` e `extrato`. Elas vêm do contexto em que o kit nasceu, o varejo de combustível, e servem de molde: se o seu assunto é outro, crie a sua. Ative com `<html data-metafora="rodovia">`, ou deixe o `nova_narrativa.py --metafora` fazer isso. O prefixo do visor (`CAP`, `KM`, `PTS`) vai em `<span class="medidor-pre">`.

Para criar outra, escreva um bloco `[data-metafora="nova"]` no padrão dos que estão em `narrativa.css`. **Mude variáveis e cores, não layout.** Uma propriedade de layout sobrescrita sem media query, como `grid-template-columns` da `.licao`, anula a regra de celular do kit, e a lição fica em 2 colunas no 375px (já aconteceu num teste). Para mudar a largura da coluna do número, use `--licao-num-w`. Qualquer outro ajuste de layout vai dentro de `@media (min-width: 521px)`.

## 5. Componentes

Tudo vive em `assets/narrativa.css` e `assets/narrativa-kit.js`, que o `nova_narrativa.py` copia para `kit/` do projeto. Use o esqueleto gerado pelo `nova_narrativa.py` como molde de markup e de JS. **Antes de escrever JS próprio para um gráfico, veja se um destes resolve**: num teste, o agente escreveu cerca de 350 linhas que hoje são `NK.barras` + `NK.curvas`.

| Componente | Markup | JS |
|---|---|---|
| Medidor | `.medidor#medidor > .medidor-visor(.medidor-num,.medidor-rotulo) + .medidor-trilho > .medidor-cheio` | `NK.iniciar()` lê todos os `[data-cap]` |
| Capítulo | `section.capitulo[data-cap="Título curto"][id] > .cap-cab > .placa(.l,.n) + h2` | — |
| Lição | `aside.licao[data-rotulo] > .licao-num(b,span) + .licao-texto(.licao-eye,p,.licao-rodape)` | recolhida em `#manual` |
| Pintura | gerada por `aquarela.py figura` | `NK.cena(nome, spec)` |
| Números de abertura | `.numeros > div > .rot + .val[data-alvo] + .nota` | `NK.revelar` + `NK.contar` |
| Gráfico | `figure.fig > .fig-titulo + .fig-sub + .ctrl + .grafico + details.tabela + .nota-fig` | `NK.util.responsive` + `S()` |
| Simulador | `.sim > .ctrl(input[type=range][name]) + .presets(button[data-preset]) + .sim-saidas(output[name])` | `NK.simulador(raiz, calcular, formatos)` emite o evento `sim` |
| Passo a passo | `.passos > div(.passo × n + nav.passos-nav) + .grafico` | `NK.passos(raiz, aoMudar)` · setas e swipe |
| Tooltip | — (criado sob demanda) | `NK.dica.mostrar(x, y, montar)` |
| Manual | `.manual#manual` | `NK.iniciar({manual:'manual'})` |
| Linha à caneta com marcos | `.grafico#x` | `NK.linhaMarcos(raiz, {series, marcos, log, aoCruzar})` · eixo com passos redondos, crosshair |
| Mapa de UFs com play | `.grafico.mapa#x` | `NK.mapaUF(raiz, {anos, valores:{ano:{UF:n}}}, {rotulo})` · grade 7×8, ▶, slider, UF "acende" |
| Cartões que viram | `.cartoes#x > button.cartao > span.frente + span.verso` | `NK.virar(raiz)` · cria o botão "Virar todos" |
| Barras com troca de medida | `.grafico#x` | `NK.barras(raiz, [{rotulo, valores:{a,b}, destaque}], {medidas:[{chave,nome,fmt,escala}], aoMudar})` · seletor, tooltip e tabela automáticos |
| Curvas com play (cenários, série mensal) | `.grafico#x` | `NK.curvas(raiz, {x:[...], series:[{nome,cor,valores}], destaque, fmtY})` · ▶, slider, seletor de cenário, frase de leitura |

Os padrões de gráfico (caneta que desenha, marcos que sobem, mapa com play, troca de escala, flip de cartões, "vire de cabeça para baixo") estão em `cenas-e-dataviz.md`.

## 6. Fluxo de produção

0. **Esqueleto:** `python3 scripts/nova_narrativa.py <pasta> --titulo "..." --metafora pista|rodovia|extrato`. A pasta sai autossuficiente: o kit fica copiado em `kit/`.
1. **Material e lições primeiro.** Leia a fonte inteira e escreva a lista de capítulos com uma lição de 1 linha e o número-âncora de cada. Mostre isso ao usuário antes de pintar. É a única confirmação que vale pedir.
2. **Escolha a metáfora** (seção 4) e as cenas: uma por momento-chave, cada uma com UM comportamento.
3. **Dados**: puxe os números reais (banco de dados, planilha, fonte do material) e coloque em `<script type="application/json" id="dados-x">`. Nada de número inventado. Se o dado é ilustrativo, a nota diz isso.
4. **Pinte**: escreva `cenas/<nome>.json` e rode `uv run scripts/aquarela.py pintar ... --preview prev.jpg`. **Olhe a prévia** (Read na imagem) e itere 2–3 vezes. A primeira versão sempre sai "vetor demais" (ver `aquarela-opencv.md` §6).
5. **Monte o HTML** no esqueleto (`index.html + kit/ + cenas/ + layers/`). Comece da abertura e siga a ordem de leitura. Gere o markup das figuras com `aquarela.py figura`.
6. **Coreografe**: `NK.cena(...)` para cada pintura, gráficos com `NK.revelar`, e `NK.iniciar()` por último.
7. **Teste no navegador** (servidor local, nunca `file://`): desktop 1280, celular 375, tema claro e escuro, reduced-motion. Verifique se há erro no console e se o `scrollWidth` é igual ao `innerWidth` no celular. Teste as entradas com **rolagem de verdade** (a ação de scroll do navegador). `scrollTo()` em JS pula etapas, e com o painel sem renderizar o `IntersectionObserver` e o rAF nem disparam, o que parece bug mas não é. Teste também o caminho inverso: abrir por link no meio (`#cap-3`) tem de mostrar tudo completo.
8. **Empacote**: `python3 scripts/empacotar.py index.html --saida <nome>.html`. O resultado deve ficar abaixo de 3 MB.

## 7. Checklist antes de entregar

- [ ] Toda lição tem um número-âncora e uma frase de até 25 palavras, e aparece no manual
- [ ] Todo número tem fonte e data na prosa ou na `.nota-fig`
- [ ] Cada pintura tem `alt` descritivo, legenda e UM comportamento claro
- [ ] Todo gráfico interativo tem uma alternativa em tabela (`details.tabela`)
- [ ] A pintura hero usa `--eager` + `<link rel=preload fetchpriority=high>` e as outras são lazy
- [ ] Com `prefers-reduced-motion`, a página fica completa e parada
- [ ] No tema escuro as pinturas aparecem em moldura de papel e os textos passam contraste (`--accent-text`, não `--accent`)
- [ ] No celular (375px) não há rolagem horizontal, as pinturas sangram e os gráficos usam rótulo em cima
- [ ] Nada de emoji, PT-BR do começo ao fim, e o rodapé explica o método
- [ ] O arquivo final é standalone e tem menos de 3 MB

### Peça para cliente externo (vale também no registro documento)

Qualquer peça que o cliente pode repassar adiante:
- [ ] **Sem números internos da sua empresa** (receita, margem, custo). Mostre o que interessa ao cliente.
- [ ] **Sem sinais de risco do cliente** (inadimplência, churn previsto, auditoria). Isso é conversa em pessoa, não texto de documento.
- [ ] **Sem nomes internos:** pessoas, times, codinomes de projeto, tabelas e sistemas.
- [ ] **Nenhum outro cliente citado ou comparado.** Benchmark só agregado e anônimo.
- [ ] **Byline institucional** e a data do estudo.
- [ ] Rode uma busca final no HTML por nomes de clientes, de tabelas e de pessoas.

### Números que só existem no gráfico da fonte

O "nada de número inventado" tem uma exceção comum. Quando o estudo de origem traz um valor só na geometria de um gráfico (meses intermediários, a curva de um cenário), **pode ler das coordenadas**, desde que arredonde para a precisão que o gráfico permite e diga isso na `.nota-fig` ("valores de abr–jun lidos do gráfico do estudo, arredondados"). Se houver acesso à fonte primária (banco de dados, planilha), prefira refazer a consulta.

