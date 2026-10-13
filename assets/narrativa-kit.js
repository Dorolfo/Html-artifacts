/* narrativa-kit.js — motor das narrativas ilustradas (vanilla, ~0 dependências)
 *
 * Expõe window.NK com:
 *   util .......... S/H (criar SVG/HTML), escalas lin/log, clamp, fmt pt-BR, easings, tween, responsive
 *   revelar ....... coreografia de entrada que nunca deixa o documento "incompleto em repouso"
 *   dica .......... tooltip único da página (hover no desktop, toque no celular)
 *   medidor ....... barra fixa de progresso por capítulo (clique/teclado pula)
 *   cenas ......... pinturas em aquarela com camadas animadas (tempo, scroll, toque, parallax)
 *   desenharLinha . linha de gráfico desenhada "à caneta" quando entra na tela
 *   contar ........ número que sobe até o valor
 *   passos ........ conteúdo passo a passo (voltar/avançar, pontos, swipe, setas do teclado)
 *   simulador ..... sliders + presets -> função de cálculo -> saídas que deslizam até o valor novo
 *   licoes ........ junta as etiquetas de lição num "manual" no fim da página
 *   linhaMarcos ... linha log/linear desenhada à caneta, pontos ao cruzar marcos (10×, 100×), crosshair
 *   mapaUF ........ mapa do Brasil em tiles por UF, slider de ano + play, UF "acende" ao receber o 1º valor
 *   virar ......... cartões antes/depois que viram (um a um ou todos)
 *   barras ........ barras horizontais com troca de medida (% clientes ↔ % GMV), tooltip e tabela automática
 *   curvas ........ séries/cenários mês a mês com ▶, slider, seletor de destaque e frase de leitura
 *
 * Princípios de performance (não remova):
 *   - nada roda fora da tela: IntersectionObserver liga/desliga o rAF de cada cena;
 *   - em cada quadro: LÊ tudo primeiro (getBoundingClientRect), ESCREVE depois (sem layout thrash);
 *   - só transform/opacity/mask animam (compositor); translate3d só enquanto a cena está viva;
 *   - prefers-reduced-motion => estado final imediato, sem loop;
 *   - listeners de scroll/pointer são { passive: true } e só "acordam" o loop.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqCel = window.matchMedia('(max-width: 700px)');
  var fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ------------------------------------------------------------------ util
  function S(tag, attrs, pai) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }
  function H(tag, cls, txt, pai) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    if (pai) pai.appendChild(e);
    return e;
  }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function lin(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; }
  function log(d0, d1, r0, r1) {
    var a = Math.log10(d0), b = Math.log10(d1);
    return function (v) { return r0 + (Math.log10(v) - a) / (b - a) * (r1 - r0); };
  }
  function fmt(n, casas, extra) {
    return Number(n).toLocaleString('pt-BR', Object.assign({ minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }, extra));
  }
  var brl = function (n, c) { return 'R$ ' + fmt(n, c == null ? 2 : c); };
  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    back: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    smooth: function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  };
  // mola amortecida: 1 em t=0 caindo a 0 (balanço que assenta). sdamp começa parado.
  var mola = {
    damp: function (t, a, w) { return t < 0 ? 1 : Math.exp(-a * t) * Math.cos(w * t); },
    sdamp: function (t, a, w) { return t < 0 ? 0 : Math.exp(-a * t) * Math.sin(w * t); }
  };
  function tween(dur, fn, fim) {
    var parou = false, id = 0, t0 = null;
    if (reduz || !dur) { fn(1); if (fim) fim(); return { parar: function () {} }; }
    id = requestAnimationFrame(function passo(agora) {
      if (parou) return;
      if (t0 === null) t0 = agora;
      var k = Math.min(1, (agora - t0) / dur);
      fn(k);
      if (k < 1) id = requestAnimationFrame(passo); else if (fim) fim();
    });
    return { parar: function () { parou = true; cancelAnimationFrame(id); } };
  }
  // redesenha só quando a LARGURA muda (altura muda o tempo todo no celular por causa da barra do browser)
  function responsive(el, desenhar) {
    if (!el) return;
    var ultimo = 0;
    function rodar() { var w = Math.round(el.clientWidth); if (w && w !== ultimo) { ultimo = w; desenhar(w); } }
    new ResizeObserver(rodar).observe(el);
    rodar();
  }
  function dados(id) { var el = document.getElementById(id); return el ? JSON.parse(el.textContent) : null; }

  // ------------------------------------------------------------------ revelar
  // Só "prepara" (esconde/zera) o que vai entrar por BAIXO; quem já está na tela ou vem de cima fica
  // como está. Assim imprimir, linkar para o meio da página ou rolar para cima nunca mostra buracos.
  var reveladores = [];
  function revelar(el, preparar, tocar, fracao) {
    if (!el || reduz || !('IntersectionObserver' in window)) return;
    var estado = 0;
    reveladores.push({ fim: function () { if (estado === 1) { estado = 2; tocar(true); } } });
    var perto = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (estado === 0 && e.isIntersecting && e.boundingClientRect.top > innerHeight) { estado = 1; preparar(); }
      });
    }, { rootMargin: '0px 0px 140% 0px' });
    var visto = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var precisa = Math.min(e.boundingClientRect.height * (fracao || 0.3), innerHeight * 0.35);
        if (e.intersectionRect.height < precisa) return;
        if (estado === 1) tocar(false);
        estado = 2; perto.disconnect(); visto.disconnect();
      });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.75, 1] });
    perto.observe(el); visto.observe(el);
  }
  addEventListener('beforeprint', function () { reveladores.forEach(function (r) { r.fim(); }); });

  // ------------------------------------------------------------------ dica (tooltip único)
  var dicaEl = null;
  function dica() {
    if (!dicaEl) {
      dicaEl = H('div', 'dica', null, document.body);
      dicaEl.id = 'dica'; dicaEl.hidden = true; dicaEl.setAttribute('role', 'status');
      addEventListener('scroll', function () { dicaEl.hidden = true; }, { passive: true });
    }
    return dicaEl;
  }
  function mostrarDica(x, y, montar) {
    var t = dica(); t.replaceChildren(); montar(t); t.hidden = false;
    var r = t.getBoundingClientRect(), pad = 14, tx = x + pad, ty = y + pad;
    if (tx + r.width > innerWidth - 8) tx = x - r.width - pad;
    if (ty + r.height > innerHeight - 8) ty = y - r.height - pad;
    t.style.left = Math.max(8, tx) + 'px'; t.style.top = Math.max(8, ty) + 'px';
  }
  function linhaDica(pai, cor, rotulo, valor) {
    var l = H('div', 'linha', null, pai), a = H('span', null, null, l);
    if (cor) H('i', null, null, a).style.background = cor;
    a.append(rotulo); H('span', null, valor, l);
  }
  var esconderDica = function () { if (dicaEl) dicaEl.hidden = true; };

  // ------------------------------------------------------------------ medidor de leitura
  // <div class="medidor" id="medidor"> + capítulos <section data-cap="Título curto">.
  function medidor(opts) {
    var bar = document.getElementById((opts && opts.id) || 'medidor');
    if (!bar) return;
    var caps = Array.prototype.slice.call(document.querySelectorAll('[data-cap]'));
    var trilho = bar.querySelector('.medidor-trilho'), cheio = bar.querySelector('.medidor-cheio');
    var rot = bar.querySelector('.medidor-rotulo'), num = bar.querySelector('.medidor-num');
    caps.forEach(function (c, i) {   // um entalhe por capítulo
      var m = H('button', 'medidor-marca', null, trilho);
      m.type = 'button'; m.setAttribute('aria-label', 'Ir para ' + c.dataset.cap);
      m.addEventListener('click', function () { c.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth' }); });
      c._marca = m;
    });
    function posicoes() {
      var doc = document.documentElement.scrollHeight - innerHeight;
      var w = trilho.clientWidth, ant = -99;
      caps.forEach(function (c) {
        c._y = c.getBoundingClientRect().top + scrollY;
        var f = clamp(c._y / doc, 0, 1); c._marca.style.left = (100 * f) + '%';
        c._marca.classList.toggle('junta', f * w - ant < 16); ant = f * w;   // capítulos colados: marca menor, não encavala
      });
    }
    var pendente = false;
    function atualizar() {
      pendente = false;
      var doc = document.documentElement.scrollHeight - innerHeight, p = clamp(scrollY / Math.max(1, doc), 0, 1);
      cheio.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      var atual = null, linhaLeitura = scrollY + innerHeight * 0.35;
      caps.forEach(function (c, i) { if (c._y <= linhaLeitura) atual = i; });
      if (atual !== bar._atual) {
        bar._atual = atual;
        rot.textContent = atual === null ? (opts && opts.inicio) || 'Abertura' : caps[atual].dataset.cap;
        num.textContent = atual === null ? '00' : String(atual + 1).padStart(2, '0');
        caps.forEach(function (c, i) { c._marca.classList.toggle('lida', atual !== null && i <= atual); });
      }
    }
    trilho.addEventListener('click', function (ev) {
      if (ev.target !== trilho) return;
      var r = trilho.getBoundingClientRect(), doc = document.documentElement.scrollHeight - innerHeight;
      scrollTo({ top: (ev.clientX - r.left) / r.width * doc, behavior: reduz ? 'auto' : 'smooth' });
    });
    document.documentElement.style.setProperty('--medidor-h', bar.offsetHeight + 'px');
    posicoes(); atualizar();
    addEventListener('scroll', function () { if (!pendente) { pendente = true; requestAnimationFrame(atualizar); } }, { passive: true });
    new ResizeObserver(function () { posicoes(); atualizar(); }).observe(document.body);
  }

  // ------------------------------------------------------------------ cenas (pinturas que se movem)
  // Markup (gerado por `aquarela.py figura`):
  // <figure class="pintura" data-cena="posto"><div class="moldura"><div class="palco" style="--ar:1600/860">
  //   <img class="base" src="layers/posto.webp" width="1600" height="860" alt="...">
  //   <img class="ly" data-obj="carro" data-part="body" data-box="x,y,w,h" style="left:..%;top:..%;width:..%">
  // </div></div><figcaption>...</figcaption></figure>
  //
  // NK.cena('posto', {
  //   entrada: 'florescer' | 'esboco' | null,   // como a pintura chega na primeira vez
  //   modo: 'tempo' | 'scroll',                 // scroll => pose depende de S.p (0..1 pela tela)
  //   pivos: { carro: [x, y] },                 // origem de rotação/escala em coords da pintura
  //   profundidade: { carro: 8 },               // parallax com o mouse (px na escala da pintura)
  //   toque: { caixa: [x0,y0,x1,y1], hover: false },
  //   dur: 3,                                    // duração do evento de chegada (s)
  //   iniciar: function (F) {},                  // cria overlays SVG (brilhos, faíscas)
  //   pose: function (S) { return { carro: { x, y, r, s, o, mask } } }
  // });
  // S = { t (s), et (s desde a chegada), p (progresso suave na tela), desde('toque'), vel(chave, v), F }
  var CENAS = {};
  function cena(nome, spec) { CENAS[nome] = spec; }

  function overlay(F, cls) {
    F.ovs = F.ovs || {};
    if (F.ovs[cls]) return F.ovs[cls];
    var o = S('svg', { class: 'ov ' + cls, viewBox: '0 0 ' + F.W + ' ' + F.H, 'aria-hidden': 'true', preserveAspectRatio: 'none' }, F.palco);
    return (F.ovs[cls] = o);
  }
  // poças de luz (luminária, letreiro): 'screen' clareia ambiente escuro, 'tint' aquece parede clara
  function brilhos(F, pts, modo, cor) {
    var ov = overlay(F, 'brilho-' + modo), id = 'gl-' + F.nome + '-' + modo;
    var g = S('radialGradient', { id: id }, S('defs', null, ov));
    S('stop', { offset: 0, 'stop-color': cor, 'stop-opacity': modo === 'screen' ? 0.85 : 0.5 }, g);
    S('stop', { offset: 0.45, 'stop-color': cor, 'stop-opacity': modo === 'screen' ? 0.32 : 0.2 }, g);
    S('stop', { offset: 1, 'stop-color': cor, 'stop-opacity': 0 }, g);
    return pts.map(function (p) { var c = S('circle', { cx: p[0], cy: p[1], r: p[2], fill: 'url(#' + id + ')' }, ov); c.style.opacity = 0; return c; });
  }
  function cintilar(t, k) { return 0.5 * Math.sin(t * 7.3 + k) + 0.3 * Math.sin(t * 13.1 + k * 2.1) + 0.2 * Math.sin(t * 23.7 + k * 3.7); }

  function iniciarCenas() {
    var figs = [];
    document.querySelectorAll('figure.pintura[data-cena]').forEach(function (fig) {
      var spec = CENAS[fig.dataset.cena] || {}, moldura = fig.querySelector('.moldura'), palco = fig.querySelector('.palco');
      var base = palco && palco.querySelector('img.base');
      if (!base) return;
      var F = { fig: fig, moldura: moldura, palco: palco, nome: fig.dataset.cena, spec: spec, W: +base.getAttribute('width'), H: +base.getAttribute('height'),
        objs: {}, vel: {}, marcas: {}, k: 1, p: 0.5, ps: 0.5, armada: false, chegou: null, perto: false, mx: 0, my: 0, sx: 0, sy: 0 };
      palco.querySelectorAll('img.ly').forEach(function (img) {
        var nm = img.dataset.obj, b = img.dataset.box.split(',').map(Number);
        var pv = (spec.pivos || {})[nm] || [b[0] + b[2] / 2, b[1] + b[3] / 2];
        img.style.transformOrigin = ((pv[0] - b[0]) / b[2] * 100).toFixed(2) + '% ' + ((pv[1] - b[1]) / b[3] * 100).toFixed(2) + '%';
        (F.objs[nm] = F.objs[nm] || []).push({ el: img, parte: img.dataset.part });
      });
      if (spec.iniciar && !reduz) spec.iniciar(F);
      figs.push(F);
    });
    if (!figs.length || reduz) return;   // movimento reduzido: pinturas paradas, em repouso, completas

    function medir(F) { F.k = F.palco.offsetWidth / F.W; F.fw = F.moldura.clientWidth; }
    figs.forEach(medir);
    new ResizeObserver(function () { figs.forEach(medir); }).observe(document.body);

    // celular: pintura ocupa a largura toda, mais alta que a tela permite; a "câmera" passeia
    // pelo foco da cena conforme a rolagem (sem prender o scroll — nada de scroll-jacking)
    function camera(F) {
      if (!mqCel.matches) { if (F.palco.style.transform) F.palco.style.transform = ''; return; }
      var foco = F.spec.foco || [F.W * 0.3, F.W * 0.7], q = ease.smooth(0.15, 0.85, F.ps);
      var fx = foco[0] + (foco[1] - foco[0]) * q, sw = F.W * F.k;
      var tx = sw <= F.fw ? 0 : clamp(F.fw / 2 - fx * F.k, F.fw - sw, 0);
      F.palco.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,0,0)';
    }
    function aplicar(F, pose) {
      var k = F.k, prof = fino ? (F.spec.profundidade || {}) : {};
      Object.keys(F.objs).forEach(function (nm) {
        var P = pose[nm] || {}, d = prof[nm] || 0;
        F.objs[nm].forEach(function (it) {
          var x = (P.x || 0) + d * F.sx, y = (P.y || 0) + d * F.sy;
          if (it.parte === 'shadow') y = d * F.sy;          // sombra acompanha no chão: segue x, não pula nem gira
          var tr = 'translate3d(' + (x * k).toFixed(2) + 'px,' + (y * k).toFixed(2) + 'px,0)';
          if (P.r && it.parte !== 'shadow') tr += ' rotate(' + P.r.toFixed(3) + 'deg)';
          if (P.s != null && P.s !== 1) tr += ' scale(' + P.s.toFixed(4) + ')';
          if (it.tr !== tr) { it.tr = tr; it.el.style.transform = tr; }
          var op = P.o == null ? '' : clamp(P.o, 0, 1).toFixed(3);
          if (it.op !== op) { it.op = op; it.el.style.opacity = op; }
          if (P.mask !== undefined && it.mk !== P.mask) { it.mk = P.mask; it.el.style.webkitMaskImage = it.el.style.maskImage = P.mask; }
        });
      });
    }
    function estado(F, agora, dt) {
      return {
        t: agora / 1000, dt: dt, F: F, p: F.ps,
        et: F.armada ? (F.chegou === null ? 0 : (agora - F.chegou) / 1000) : 999,
        desde: function (ch) { return F.marcas[ch] === undefined ? 999 : (agora - F.marcas[ch]) / 1000; },
        vel: function (ch, v) {   // velocidade suavizada de qualquer grandeza (inclina o carro ao frear)
          var s = F.vel[ch] || (F.vel[ch] = { ult: v, v: 0 });
          var bruto = (v - s.ult) / dt; s.ult = v; s.v += (bruto - s.v) * Math.min(1, dt * 10); return s.v;
        }
      };
    }
    // fora da tela: mantém a pose mas devolve as camadas de GPU (translate3d promove camada)
    function rebaixar(F) {
      Object.keys(F.objs).forEach(function (nm) { F.objs[nm].forEach(function (it) {
        if (it.tr) { it.tr = it.tr.replace(/translate3d\(([^,]+),([^,]+),0\)/, 'translate($1,$2)'); it.el.style.transform = it.tr; }
      }); });
    }
    var rodando = false, ultimo = 0;
    function quadro(agora) {
      var dt = Math.min(0.05, Math.max(0.001, (agora - ultimo) / 1000)); ultimo = agora;
      var vh = innerHeight, vivas = [];
      figs.forEach(function (F) {                         // 1) só leituras
        if (!F.perto) { if (F.viva) rebaixar(F); F.viva = false; return; }
        var r = F.moldura.getBoundingClientRect();
        F.pAlvo = clamp((vh - r.top) / (vh + r.height), 0, 1);
        vivas.push(F);
      });
      vivas.forEach(function (F) {                        // 2) só escritas
        if (!F.viva) { F.ps = F.pAlvo; F.vel = {}; F.viva = true; }
        F.ps += (F.pAlvo - F.ps) * (1 - Math.exp(-dt * 5));
        F.sx += (F.mx - F.sx) * (1 - Math.exp(-dt * 4));
        F.sy += (F.my - F.sy) * (1 - Math.exp(-dt * 4));
        camera(F);
        aplicar(F, F.spec.pose ? F.spec.pose(estado(F, agora, dt)) : {});
      });
      if (vivas.length) requestAnimationFrame(quadro); else rodando = false;
    }
    function acordar() { if (!rodando) { rodando = true; ultimo = performance.now(); requestAnimationFrame(quadro); } }
    addEventListener('scroll', acordar, { passive: true });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { figs.forEach(function (F) { if (F.fig === e.target) F.perto = e.isIntersecting; }); });
      acordar();
    }, { rootMargin: '25% 0px 25% 0px' });
    figs.forEach(function (F) { io.observe(F.fig); });

    // chegada: 'florescer' = aguada molhada se espalhando (máscara bleed.png crescendo);
    // 'esboco' = começa grafite e revela a cor; sem entrada = só toca o evento da pose (et)
    figs.forEach(function (F) {
      var tipo = F.spec.entrada;
      revelar(F.moldura, function () {
        F.armada = true; F.chegou = null;
        if (tipo === 'florescer') F.palco.classList.add('bleed');
        if (tipo === 'esboco') F.palco.classList.add('esboco');
      }, function (instantaneo) {
        if (instantaneo) { F.armada = false; F.palco.classList.remove('bleed', 'bloom', 'esboco', 'revela'); return; }
        F.chegou = performance.now() + (tipo ? 450 : 150);
        if (tipo === 'florescer') F.palco.classList.add('bloom');
        if (tipo === 'esboco') F.palco.classList.add('revela');
        if (tipo) setTimeout(function () { F.palco.classList.remove('bleed', 'bloom', 'esboco', 'revela'); }, 2900);
        acordar();
      }, 0.3);
      // primeira dobra: a cena do topo já começa armada e toca quando estiver quase toda visível
      if (F.moldura.getBoundingClientRect().top < innerHeight) { F.armada = true; F.chegou = performance.now() + 300; }
    });
    // toque / passar o mouse numa área da pintura
    figs.forEach(function (F) {
      // toque: { caixa, hover } ou lista [{ nome, caixa, hover }] — cada área marca 'toque' e 'toque:nome'
      var tqs = F.spec.toque;
      if (!tqs) return;
      if (!Array.isArray(tqs)) tqs = [tqs];
      function qual(ev) {
        var r = F.palco.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * F.W, y = (ev.clientY - r.top) / r.height * F.H;
        for (var k = 0; k < tqs.length; k++) { var b = tqs[k].caixa; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return tqs[k]; }
        return null;
      }
      function cutucar(tq) {
        var a = performance.now(), ch = tq.nome ? 'toque:' + tq.nome : 'toque';
        if (!F.marcas[ch] || a - F.marcas[ch] > 600) { F.marcas[ch] = a; F.marcas.toque = a; }
        acordar();
      }
      F.palco.addEventListener('click', function (ev) { var tq = qual(ev); if (tq) cutucar(tq); });
      if (fino) F.palco.addEventListener('pointermove', function (ev) {
        var tq = qual(ev); F.palco.style.cursor = tq ? 'pointer' : '';
        if (tq && tq.hover && F.estava !== tq) cutucar(tq); F.estava = tq;
      }, { passive: true });
    });
    // parallax leve com o mouse (só desktop)
    if (fino) figs.forEach(function (F) {
      if (!F.spec.profundidade) return;
      F.palco.addEventListener('pointermove', function (ev) {
        var r = F.palco.getBoundingClientRect();
        F.mx = clamp(((ev.clientX - r.left) / r.width - 0.5) * 2, -1, 1); F.my = clamp(((ev.clientY - r.top) / r.height - 0.5) * 2, -1, 1); acordar();
      }, { passive: true });
      F.palco.addEventListener('pointerleave', function () { F.mx = F.my = 0; acordar(); });
    });
    acordar();
  }

  // ------------------------------------------------------------------ gráficos: caneta e contagem
  // Desenha um <path> como se fosse à mão; onPasso(k) permite mover a ponta da caneta / marcos.
  function desenharLinha(path, dur, onPasso) {
    var L = path.getTotalLength();
    path.style.strokeDasharray = L + ' ' + L;
    path.style.strokeDashoffset = L;
    return tween(dur, function (k) {
      var e = ease.inOut(k);
      path.style.strokeDashoffset = (L * (1 - e)).toFixed(1);
      if (onPasso) onPasso(e, path.getPointAtLength(L * e));
    }, function () { path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; });
  }
  function contar(el, ate, formatar, dur) {
    var de = parseFloat(el.dataset.de || 0), f = formatar || function (v) { return fmt(v); };
    return tween(dur || 900, function (k) { el.textContent = f(de + (ate - de) * ease.out(k)); });
  }

  // ------------------------------------------------------------------ passos (step-through)
  // <div class="passos"><div class="passo">...</div>...<nav class="passos-nav"></nav></div>
  function passos(raiz, aoMudar) {
    var itens = raiz.querySelectorAll('.passo'), nav = raiz.querySelector('.passos-nav'), i = 0;
    var volta = H('button', 'btn', '← Voltar', nav), pts = H('div', 'pontos', null, nav), vai = H('button', 'btn primario', 'Avançar →', nav);
    volta.type = vai.type = 'button';
    itens.forEach(function () { H('span', null, null, pts); });
    function ir(n) {
      i = clamp(n, 0, itens.length - 1);
      itens.forEach(function (p, j) { p.hidden = j !== i; });
      pts.querySelectorAll('span').forEach(function (s, j) { s.classList.toggle('on', j <= i); });
      volta.disabled = i === 0; vai.disabled = i === itens.length - 1;
      if (aoMudar) aoMudar(i);
    }
    volta.onclick = function () { ir(i - 1); }; vai.onclick = function () { ir(i + 1); };
    raiz.tabIndex = 0;
    raiz.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') ir(i + 1); if (e.key === 'ArrowLeft') ir(i - 1); });
    // swipe só com o dedo, só se for claramente horizontal e rápido — rolar a página nunca troca de passo
    var g0 = null;
    raiz.addEventListener('pointerdown', function (e) { g0 = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null; }, { passive: true });
    raiz.addEventListener('pointercancel', function () { g0 = null; }, { passive: true });
    raiz.addEventListener('pointerup', function (e) {
      if (!g0) return;
      var dx = e.clientX - g0.x, dy = e.clientY - g0.y, rapido = e.timeStamp - g0.t < 700;
      if (rapido && Math.abs(dx) > 50 && Math.abs(dx) > 1.6 * Math.abs(dy)) ir(i + (dx < 0 ? 1 : -1));
      g0 = null;
    }, { passive: true });
    ir(0);
    return { ir: ir };
  }

  // ------------------------------------------------------------------ simulador
  // simulador(raiz, calcular(valores) -> {saida: numero}, formatos {saida: fn})
  // inputs: <input type=range name="x">; presets: <button data-preset='{"x":4.5}'>; saídas: <output name="saida">
  function simulador(raiz, calcular, formatos) {
    var ins = raiz.querySelectorAll('input[type=range]'), outs = {}, atual = null, anim = null;
    raiz.querySelectorAll('output[name]').forEach(function (o) { outs[o.getAttribute('name')] = o; });
    function valores() { var v = {}; ins.forEach(function (i) { v[i.name] = +i.value; var r = raiz.querySelector('[data-valor="' + i.name + '"]'); if (r) r.textContent = (formatos && formatos[i.name] || fmt)(+i.value); }); return v; }
    function render(novo) {
      var de = atual || novo;
      if (anim) anim.parar();
      anim = tween(atual ? 260 : 0, function (k) {
        var m = {};
        Object.keys(novo).forEach(function (c) { m[c] = de[c] + (novo[c] - de[c]) * ease.out(k); if (outs[c]) outs[c].textContent = (formatos && formatos[c] || fmt)(m[c]); });
        raiz.dispatchEvent(new CustomEvent('sim', { detail: m }));
      });
      atual = novo;
    }
    ins.forEach(function (i) { i.addEventListener('input', function () { render(calcular(valores())); }); });
    raiz.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = JSON.parse(b.dataset.preset);
        ins.forEach(function (i) { if (p[i.name] != null) i.value = p[i.name]; });
        render(calcular(valores()));
      });
    });
    render(calcular(valores()));
  }

  // ------------------------------------------------------------------ lições -> manual
  function licoes(destinoId) {
    var grade = document.getElementById(destinoId || 'manual');
    if (!grade) return;
    document.querySelectorAll('aside.licao').forEach(function (l, i) {
      var a = H('a', 'manual-item', null, grade);
      a.href = '#' + (l.closest('[id]') || {}).id;
      H('div', 'manual-cap', l.dataset.rotulo || ('Lição ' + (i + 1)), a);
      var num = l.querySelector('.licao-num b'), leg = l.querySelector('.licao-num span');
      H('div', 'manual-num', num ? num.textContent : '', a);
      if (leg) H('div', 'manual-leg', leg.textContent, a);
      H('p', null, (l.querySelector('.licao-texto p') || {}).textContent || '', a);
    });
  }

  // ------------------------------------------------------------------ linha à caneta com marcos
  // NK.linhaMarcos(raiz, {
  //   series: [{ nome, cor, pontos: [[x, y], ...] }],   // x numérico (ano, mês índice), y > 0 se log
  //   log: true, marcos: [10, 100, 1000],                // linhas de referência; cada série ganha um ponto ao cruzar
  //   fmtX: fn, fmtY: fn, rotuloMarco: fn(m) -> '10×',
  //   anotacoes: [{ x, y, texto, serie }], altura: 320,
  //   aoCruzar: fn(serieIdx, marcoIdx)                   // ex.: subir o número de abertura só quando a caneta passa
  // })
  // A linha é desenhada na primeira vez que entra na tela; hover/toque mostra o valor de todas as séries no x.
  // passo "redondo" para eixos: 1, 2, 2,5 ou 5 × 10^n (nunca 889, 1.778...)
  function passoBonito(bruto) {
    var mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    return [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).find(function (v) { return v >= bruto; });
  }
  function linhaMarcos(raiz, o) {
    if (!raiz) return;
    var fx = o.fmtX || function (v) { return String(v); }, fy = o.fmtY || function (v) { return fmt(v); };
    var todos = [].concat.apply([], o.series.map(function (s) { return s.pontos; }));
    var xs = todos.map(function (p) { return p[0]; }), ys = todos.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = o.log ? Math.pow(10, Math.floor(Math.log10(Math.min.apply(null, ys)))) : 0;
    var ymax = Math.max.apply(null, ys), passoY = passoBonito(ymax / 4);
    var y1 = o.log ? Math.pow(10, Math.ceil(Math.log10(ymax))) : Math.ceil(ymax * 1.04 / passoY) * passoY;
    var estado = 'repouso', paths = [];   // repouso (completo) | preparado (escondido, vai tocar) | tocado
    function desenhar(w) {
      var cel = w < 560, h = o.altura || (cel ? 300 : 340), m = { t: 14, r: cel ? 56 : 84, b: 26, l: cel ? 38 : 52 };
      var X = lin(x0, x1, m.l, w - m.r), Y = o.log ? log(y0, y1, h - m.b, m.t) : lin(y0, y1, h - m.b, m.t);
      var svg = S('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': o.rotulo || '' });
      raiz.replaceChildren(svg);
      // grade: potências de 10 no log, 4 divisões no linear
      var ticks = [];
      if (o.log) for (var t = y0; t <= y1 * 1.0001; t *= 10) ticks.push(t);
      else for (var t2 = 0; t2 <= y1 + 1e-9; t2 += passoY) ticks.push(t2);
      ticks.forEach(function (t) {
        S('line', { x1: m.l, x2: w - m.r, y1: Y(t), y2: Y(t), class: 'grade' }, svg);
        S('text', { x: m.l - 6, y: Y(t) + 4, 'text-anchor': 'end', fill: 'var(--muted)' }, svg).textContent = fy(t);
      });
      var passo = Math.max(1, Math.ceil((x1 - x0) / (cel ? 4 : 8)));
      for (var xv = x0; xv <= x1; xv += passo) S('text', { x: X(xv), y: h - 6, 'text-anchor': 'middle', fill: 'var(--muted)' }, svg).textContent = fx(xv);
      (o.marcos || []).forEach(function (mv) {
        S('line', { x1: m.l, x2: w - m.r, y1: Y(mv), y2: Y(mv), stroke: 'var(--rule)', 'stroke-dasharray': '2 4' }, svg);
        if (o.rotuloMarco) S('text', { x: w - m.r + 6, y: Y(mv) + 4, fill: 'var(--muted)', 'font-size': 11 }, svg).textContent = o.rotuloMarco(mv);
      });
      paths = o.series.map(function (s, si) {
        var d = s.pontos.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join('');
        var path = S('path', { d: d, fill: 'none', stroke: s.cor, 'stroke-width': si === 0 ? 2.6 : 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
        var ult = s.pontos[s.pontos.length - 1];
        var fim = S('text', { x: X(ult[0]) + 6, y: Y(ult[1]) + 4, class: 'forte' }, svg); fim.textContent = s.rotuloFim || fy(ult[1]);
        // pontos dos marcos: primeiro ponto em que a série cruza cada marco
        var dots = (o.marcos || []).map(function (mv, mi) {
          var p = s.pontos.find(function (q) { return q[1] >= mv; });
          if (!p) return null;
          var c = S('circle', { cx: X(p[0]), cy: Y(p[1]), r: 4, fill: s.cor, stroke: 'var(--paper)', 'stroke-width': 1.5 }, svg);
          return { c: c, x: X(p[0]), mi: mi };
        }).filter(Boolean);
        return { el: path, fim: fim, dots: dots, si: si };
      });
      (o.anotacoes || []).forEach(function (a) {
        var t = S('text', { x: X(a.x), y: Y(a.y) - 10, 'text-anchor': 'middle', fill: 'var(--ink-2)', 'font-size': 11 }, svg); t.textContent = a.texto;
      });
      // crosshair + dica
      var cruz = S('line', { y1: m.t, y2: h - m.b, stroke: 'var(--muted)', 'stroke-width': 1, opacity: 0 }, svg);
      var area = S('rect', { x: m.l, y: m.t, width: w - m.l - m.r, height: h - m.t - m.b, fill: 'transparent' }, svg);
      function mostrar(ev) {
        var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (w / r.width);
        var xv = Math.round(lin(m.l, w - m.r, x0, x1)(px));
        cruz.setAttribute('x1', X(xv)); cruz.setAttribute('x2', X(xv)); cruz.setAttribute('opacity', 0.6);
        mostrarDica(ev.clientX, ev.clientY, function (el) {
          H('b', null, fx(xv), el);
          o.series.forEach(function (s) {
            var p = s.pontos.reduce(function (a, b) { return Math.abs(b[0] - xv) < Math.abs(a[0] - xv) ? b : a; });
            linhaDica(el, s.cor, s.nome, fy(p[1]));
          });
        });
      }
      area.addEventListener('pointermove', mostrar);
      area.addEventListener('pointerdown', mostrar);
      area.addEventListener('pointerleave', function () { cruz.setAttribute('opacity', 0); esconderDica(); });
      if (estado === 'preparado') esconder();
    }
    function esconder() { paths.forEach(function (p) { p.el.style.opacity = 0; p.fim.style.opacity = 0; p.dots.forEach(function (d) { d.c.style.opacity = 0; }); }); }
    function tocar(instantaneo) {
      estado = 'tocado';
      paths.forEach(function (p) {
        p.el.style.opacity = ''; var vistos = {};
        if (instantaneo) { p.fim.style.opacity = ''; p.dots.forEach(function (d) { d.c.style.opacity = ''; }); return; }
        desenharLinha(p.el, 2600 + p.si * 300, function (e, pt) {
          p.dots.forEach(function (d) {
            if (!vistos[d.mi] && pt.x >= d.x - 0.5) { vistos[d.mi] = 1; d.c.style.opacity = ''; if (o.aoCruzar) o.aoCruzar(p.si, d.mi); }
          });
          if (e >= 1) p.fim.style.opacity = '';
        });
      });
    }
    // desenha completo; só esconde quando vai entrar por baixo (quem chega por link vê tudo pronto)
    responsive(raiz, desenhar);
    revelar(raiz, function () { estado = 'preparado'; esconder(); }, tocar, 0.4);
  }

  // ------------------------------------------------------------------ mapa de UFs (tile map) com play
  // Grade 7×8 que preserva a vizinhança das UFs. dados = { anos: [2019, ...], valores: { 2019: { SP: 120, ... } } }
  // NK.mapaUF(raiz, dados, { fmt, rotulo: 'lojas', aoMudar(ano, totais) })  — controles: slider de ano + ▶
  var UF_GRADE = { RR: [1, 0], AP: [2, 0], AM: [1, 1], PA: [2, 1], MA: [3, 1], CE: [4, 1], RN: [5, 1], AC: [0, 2], RO: [1, 2], MT: [2, 2],
    TO: [3, 2], PI: [4, 2], PB: [5, 2], MS: [2, 3], GO: [3, 3], BA: [4, 3], PE: [5, 3], AL: [6, 3], SP: [2, 4], DF: [3, 4], MG: [4, 4],
    ES: [5, 4], SE: [6, 4], PR: [2, 5], RJ: [4, 5], SC: [2, 6], RS: [2, 7] };
  function mapaUF(raiz, dados, o) {
    if (!raiz) return;
    o = o || {};
    var f = o.fmt || function (v) { return fmt(v); }, anos = dados.anos, i = anos.length - 1, tocando = null, cel = {};
    var maxv = 0;
    anos.forEach(function (a) { Object.keys(dados.valores[a] || {}).forEach(function (u) { maxv = Math.max(maxv, dados.valores[a][u]); }); });
    var ctrl = H('div', 'ctrl mapa-ctrl', null, raiz);
    var anoEl = H('div', 'mapa-ano', String(anos[i]), ctrl);
    var play = H('button', 'btn', '▶ Tocar', ctrl); play.type = 'button';
    var sl = H('input', null, null, ctrl); sl.type = 'range'; sl.min = 0; sl.max = anos.length - 1; sl.value = i; sl.setAttribute('aria-label', 'Ano');
    var stats = H('div', 'mapa-stats', null, ctrl);
    var svg = S('svg', { viewBox: '0 0 476 552', role: 'img', 'aria-label': o.ariaLabel || 'Mapa do Brasil por UF' }, raiz);
    var T = 66, G = 2;
    Object.keys(UF_GRADE).forEach(function (u) {
      var p = UF_GRADE[u], g = S('g', { transform: 'translate(' + (p[0] * T) + ',' + (p[1] * (T - 0)) + ')', tabindex: 0, class: 'uf' }, svg);
      var r = S('rect', { x: G, y: G, width: T - 2 * G, height: T - 2 * G, rx: 3, fill: 'var(--rule-2)' }, g);
      var t1 = S('text', { x: T / 2, y: T / 2 - 2, 'text-anchor': 'middle', class: 'forte', 'font-size': 13 }, g); t1.textContent = u;
      var t2 = S('text', { x: T / 2, y: T / 2 + 14, 'text-anchor': 'middle', 'font-size': 10 }, g);
      function dica(ev) {
        var r0 = r.getBoundingClientRect();
        mostrarDica(ev && ev.clientX || r0.right, ev && ev.clientY || r0.top, function (el) {
          H('b', null, u + ' · ' + anos[i], el);
          linhaDica(el, null, o.rotulo || 'valor', f((dados.valores[anos[i]] || {})[u] || 0));
        });
      }
      g.addEventListener('pointermove', dica); g.addEventListener('pointerleave', esconderDica);
      g.addEventListener('focus', function () { dica(); }); g.addEventListener('blur', esconderDica);
      cel[u] = { r: r, t1: t1, t2: t2, v: 0 };
    });
    function cor(v) {   // escala sequencial do papel ao de destaque; raiz quadrada p/ não sumir as UFs pequenas
      if (!v) return 'var(--rule-2)';
      var k = Math.round(18 + 82 * Math.sqrt(v / maxv));
      return 'color-mix(in srgb, var(--accent) ' + k + '%, var(--surface))';
    }
    function pintar(animar) {
      var vals = dados.valores[anos[i]] || {}, tot = 0, ufs = 0;
      anoEl.textContent = anos[i]; sl.value = i;
      Object.keys(cel).forEach(function (u) {
        var c = cel[u], v = vals[u] || 0, novo = v > 0 && c.v === 0;
        tot += v; if (v > 0) ufs++;
        c.r.setAttribute('fill', cor(v));
        var escuro = v / maxv > 0.45;
        c.t1.setAttribute('fill', escuro ? 'var(--on-accent)' : 'var(--ink)');
        c.t2.setAttribute('fill', escuro ? 'var(--on-accent)' : 'var(--muted)');
        c.t2.textContent = v ? f(v) : '';
        if (novo && animar && !reduz) c.r.animate([{ transform: 'scale(.4)', transformOrigin: 'center', transformBox: 'fill-box' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,1.4,.4,1)' });
        c.v = v;
      });
      stats.replaceChildren();
      H('b', null, f(tot), stats); stats.append(' ' + (o.rotulo || '') + ' em '); H('b', null, String(ufs), stats); stats.append(' UFs');
      if (o.aoMudar) o.aoMudar(anos[i], tot, ufs);
    }
    function parar() { if (tocando) { clearInterval(tocando); tocando = null; play.textContent = '▶ Tocar'; } }
    function tocar() {
      if (tocando) return parar();
      if (i >= anos.length - 1) { i = 0; Object.keys(cel).forEach(function (u) { cel[u].v = 0; }); pintar(true); }
      play.textContent = '❚❚ Pausar';
      tocando = setInterval(function () { if (i >= anos.length - 1) return parar(); i++; pintar(true); }, reduz ? 0 : 650);
    }
    play.addEventListener('click', tocar);
    sl.addEventListener('input', function () { parar(); i = +sl.value; pintar(true); });
    pintar(false);
    // primeira vez na tela: toca a expansão inteira uma vez
    revelar(raiz, function () { i = 0; Object.keys(cel).forEach(function (u) { cel[u].v = 0; }); pintar(false); }, function (inst) { if (inst) { i = anos.length - 1; pintar(false); } else setTimeout(tocar, 300); }, 0.4);
    return { ir: function (a) { parar(); i = Math.max(0, anos.indexOf(a)); pintar(true); } };
  }

  // ------------------------------------------------------------------ cartões que viram (antes/depois)
  // <div class="cartoes" id="x"><button class="cartao"><span class="frente">…</span><span class="verso">…</span></button>…</div>
  // NK.virar(raiz, { rotuloTodos: 'Virar todos' }) — clique vira um; o botão vira todos
  function virar(raiz, o) {
    if (!raiz) return;
    o = o || {};
    var cards = raiz.querySelectorAll('.cartao');
    cards.forEach(function (c) {
      c.type = 'button'; c.setAttribute('aria-pressed', 'false');
      c.addEventListener('click', function () { var v = !c.classList.contains('virado'); c.classList.toggle('virado', v); c.setAttribute('aria-pressed', v); });
    });
    var b = H('button', 'btn', o.rotuloTodos || 'Virar todos'); b.type = 'button';
    raiz.parentNode.insertBefore(b, raiz);
    b.addEventListener('click', function () {
      var algum = Array.prototype.some.call(cards, function (c) { return !c.classList.contains('virado'); });
      cards.forEach(function (c, k) { setTimeout(function () { c.classList.toggle('virado', algum); c.setAttribute('aria-pressed', algum); }, reduz ? 0 : k * 90); });
      b.textContent = algum ? (o.rotuloVoltar || 'Desvirar todos') : (o.rotuloTodos || 'Virar todos');
    });
  }

  // ------------------------------------------------------------------ barras com troca de medida
  // NK.barras(raiz, [{ rotulo, valores: { clientes: 29, gmv: 71.5 }, cor, destaque }], {
  //   medidas: [{ chave: 'clientes', nome: '% dos clientes', fmt, escala: 'lin'|'log', max }],
  //   tabela: true,           // cria <details class="tabela"> com todos os números
  //   aoMudar: fn(chave)      // ex.: trocar a frase de leitura abaixo do gráfico
  // })
  // Troca de medida anima as barras; celular põe o rótulo em cima; tooltip mostra todas as medidas.
  function barras(raiz, dados, o) {
    if (!raiz) return;
    var meds = o.medidas, atual = 0, itens = [], larg = 0, dims = {};
    var ctrl = null;
    if (meds.length > 1) {
      ctrl = H('div', 'ctrl', null); var seg = H('div', 'seg', null, ctrl); seg.setAttribute('role', 'group');
      meds.forEach(function (m, k) {
        var b = H('button', null, m.nome, seg); b.type = 'button'; b.setAttribute('aria-pressed', k === 0);
        b.addEventListener('click', function () { atual = k; seg.querySelectorAll('button').forEach(function (x, j) { x.setAttribute('aria-pressed', j === k); }); aplicar(650); if (o.aoMudar) o.aoMudar(m.chave); });
      });
      raiz.parentNode.insertBefore(ctrl, raiz);
    }
    if (o.tabela !== false) {
      var det = H('details', 'tabela'); H('summary', null, 'Mostrar os números', det);
      var tb = H('table', null, null, H('div', 'tbl', null, det)), cab = H('tr', null, null, H('thead', null, null, tb)), corpo = H('tbody', null, null, tb);
      H('th', null, o.rotuloCategoria || '', cab); meds.forEach(function (m) { H('th', null, m.nome, cab); });
      dados.forEach(function (d) { var tr = H('tr', null, null, corpo); H('td', null, d.rotulo, tr); meds.forEach(function (m) { H('td', null, (m.fmt || fmt)(d.valores[m.chave]), tr); }); });
      raiz.parentNode.insertBefore(det, raiz.nextSibling);
    }
    function escala(m) {
      var max = m.max || Math.max.apply(null, dados.map(function (d) { return d.valores[m.chave]; }));
      if (m.escala === 'log') { var min = m.min || Math.pow(10, Math.floor(Math.log10(Math.min.apply(null, dados.map(function (d) { return d.valores[m.chave]; }))))); return log(min, max, 0, dims.x1 - dims.x0); }
      return lin(0, max, 0, dims.x1 - dims.x0);
    }
    function desenhar(w) {
      larg = w;
      var cel = w < 560, lh = cel ? 52 : 36, rot = cel ? 0 : Math.min(240, w * 0.32), h = dados.length * lh + 6;
      dims = { x0: rot, x1: w - 64, cel: cel };
      var svg = S('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': o.aria || '' });
      raiz.replaceChildren(svg);
      itens = dados.map(function (d, i) {
        var y = i * lh + (cel ? 22 : 6);
        S('text', { x: cel ? 0 : rot - 10, y: cel ? y - 6 : y + 15, 'text-anchor': cel ? 'start' : 'end', class: d.destaque ? 'forte' : '' }, svg).textContent = d.rotulo;
        var r = S('rect', { x: rot, y: y, height: 20, width: 0, rx: 2, fill: d.cor || (d.destaque ? 'var(--accent)' : 'var(--cinza)') }, svg);
        var v = S('text', { x: rot, y: y + 15, class: 'forte' }, svg);
        function dica(ev) { mostrarDica(ev.clientX, ev.clientY, function (el) { H('b', null, d.rotulo, el); meds.forEach(function (m) { linhaDica(el, null, m.nome, (m.fmt || fmt)(d.valores[m.chave])); }); }); }
        r.addEventListener('pointermove', dica); r.addEventListener('pointerdown', dica); r.addEventListener('pointerleave', esconderDica);
        return { d: d, r: r, v: v, w: 0 };
      });
      aplicar(0);
    }
    function aplicar(dur) {
      var m = meds[atual], X = escala(m), de = itens.map(function (b) { return b.w; }), para = itens.map(function (b) { return Math.max(2, X(b.d.valores[m.chave])); });
      itens.forEach(function (b) { b.v.textContent = (m.fmt || fmt)(b.d.valores[m.chave]); });
      tween(dur, function (k) {
        itens.forEach(function (b, i) { b.w = de[i] + (para[i] - de[i]) * ease.inOut(k); b.r.setAttribute('width', b.w.toFixed(1)); b.v.setAttribute('x', (dims.x0 + b.w + 6).toFixed(1)); });
      });
    }
    responsive(raiz, desenhar);
    revelar(raiz, function () { itens.forEach(function (b) { b.w = 0; b.r.setAttribute('width', 0); b.v.setAttribute('x', dims.x0 + 6); }); }, function (inst) { if (!inst) aplicar(1000); });
    return { medida: function (chave) { var k = meds.findIndex(function (m) { return m.chave === chave; }); if (k >= 0 && ctrl) ctrl.querySelectorAll('button')[k].click(); } };
  }

  // ------------------------------------------------------------------ curvas com play (cenários, série mês a mês)
  // NK.curvas(raiz, {
  //   x: ['M1','M2',...], series: [{ nome, cor, valores: [...] }], destaque: 1,   // série em evidência (seletor troca)
  //   fmtY, rotulo, play: true, aoPasso: fn(i, valoresNoPonto)
  // })
  // ▶ revela mês a mês; slider escolhe o mês; seletor destaca um cenário; crosshair no hover.
  function curvas(raiz, o) {
    if (!raiz) return;
    var n = o.x.length, i = n - 1, dest = o.destaque || 0, fy = o.fmtY || function (v) { return fmt(v); }, tocando = null, partes = null;
    var ctrl = H('div', 'ctrl curvas-ctrl'); raiz.parentNode.insertBefore(ctrl, raiz);
    var mesEl = H('div', 'curvas-mes', o.x[i], ctrl);
    var play = H('button', 'btn', '▶ Tocar', ctrl); play.type = 'button';
    var sl = H('input', null, null, ctrl); sl.type = 'range'; sl.min = 0; sl.max = n - 1; sl.value = i; sl.setAttribute('aria-label', 'Período');
    if (o.series.length > 1) {
      var seg = H('div', 'seg', null, ctrl); seg.setAttribute('role', 'group');
      o.series.forEach(function (s, k) { var b = H('button', null, s.nome, seg); b.type = 'button'; b.setAttribute('aria-pressed', k === dest); b.addEventListener('click', function () { dest = k; seg.querySelectorAll('button').forEach(function (x, j) { x.setAttribute('aria-pressed', j === k); }); pintar(); }); });
    }
    var leitura = H('p', 'curvas-leitura', null); raiz.parentNode.insertBefore(leitura, raiz.nextSibling);
    function desenhar(w) {
      var cel = w < 560, h = o.altura || (cel ? 260 : 300), m = { t: 12, r: cel ? 40 : 70, b: 26, l: cel ? 34 : 46 };
      var todos = [].concat.apply([], o.series.map(function (s) { return s.valores; })), max = Math.max.apply(null, todos), passo = passoBonito(max / 4), y1 = Math.ceil(max * 1.04 / passo) * passo;
      var X = lin(0, n - 1, m.l, w - m.r), Y = lin(0, y1, h - m.b, m.t);
      var svg = S('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': o.rotulo || '' });
      raiz.replaceChildren(svg);
      for (var t = 0; t <= y1 + 1e-9; t += passo) { S('line', { x1: m.l, x2: w - m.r, y1: Y(t), y2: Y(t), class: 'grade' }, svg); S('text', { x: m.l - 6, y: Y(t) + 4, 'text-anchor': 'end', fill: 'var(--muted)' }, svg).textContent = fy(t); }
      var cada = Math.max(1, Math.ceil(n / (cel ? 5 : 10)));
      o.x.forEach(function (lx, k) { if (k % cada === 0 || k === n - 1) S('text', { x: X(k), y: h - 6, 'text-anchor': 'middle', fill: 'var(--muted)' }, svg).textContent = lx; });
      var cursor = S('line', { y1: m.t, y2: h - m.b, stroke: 'var(--muted)', 'stroke-dasharray': '2 3' }, svg);
      partes = { X: X, Y: Y, cursor: cursor, linhas: o.series.map(function (s) {
        return { s: s, p: S('path', { fill: 'none', stroke: s.cor, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg),
                 dot: S('circle', { r: 4.5, fill: s.cor, stroke: 'var(--paper)', 'stroke-width': 1.5 }, svg),
                 val: S('text', { class: 'forte', 'font-size': 12 }, svg) };
      }) };
      var area = S('rect', { x: m.l, y: m.t, width: w - m.l - m.r, height: h - m.t - m.b, fill: 'transparent' }, svg);
      area.addEventListener('pointermove', function (ev) {
        var r = svg.getBoundingClientRect(), k = Math.round(lin(m.l, w - m.r, 0, n - 1)((ev.clientX - r.left) * (w / r.width)));
        k = clamp(k, 0, i);
        mostrarDica(ev.clientX, ev.clientY, function (el) { H('b', null, o.x[k], el); o.series.forEach(function (s) { linhaDica(el, s.cor, s.nome, fy(s.valores[k])); }); });
      });
      area.addEventListener('pointerleave', esconderDica);
      pintar();
    }
    function pintar() {
      if (!partes) return;
      partes.linhas.forEach(function (L, k) {
        var d = L.s.valores.slice(0, i + 1).map(function (v, j) { return (j ? 'L' : 'M') + partes.X(j).toFixed(1) + ',' + partes.Y(v).toFixed(1); }).join('');
        L.p.setAttribute('d', d); L.p.style.opacity = k === dest ? 1 : 0.35; L.p.setAttribute('stroke-width', k === dest ? 3 : 2);
        var x = partes.X(i), y = partes.Y(L.s.valores[i]);
        L.dot.setAttribute('cx', x); L.dot.setAttribute('cy', y); L.dot.style.opacity = k === dest ? 1 : 0.5;
        L.val.setAttribute('x', x + 7); L.val.setAttribute('y', y + 4); L.val.textContent = fy(L.s.valores[i]); L.val.style.opacity = k === dest ? 1 : 0.55;
      });
      partes.cursor.setAttribute('x1', partes.X(i)); partes.cursor.setAttribute('x2', partes.X(i));
      mesEl.textContent = o.x[i]; sl.value = i;
      var s = o.series[dest];
      leitura.replaceChildren(); leitura.append(o.x[i] + ' · ' + s.nome + ': '); H('b', null, fy(s.valores[i]), leitura);
      if (o.aoPasso) o.aoPasso(i, o.series.map(function (q) { return q.valores[i]; }));
    }
    function parar() { if (tocando) { clearInterval(tocando); tocando = null; play.textContent = '▶ Tocar'; } }
    function tocar() {
      if (tocando) return parar();
      if (i >= n - 1) { i = 0; pintar(); }
      play.textContent = '❚❚ Pausar';
      tocando = setInterval(function () { if (i >= n - 1) return parar(); i++; pintar(); }, reduz ? 0 : (o.intervalo || 550));
    }
    play.addEventListener('click', tocar);
    sl.addEventListener('input', function () { parar(); i = +sl.value; pintar(); });
    responsive(raiz, desenhar);
    // completo em repouso; ao entrar por baixo, recomeça do 1º período e toca uma vez
    revelar(raiz, function () { i = 0; pintar(); }, function (inst) { if (inst) { i = n - 1; pintar(); } else if (o.play !== false) setTimeout(tocar, 250); }, 0.4);
  }

  // ------------------------------------------------------------------ boot
  window.NK = {
    util: { S: S, H: H, lin: lin, log: log, passoBonito: passoBonito, clamp: clamp, fmt: fmt, brl: brl, ease: ease, mola: mola, tween: tween, responsive: responsive, dados: dados, reduz: reduz, celular: mqCel },
    revelar: revelar, dica: { mostrar: mostrarDica, linha: linhaDica, esconder: esconderDica },
    medidor: medidor, cena: cena, overlay: overlay, brilhos: brilhos, cintilar: cintilar,
    desenharLinha: desenharLinha, contar: contar, passos: passos, simulador: simulador, licoes: licoes,
    linhaMarcos: linhaMarcos, mapaUF: mapaUF, virar: virar, barras: barras, curvas: curvas,
    iniciar: function (o) { o = o || {}; medidor(o.medidor); iniciarCenas(); licoes(o.manual); }
  };
})();
