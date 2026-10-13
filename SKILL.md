---
name: html-artifacts
description: Use sempre que alguém pedir um documento estruturado para ser lido por outras pessoas — relatório, análise, spec, plano de implementação, RFC, post-mortem, investigação de bug ou ticket, status semanal, roadmap, deck ou dashboard — inclusive em pedidos casuais como "monta um relatório" ou "escreve uma spec". Produz um HTML standalone, com identidade visual consistente, tema claro e escuro, mobile e diagramas em SVG inline. Não use para resposta de chat, lista curta, rascunho de email ou código sem narrativa.
---

# HTML Artifacts

Skill para produzir documentos HTML standalone, com identidade visual consistente e feitos para leitura.

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

A estrutura canônica de cada um está em `references/archetypes.md`. Se o pedido for vago e couber em mais de um, pergunte ao usuário com duas ou três opções concretas.

## Fluxo

1. **Identifique o archetype** pela tabela acima.
2. **Leia as referências.** Sempre `references/design-system.md`. Leia `references/archetypes.md` para a estrutura, `references/svg-patterns.md` antes de desenhar um diagrama e `references/anti-patterns.md` antes de fechar.
3. **Liste a estrutura antes de construir.** Seções (número, título, uma linha do que entra), onde vão os diagramas e onde vai a interatividade. Em documento grande, confirme com o usuário.
4. **Construa em ordem de leitura**, a partir de `assets/base-template.html`: eyebrow, título, abertura, resumo, seções, rodapé. Se o trabalho for interrompido no meio, o que existe já é coerente.
5. **Teste antes de entregar.** Abra no navegador e confira: console sem erro, 375px de largura sem rolagem horizontal, tema escuro legível.
6. **Salve perto do assunto**, com nome em kebab-case, e diga ao usuário em duas a quatro frases o que o arquivo entrega.

`examples/investigacao-ticket.html` é um documento completo, com dados fictícios, que serve de calibragem de nível.

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
| `references/archetypes.md` | 16 archetypes com estrutura canônica |
| `references/svg-patterns.md` | padrões de diagrama em SVG |
| `references/anti-patterns.md` | o que evitar e checklist final |
| `assets/base-template.html` | ponto de partida com todos os componentes |
| `examples/investigacao-ticket.html` | exemplo completo, com dados fictícios |
