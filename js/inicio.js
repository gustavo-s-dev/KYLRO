/* ===========================
   KYLRO - Início (dashboard)
   Saldo e gráfico da carteira com cotações ao vivo. As moedas e quantidades
   vêm do estado da carteira (js/core/estado.js), o mesmo usado por Swap, Enviar e Receber.
   =========================== */

import { MOEDAS, logoHTML } from './core/moedas.js?v=20261127c';
import * as Estado from './core/estado.js?v=20261127c';
import * as Cotacoes from './core/cotacoes.js?v=20261127c';
import * as Nome from './core/nome.js?v=20261127c';
import { sair } from './core/sessao.js?v=20261127c';
import { brl, pct, rotuloDia, hora } from './core/formato.js?v=20261127c';
import { iniciarNotificacoes, aoAbrirPainel } from './notificacoes.js?v=20261127c';

/* ---------- Curvas ---------- */
// leva qualquer série de preços para a faixa 0–1 (o gráfico usa a altura toda)
function normalizar(serie) {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  if (max - min < 1e-9) return serie.map(() => 0.5);
  return serie.map((v) => 0.06 + ((v - min) / (max - min)) * 0.88);
}

// converte pontos em curva suave (Catmull-Rom -> Bézier)
function caminhoSuave(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const paraPontos = (serie, w, h, margem) =>
  serie.map((v, i) => ({ x: (i / (serie.length - 1)) * w, y: h - margem - v * (h - margem * 2) }));

// curva suave como no design: média de cada trecho, mantendo exatos o início e o preço atual
function suavizar(serie, n) {
  if (serie.length <= n) return serie.slice();
  const passo = (serie.length - 2) / (n - 2);
  const meio = Array.from({ length: n - 2 }, (_, i) => {
    const ini = 1 + Math.floor(i * passo);
    const fim = Math.max(ini + 1, 1 + Math.floor((i + 1) * passo));
    const trecho = serie.slice(ini, fim);
    return trecho.reduce((a, b) => a + b, 0) / trecho.length;
  });
  return [serie[0], ...meio, serie[serie.length - 1]];
}

/* ---------- Gráfico principal ---------- */
const W = 800;
const H = 300;
const chartEl = document.getElementById('mainChart');
const mainLine = document.getElementById('mainLine');
const mainGlow = document.getElementById('mainGlow');
const mainArea = document.getElementById('mainArea');
const mainDot = document.getElementById('mainDot');

function desenharGraficoPrincipal(serie) {
  const d = caminhoSuave(paraPontos(serie, W, H, 30));
  mainLine.setAttribute('d', d);
  mainGlow.setAttribute('d', d);
  mainArea.setAttribute('d', `${d} L ${W} ${H} L 0 ${H} Z`);
  posicionarBolinha();
}

// altura da curva desenhada num ponto x (busca binária ao longo da linha; x cresce com ela)
function yNaCurva(alvoX) {
  let ini = 0;
  let fim = mainLine.getTotalLength();
  let ponto = mainLine.getPointAtLength(fim);
  for (let i = 0; i < 30; i++) {
    const meio = (ini + fim) / 2;
    ponto = mainLine.getPointAtLength(meio);
    if (ponto.x < alvoX) ini = meio;
    else fim = meio;
  }
  return ponto.y;
}

// a bolinha fica sobre a linha, um pouco antes da borda direita do gráfico
function posicionarBolinha() {
  const largura = chartEl.clientWidth;
  if (!largura || !mainLine.getAttribute('d')) return;
  mainDot.style.top = (yNaCurva((mainDot.offsetLeft / largura) * W) / H) * 100 + '%';
}

window.addEventListener('resize', () => {
  posicionarBolinha();
  atualizarDica();
});

/* ---------- Gráfico interativo: valor e horário de cada ponto ---------- */
const mira = document.getElementById('chartMira');
const miraPonto = mira.querySelector('.chart-mira-ponto');
const dica = document.getElementById('chartDica');
const dicaValor = dica.querySelector('strong');
const dicaTempo = dica.querySelector('.chart-dica-tempo');
const dicaVar = dica.querySelector('.chart-dica-var');

const grafico = { valores: [], tempos: [] }; // saldo da carteira em cada ponto do período
let dicaT = null;                              // posição do cursor (0 a 1) enquanto explora o gráfico
let esconderDica = null;

function rotuloTempo(ts, periodo) {
  const d = new Date(ts);
  if (periodo === '1D') return `${rotuloDia(ts).toLowerCase()}, ${hora(ts)}`;
  if (periodo === '1S') {
    const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '');
    return `${dia}, ${hora(ts)}`;
  }
  if (periodo === '1M') {
    return `${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}, ${hora(ts)}`;
  }
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}

