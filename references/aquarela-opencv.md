# Aquarela por código · OpenCV + NumPy

Como pintar as ilustrações das narrativas **sem gerador de imagem, sem banco de imagens e sem licença**. Tudo sai de `scripts/aquarela.py`, rodado com `uv run` (as dependências se instalam sozinhas pelo cabeçalho PEP 723, sem venv).

## Sumário
1. Por que pintar por código
2. O modelo físico (o que faz parecer aquarela)
3. Os 5 comandos
4. A cena em JSON: esquema completo
5. Receitas (céu, nuvem, chão, prédio, carro, pessoa, luz, texto)
6. Erros clássicos da primeira versão, e a correção
7. Fotos reais, prints e fotos históricas
8. Peso e performance

---

## 1. Por que pintar por código

- **É original e não tem licença.** Ninguém mais tem aquela imagem, e não depende de foto de banco nem de IA generativa com termos de uso.
- **Já sai em camadas.** Cada objeto (carro, frentista, bico) vira um WEBP com alfa e posição no manifesto. Isso permite **animar** a pintura no HTML, algo que imagem pronta não deixa.
- **É determinístico.** O mesmo `seed` gera a mesma pintura, o JSON entra no git e a cena pode ser editada com diff.
- **É leve.** Uma cena 1600×860 inteira (base + 5 camadas) pesa uns 120 KB em WEBP.

O que não fica bom: rosto, mão, perspectiva complexa e texto. Para isso, use texto em SVG por cima (§5) ou o modo `foto` (§7). Também não force: a estética é de **ilustração editorial de formas simples**, e o charme está nisso.

## 2. O modelo físico

São seis efeitos, e todos estão em `paint_object()`:

| Efeito | No papel de verdade | No código |
|---|---|---|
| **Glazing** | a tinta é transparente, cada camada **multiplica** a de baixo e nunca cobre | trabalha em transmitância: `T *= 1 - D·(1 - cor)` |
| **Borda úmida** | ao secar, o pigmento migra para a beira da poça, e a borda fica mais escura | `máscara - blur(máscara)` soma densidade na faixa interna (`wet`) |
| **Granulação** | o pigmento assenta nos vales do papel | ruído fino modulado pela textura do papel (`granulation`) |
| **Poça irregular** | a água não espalha por igual e deixa manchas e backruns | ruído de baixa frequência multiplica a densidade (`pool_scale`) |
| **Borda de pincel** | mão humana não faz reta | a máscara é deformada por um campo de ruído suave (`wobble`) |
| **Registro solto** | a tinta não cai exatamente dentro do traço de nanquim | a mancha é deslocada uns px em relação à linha (`offset`) |

Por cima disso vêm três camadas: o **nanquim** (traço sépia com pressão que respira, passando 2–6 px do canto, com a caneta levantando às vezes), o **papel** (fibra + grão + relevo, na cor do token `--paper`) e a **borda rasgada** (a aguada termina irregular antes da margem).

Duas operações de pintor real valem ouro:
- **`mode: "lift"`** tira tinta com papel absorvente. É assim que se fazem nuvens, reflexos e faixas de estacionamento.
- **`reserva: true`** é a goma de reserva: protege uma área para o fundo não passar por baixo. Sem isso, um objeto opaco (bomba, prédio) fica transparente sobre o céu ou o chão.

## 3. Os 5 comandos

```bash
S=<skill>/scripts
uv run $S/aquarela.py pintar  cenas/posto.json --out layers --preview /tmp/prev.jpg   # cena -> base + camadas + manifesto
uv run $S/aquarela.py figura  layers/posto.json --larga --eager --alt "..." --legenda "..."  # imprime o <figure>
uv run $S/aquarela.py bleed   --out layers/bleed.png                                # máscara da entrada "florescer"
uv run $S/aquarela.py foto      print.png --out layers/app.webp --tintas 10          # foto/print -> aquarela
uv run $S/aquarela.py historica foto.jpg  --out layers/1979.webp                     # foto de arquivo -> sépia/duotone
```

Saídas do `pintar`: `<nome>.webp` (base: tudo que não é camada, já no papel), `<nome>--<obj>.webp` (camada com alfa, recortada), `<nome>--<obj>-m.webp` (sombra, blend multiply) e `<nome>.json` (manifesto: `w`, `h`, `base`, `layers[{name, part, file, x, y, w, h, blend}]`).