function atualizarDica() {
  const n = grafico.valores.length;
  if (dicaT === null || n < 2 || !mainLine.getAttribute('d')) {
    mira.hidden = dica.hidden = true;
    chartEl.classList.remove('explorando');
    return;
  }
  const i = Math.round(dicaT * (n - 1));
  const t = i / (n - 1);
  const valor = grafico.valores[i];
  const variacao = grafico.valores[0] ? ((valor - grafico.valores[0]) / grafico.valores[0]) * 100 : 0;

  chartEl.classList.add('explorando');
  mira.hidden = false;
  mira.style.left = t * 100 + '%';
  miraPonto.style.top = (yNaCurva(t * W) / H) * 100 + '%';

  dicaValor.textContent = saldoVisivel ? brl(valor) : 'R$ ••••••';
  dicaTempo.textContent = i === n - 1 ? 'agora' : rotuloTempo(grafico.tempos[i], periodoAtual);
  dicaVar.textContent = i === 0 ? 'início do período' : pct(variacao);
  dicaVar.className = 'chart-dica-var' + (i === 0 ? '' : variacao >= 0 ? ' up' : ' down');

  // a dica acompanha o cursor sem sair das bordas do gráfico
  dica.hidden = false;
  const largura = chartEl.clientWidth;
  const meia = dica.offsetWidth / 2 + 8;
  dica.style.left = Math.min(largura - meia, Math.max(meia, t * largura)) + 'px';
}

function explorar(e) {
  clearTimeout(esconderDica);
  const r = chartEl.getBoundingClientRect();
  dicaT = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  atualizarDica();
}
function pararDeExplorar(atraso = 0) {
  clearTimeout(esconderDica);
  esconderDica = setTimeout(() => {
    dicaT = null;
    atualizarDica();
  }, atraso);
}

chartEl.addEventListener('pointermove', explorar);
chartEl.addEventListener('pointerdown', explorar);
chartEl.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && pararDeExplorar());
// no toque, a dica fica um instante na tela depois que o dedo sai
chartEl.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && pararDeExplorar(1500));
chartEl.addEventListener('pointercancel', () => pararDeExplorar(800));

// teclado: setas percorrem o gráfico, Esc sai
chartEl.addEventListener('keydown', (e) => {
  const n = grafico.valores.length;
  if (n < 2) return;
  const passo = 1 / (n - 1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const atual = dicaT ?? 1;
    dicaT = Math.min(1, Math.max(0, atual + (e.key === 'ArrowRight' ? passo : -passo)));
    atualizarDica();
  } else if (e.key === 'Escape') {
    pararDeExplorar();
  }
});
chartEl.addEventListener('blur', () => pararDeExplorar());

/* ---------- Moedas da carteira (cartões ao lado do gráfico) ---------- */
const coinsEl = document.getElementById('coins');
const sparks = {};
let moedasExibidas = [];