O `--preview` compõe tudo em repouso num JPG. **Sempre abra a prévia (Read na imagem) antes de montar o HTML.**

## 4. A cena em JSON

```jsonc
{
  "name": "posto", "w": 1600, "h": 860, "seed": 21,
  "paper": "#F5F1EA", "ink": "#2A231E",            // tokens --paper e tinta sépia
  "frame": {"margin": 34, "ragged": 9},            // null = sem borda rasgada (pintura sangra)
  "defaults": {"density": 0.8, "wet": 0.55, "granulation": 0.35, "wobble": 3.5,
               "ink_width": 1.8, "offset": 3.0, "hue_jitter": 0.14},
  "objects": [                                      // ORDEM = ordem de pintura (fundo -> frente)
    {"name": "ceu", "shapes": [ ... ]},             // sem "layer": vai para a base
    {"name": "loja", "reserva": true, "shapes": [ ... ]},
    {"name": "carro", "layer": true, "blend": "normal",
     "shadow": {"dx": 10, "dy": 4, "blur": 7, "density": 0.45, "squash": 0.22},
     "shapes": [ ... ]}
  ]
}
```

**Limites que pegam na primeira vez:**
- **Camada `blend: normal` é sempre opaca**, porque traz o próprio papel por baixo para esconder o fundo. Vidro, água e qualquer coisa translúcida ficam **na base** (sem `layer`). Só o que se mexe *por cima* do vidro (fichas caindo, bolhas) vira camada `multiply`.
- **Pinte cada camada na posição de REPOUSO**, ou seja, onde ela termina a animação. A pose desloca a partir dali. Se você pintar a ficha "no ar" e animar a queda até o pote, em reduced-motion e na impressão ela fica flutuando.
- Um objeto em camada não deixa buraco na base. Se ele vai sair do lugar (o carro que chega), não pinte nada importante só "atrás" dele.

**Objeto:** `name`, `shapes`; opcionais `layer` (vira camada animável), `blend` (`normal` para objeto opaco que esconde o fundo, `multiply` para algo que só tinge, como pássaro, gota, mancha ou vapor), `shadow` (sombra no chão em camada `-m` separada), `reserva`, `ink_width`.

**Forma:** `type` = `rect [x,y,w,h]` · `poly pts` · `ellipse c r angle` · `circle c r` · `line pts width` · `wash rect from to` (degradê vertical). Parâmetros: `color`, `density` (0–1, quanto pigmento), `ink` (contorno a nanquim), `wet`, `wet_width`, `wobble`, `wobble_scale`, `soft`, `offset`, `pool_scale`, `hue_jitter`, `mode: "lift"` + `amount`, `reserva`.

Coordenadas em pixels da pintura; o HTML escala tudo. Desenhe pensando em **camadas de profundidade**: céu → morros → chão → construções (com reserva) → objetos animados (layer).

## 5. Receitas

- **Céu ao entardecer:** `wash` de `#5F86B3` a `#F3CDA0`, density 0.75, wet 0.05, wobble 0. As nuvens são `ellipse` com `mode: lift`, amount 0.65–0.75, wobble 14–18, soft 3. Faça 2 ou 3 sobrepostas e de tamanhos diferentes.
- **Morros:** `poly` com uns 10 pontos na silhueta, verde acinzentado `#7E9479` e density 0.55. Ficam atrás de tudo, então não precisam de nanquim.
- **Chão/asfalto:** `wash` de `#A9A398` a `#7F796F`. A sombra da cobertura é um `poly` escuro com density 0.24, soft 7 e wobble 14. As faixas são `line` com `mode: lift`, amount 0.55.
- **Prédio/bomba/loja:** objeto com `reserva: true`. Paredes claras com density 0.55–0.7 e `ink: true`. A faixa da marca usa `#2449C8` com density 0.9. Janelas em `#6F95B4` com density 0.75. A sombra de beiral é um `rect` fino com density 0.35 e `offset: 0`.
- **Carro:** `poly` da carroceria + `poly` do vidro (density 0.6) + 2 `circle` de roda escura + 2 calotas. É camada `normal` com `shadow` squash 0.22. O pivô fica no eixo traseiro, e na animação a inclinação vem da aceleração (`S.vel`).
- **Pessoa (frentista):** pernas (`rect`), tronco de uniforme (`poly` trapézio de destaque), cabeça (`circle` em tom de pele) e boné (`rect`). Mantenha simples, porque silhueta lê melhor que detalhe.
- **Pássaros:** `line` em V com 3 pontos, camada `multiply`.
- **Luz (luminária, letreiro):** NÃO pinte. Use `NK.brilhos(F, [[x,y,r]], 'tint'|'screen', cor)` no HTML, porque luz que cintila precisa ser overlay.
- **Texto (preço, visor, placa):** NÃO pinte. Deixe a área escura na pintura e escreva por cima com SVG em `iniciar()` (classes `.led`, `.led-rot`). Assim o texto fica nítido e pode animar, como o contador de litros.