function montarSpark(el, m) {
  const w = 200;
  const h = 76;
  const { de, ate } = MOEDAS[m].cor;
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="s-${m}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${de}"/><stop offset="1" stop-color="${ate}"/>
        </linearGradient>
        <linearGradient id="f-${m}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${de}" stop-opacity=".35"/><stop offset="1" stop-color="${de}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="spark-area" fill="url(#f-${m})" stroke="none"/>
      <path class="spark-linha" fill="none" stroke="url(#s-${m})" stroke-width="4"
            stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  return { area: el.querySelector('.spark-area'), linha: el.querySelector('.spark-linha'), w, h };
}

function desenharSpark(m, serie) {
  const s = sparks[m];
  if (!s) return;
  const d = caminhoSuave(paraPontos(serie, s.w, s.h, 8));
  s.linha.setAttribute('d', d);
  s.area.setAttribute('d', `${d} L ${s.w} ${s.h} L 0 ${s.h} Z`);
}

function renderMoedas(lista) {
  moedasExibidas = lista;
  Object.keys(sparks).forEach((m) => delete sparks[m]);
  if (!lista.length) {
    coinsEl.innerHTML = `<p class="coins-vazio">Sua carteira está vazia. <a href="receber.html">Simule um recebimento</a> para começar.</p>`;
    return;
  }
  coinsEl.innerHTML = lista.map((m) => `
    <article class="coin">
      <div class="coin-logo">${logoHTML(m)}</div>
      <div class="coin-body">
        <h3 class="coin-name" style="color:${MOEDAS[m].cor.texto}">${MOEDAS[m].simbolo}</h3>
        <div class="spark" data-spark="${m}"></div>
      </div>
      <div class="coin-info">
        <span class="up" id="pct-${m}">+ 0,00%</span>
        <small id="preco-${m}">R$ —</small>
      </div>
    </article>`).join('');
  lista.forEach((m) => (sparks[m] = montarSpark(coinsEl.querySelector(`[data-spark="${m}"]`), m)));
}

/* ---------- Histórico do período ---------- */
const historicos = {}; // "1D|btc,sol" -> { tempos, series, quando }
const chaveHistorico = (periodo, lista) => `${periodo}|${lista.join(',')}`;

// guardado por 1 min na Binance e 5 min na CoinGecko, para não exagerar nas consultas
async function carregarHistorico(periodo, forcar = false) {
  const lista = Estado.moedasComSaldo();
  const chave = chaveHistorico(periodo, lista);
  const guardado = historicos[chave];
  const validade = Cotacoes.fonteAtual() === 'gecko' ? 300000 : 60000;
  if (!forcar && guardado && Date.now() - guardado.quando < validade) return guardado;
  let h;
  try {
    h = await Cotacoes.historico(periodo, lista);
  } catch (e) {
    h = Cotacoes.historicoOffline(periodo, lista); // a fonte falhou agora: o gráfico não fica vazio
  }
  h.quando = Date.now();
  historicos[chave] = h;
  return h;
}

/* ---------- Saldo / Período ---------- */
const balanceValue = document.getElementById('balanceValue');
const balancePct = document.getElementById('balancePct');
const balanceVar = document.getElementById('balanceVariation');
const aoVivo = document.getElementById('aoVivo');
const ranges = document.querySelectorAll('.range');

let periodoAtual = '1D';
let saldoVisivel = true;
let saldoAnterior = null;

// junta tudo: saldo, variação do período, cartões das moedas e gráficos
function atualizarTela() {
  const lista = Estado.moedasComSaldo();
  if (lista.join() !== moedasExibidas.join()) renderMoedas(lista);

  const precos = Cotacoes.precos();
  if (!Cotacoes.fonteAtual() || !lista.every((m) => precos[m])) return;
  const h = historicos[chaveHistorico(periodoAtual, lista)];
  if (!h) return;

  // o último ponto de cada série é sempre o preço deste instante
  const series = {};
  lista.forEach((m) => {
    series[m] = h.series[m].slice();
    series[m][series[m].length - 1] = precos[m];
  });

  // saldo da carteira em cada ponto do período (com as quantidades de hoje)
  const saldo = lista.reduce((t, m) => t + Estado.saldo(m) * precos[m], 0);
  const n = lista.length ? h.tempos.length : 2;
  const carteira = lista.length
    ? Array.from({ length: n }, (_, i) => lista.reduce((t, m) => t + Estado.saldo(m) * series[m][i], 0))
    : [0, 0];
  const variacao = carteira[0] ? ((saldo - carteira[0]) / carteira[0]) * 100 : 0;

  grafico.valores = carteira;
  grafico.tempos = lista.length ? h.tempos.slice() : [Date.now() - Cotacoes.PERIODOS[periodoAtual].ms, Date.now()];
  grafico.tempos[grafico.tempos.length - 1] = Date.now();

  balanceValue.textContent = saldoVisivel ? brl(saldo) : 'R$ ••••••';
  balanceValue.classList.remove('carregando');

  // pisca de leve em verde ou vermelho quando o saldo muda
  if (saldoAnterior !== null && Math.abs(saldo - saldoAnterior) >= 0.005 && saldoVisivel) {
    balanceValue.classList.remove('sobe', 'desce');
    void balanceValue.offsetWidth;
    balanceValue.classList.add(saldo > saldoAnterior ? 'sobe' : 'desce');
  }
  saldoAnterior = saldo;

  balancePct.textContent = pct(variacao);
  balanceVar.classList.toggle('up', variacao >= 0);
  balanceVar.classList.toggle('down', variacao < 0);
  balanceVar.querySelector('svg').style.transform = variacao >= 0 ? 'none' : 'rotate(90deg)';

  // cartões das moedas: preço atual e variação no período escolhido
  lista.forEach((m) => {
    const s = series[m];
    const p = ((s[s.length - 1] - s[0]) / s[0]) * 100;
    const elPct = document.getElementById(`pct-${m}`);
    elPct.textContent = pct(p);
    elPct.classList.toggle('up', p >= 0);
    elPct.classList.toggle('down', p < 0);
    document.getElementById(`preco-${m}`).textContent = brl(precos[m]);
    desenharSpark(m, normalizar(suavizar(s, 16)));
  });

  desenharGraficoPrincipal(normalizar(suavizar(carteira, 24)));
  chartEl.setAttribute('aria-label',
    `Gráfico do saldo no período ${periodoAtual}: de ${brl(carteira[0])} para ${brl(saldo)}. Use as setas para percorrer.`);
  atualizarDica();
}

function marcarAoVivo(fonte) {
  const estado = { binance: 'vivo', gecko: 'atrasado', simulado: 'simulado' }[fonte];
  aoVivo.dataset.estado = estado;
  aoVivo.lastChild.textContent =
    estado === 'vivo' ? 'ao vivo' : estado === 'atrasado' ? 'atualiza a cada 30 s' : 'cotações offline';
}

ranges.forEach((btn) => {
  btn.addEventListener('click', async () => {
    ranges.forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    periodoAtual = btn.dataset.range;
    if (!Cotacoes.fonteAtual()) return; // ainda carregando: o período escolhido entra assim que os dados chegarem
    await carregarHistorico(periodoAtual);
    if (btn.dataset.range === periodoAtual) atualizarTela();
  });
});

/* ---------- Olho (mostrar/ocultar saldo) ---------- */
const eyeBtn = document.getElementById('toggleBalance');
eyeBtn.addEventListener('click', () => {
  saldoVisivel = !saldoVisivel;
  document.getElementById('eyeOpen').classList.toggle('hidden', !saldoVisivel);
  document.getElementById('eyeClosed').classList.toggle('hidden', saldoVisivel);
  eyeBtn.setAttribute('aria-pressed', String(!saldoVisivel));
  atualizarTela();
});

/* ---------- Atualização contínua ---------- */
let telaAgendada = false;
function agendarTela() {
  if (telaAgendada) return;
  telaAgendada = true;
  requestAnimationFrame(() => {
    telaAgendada = false;
    atualizarTela();
  });
}

let primeiraCotacao = true;
Cotacoes.assinar(async (dados, fonte) => {
  if (primeiraCotacao) {
    primeiraCotacao = false;
    marcarAoVivo(fonte);
    await carregarHistorico(periodoAtual);
  }
  agendarTela();
});

// o gráfico do período também anda: o histórico é recarregado a cada minuto
setInterval(() => {
  if (!Cotacoes.fonteAtual() || Cotacoes.fonteAtual() === 'simulado' || document.hidden) return;
  carregarHistorico(periodoAtual, true).then(agendarTela).catch(() => {});
}, 60000);

// a carteira mudou (swap ou envio em outra aba): busca o histórico das moedas novas e redesenha
Estado.aoMudar(() => {
  renderMoedas(Estado.moedasComSaldo());
  if (Cotacoes.fonteAtual()) carregarHistorico(periodoAtual).then(agendarTela);
});

balanceValue.classList.add('carregando');
renderMoedas(Estado.moedasComSaldo());
iniciarNotificacoes();

/* ---------- Nome da pessoa ---------- */
let nome = Nome.ler();
function aplicarNome() {
  document.getElementById('greeting').textContent = nome ? `Boas-vindas, ${nome}!` : 'Boas-vindas!';
  document.getElementById('popNome').textContent = nome;
  document.getElementById('popAvatar').textContent = nome.charAt(0).toLocaleUpperCase('pt-BR');
}
window.addEventListener('kylro:nome', (e) => {
  nome = e.detail;
  aplicarNome();
});
aplicarNome();

/* ---------- Menu lateral e botões ---------- */
document.querySelectorAll('.menu .menu-item').forEach((item) => {
  item.addEventListener('click', (e) => {
    // links reais (ex.: swap.html) navegam normalmente; só "#" é bloqueado
    if (item.getAttribute('href') === '#') e.preventDefault();
    document.querySelectorAll('.menu .menu-item').forEach((i) => i.classList.remove('active'));
    item.classList.add('active');
  });
});
document.getElementById('sendBtn').addEventListener('click', () => (window.location.href = 'enviar.html'));
document.getElementById('receiveBtn').addEventListener('click', () => (window.location.href = 'receber.html'));

/* ---------- Sair: mesma confirmação das Configurações ---------- */
const sairBtn = document.getElementById('sairBtn');
const modalSair = document.getElementById('modalSair');
const cancelarSair = document.getElementById('cancelarSair');
const confirmarSair = document.getElementById('confirmarSair');

function abrirModalSair() {
  modalSair.hidden = false;
  cancelarSair.focus();
}
function fecharModalSair() {
  modalSair.hidden = true;
  sairBtn.focus();
}

sairBtn.addEventListener('click', (e) => {
  e.preventDefault();
  abrirModalSair();
});
cancelarSair.addEventListener('click', fecharModalSair);
modalSair.addEventListener('click', (e) => {
  if (e.target === modalSair) fecharModalSair();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalSair.hidden) fecharModalSair();
});