## 6. Erros clássicos da primeira versão

A primeira prévia quase sempre sai assim. Itere olhando a imagem:

| Sintoma | Causa | Correção |
|---|---|---|
| Parece vetor de PowerPoint | mancha cai exatamente dentro do traço | `offset` 2–4, `wobble` 3–5, nanquim ligado |
| Nanquim tracejado | espessura sorteada por segmento | já corrigido no script (pressão contínua); não suba `ink_width` acima de 2.5 |
| Céu "arco-íris" roxo e verde | `hue_jitter` alto em área grande | 0.14 no default; use 0.05 em `wash` grande |
| Objeto transparente (fundo aparece) | glazing é multiplicação, não cobre | `reserva: true` no objeto |
| Tudo com o mesmo valor, sem profundidade | falta sombra e contraste de valor | sombra de beiral, sombra no chão, fundo menos denso que a frente |
| Borda da pintura ondulada demais | `ragged` alto | 8–12; a franja fina já vem do segundo warp |
| Laranja da marca "sujo" | de destaque pintado em cima de cinza | `reserva: true` na forma de destaque |
| Cena poluída | muita coisa | é ilustração editorial: 5–8 objetos, 1 ou 2 animados |

## 7. Fotos reais, prints e fotos históricas

**`foto`**: para prints de tela, fotos tiradas pelo time e fotos de evento. A ordem do processamento é bilateral → mean-shift → k-means (`--tintas` cores) → borda úmida nas fronteiras → granulação → nanquim esparso (`--nanquim`) → papel e borda rasgada. Prints de tela ficam melhores com `--tintas 8 --nanquim 0.2`, e fotos de rua com `--tintas 12`.

**`historica`**: para fotos de arquivo (a fundação da empresa, uma inauguração, recortes de jornal). Aplica CLAHE, curva S, duotone tinta/papel com os tokens da marca, grão de filme e vinheta. Isso dá unidade visual a fotos de fontes diferentes.

**De onde tirar foto histórica, em ordem de preferência:**
1. Acervo da própria empresa (peça ao usuário; é o melhor material).
2. Domínio público: Wikimedia Commons (filtre por licença PD ou CC0), Arquivo Nacional (sian.an.gov.br) e Biblioteca Nacional Digital (acervo de jornais antigos).
3. Acervos CC-BY com crédito na legenda.

Regras: **sempre crédito e licença na legenda**; nunca tratar uma foto para parecer o que não é (a legenda diz "foto de 1979, tratada"); baixar arquivo só com o OK do usuário; foto com pessoa identificável e de fonte não pública não entra.

## 8. Peso e performance

- Pinte em 1400–1800 px de largura. Acima disso o arquivo pesa e ninguém vê a diferença.
- `--quality 80` (o padrão) é o ponto bom; 70 para cenas de fundo. A base de 1600×860 fica perto de 100 KB.
- As camadas são recortadas no próprio bounding box, então uma camada pequena pesa 1–10 KB.
- Pintura hero: `--eager` no `figura` + `<link rel="preload" as="image" fetchpriority="high">`. As outras ficam com `loading="lazy"` (o padrão).
- Posição das camadas em **porcentagem** no markup: a pintura aparece certa mesmo sem JS (impressão e reduced-motion).
- Orçamento de uma narrativa empacotada: **< 3 MB**. Uma peça com 2 cenas e o kit fica perto de 0,8 MB.