confirmarSair.addEventListener('click', () => {
  // simulação: encerra a sessão (nome, carteira e alertas) e recarrega o início, que pergunta o nome de novo
  sair();
  confirmarSair.disabled = true;
  cancelarSair.disabled = true;
  confirmarSair.textContent = 'Saindo...';
  setTimeout(() => window.location.reload(), 900);
});

/* ---------- Painéis do topo: notificações e conta ---------- */
const paineis = [
  { btn: document.getElementById('notifBtn'), painel: document.getElementById('popNotif') },
  { btn: document.getElementById('perfilBtn'), painel: document.getElementById('popPerfil') },
];

function fecharPaineis() {
  paineis.forEach(({ btn, painel }) => {
    painel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });
}

paineis.forEach(({ btn, painel }) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = painel.hidden;
    fecharPaineis();
    if (abrir) {
      painel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      if (btn.id === 'notifBtn') aoAbrirPainel();
    }
  });
});

// clicar fora ou apertar Esc fecha (composedPath: vale mesmo se o item clicado saiu da tela)
document.addEventListener('click', (e) => {
  if (!e.composedPath().some((el) => el.classList && el.classList.contains('pop'))) fecharPaineis();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharPaineis();
});

document.getElementById('popSair').addEventListener('click', () => {
  fecharPaineis();
  abrirModalSair();
});
