/* ===========================
   KYLRO - Cotações ao vivo e histórico
   - Binance: preço a cada segundo por WebSocket (fonte principal)
   - CoinGecko: reserva, consultada a cada 30 s
   - valores de exemplo: só se nenhuma das duas responder
   Todos os preços saem em reais. Acompanha todas as moedas do catálogo, porque
   qualquer uma pode estar na carteira (depois de um swap) ou num alerta de preço.
   =========================== */

import { IDS } from './moedas.js?v=20261127c';

const BINANCE = 'https://api.binance.com/api/v3';
const GECKO = 'https://api.coingecko.com/api/v3';

// pares em reais na Binance; as outras moedas usam o par em dólar × USDT em reais
const PAR_BRL = { btc: 'BTCBRL', sol: 'SOLBRL', usdt: 'USDTBRL' };
const par = (m) => PAR_BRL[m] || m.toUpperCase() + 'USDT';
const SIMBOLOS = [...new Set([...IDS.map(par), PAR_BRL.usdt])];

const GECKO_ID = {
  btc: 'bitcoin', sol: 'solana', aave: 'aave', usdt: 'tether', eth: 'ethereum',
  xrp: 'ripple', pol: 'polygon-ecosystem-token', trx: 'tron', uni: 'uniswap',
};

// períodos do gráfico: intervalo e quantidade de velas na Binance, dias na CoinGecko
export const PERIODOS = {
  '1D': { intervalo: '15m', velas: 96, dias: 1, ms: 86400000 },
  '1S': { intervalo: '2h', velas: 84, dias: 7, ms: 7 * 86400000 },
  '1M': { intervalo: '12h', velas: 60, dias: 30, ms: 30 * 86400000 },
  '1A': { intervalo: '1w', velas: 53, dias: 365, ms: 365 * 86400000 },
};

// [preço em reais, variação em 24 h] — só aparecem com as cotações offline
const SIMULADO = {
  btc: [340000, -2.7], sol: [405, -0.3], aave: [538, -1.3], usdt: [5.53, -0.1],
  eth: [9520, -2.5], xrp: [5.37, -1.6], pol: [0.436, -0.8], trx: [1.68, -3.4], uni: [27.2, 0.2],
};

let fonte = null;            // 'binance' | 'gecko' | 'simulado'
const brutos = {};           // símbolo da Binance -> { c: último preço, o: abertura 24 h }
const dados = {};            // moeda -> { preco, abertura } em reais

export const fonteAtual = () => fonte;
export const precos = () => Object.fromEntries(Object.entries(dados).map(([m, d]) => [m, d.preco]));
export const dadosDe = (m) => dados[m];

async function buscarJSON(url, limite = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), limite);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/* ---------- Preço atual ---------- */
function montarBinance() {
  const dolar = brutos[PAR_BRL.usdt];
  IDS.forEach((m) => {
    const b = brutos[par(m)];
    if (!b) return;
    if (PAR_BRL[m]) dados[m] = { preco: b.c, abertura: b.o };
    else if (dolar) dados[m] = { preco: b.c * dolar.c, abertura: b.o * dolar.o };
  });
}

async function precosBinance() {
  const lista = await buscarJSON(
    `${BINANCE}/ticker/24hr?type=MINI&symbols=${encodeURIComponent(JSON.stringify(SIMBOLOS))}`
  );
  lista.forEach((x) => (brutos[x.symbol] = { c: +x.lastPrice, o: +x.openPrice }));
  montarBinance();
}

async function precosGecko() {
  const ids = IDS.map((m) => GECKO_ID[m]).join(',');
  const r = await buscarJSON(`${GECKO}/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`);
  IDS.forEach((m) => {
    const x = r[GECKO_ID[m]];
    if (x) dados[m] = { preco: x.brl, abertura: x.brl / (1 + (x.brl_24h_change || 0) / 100) };
  });
}

function precosSimulados() {
  IDS.forEach((m) => {
    const [preco, p] = SIMULADO[m];
    dados[m] = { preco, abertura: preco / (1 + p / 100) };
  });
}

/* ---------- Quem quer saber das cotações ---------- */
const ouvintes = new Set();
let agendado = false;
function avisar() {
  // várias cotações no mesmo instante viram um único aviso
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    ouvintes.forEach((fn) => fn(dados, fonte));
  });
}

/* ---------- WebSocket da Binance ---------- */
let socket = null;
let tentativas = 0;
let reserva = null;

function abrirSocket() {
  const canais = SIMBOLOS.map((s) => `${s.toLowerCase()}@miniTicker`).join('/');
  socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${canais}`);

  socket.onopen = () => {
    tentativas = 0;
    clearInterval(reserva);
    reserva = null;
  };
  socket.onmessage = (e) => {
    const { s, c, o } = JSON.parse(e.data).data;
    brutos[s] = { c: +c, o: +o };
    montarBinance();
    avisar();
  };
  socket.onclose = () => {
    socket = null;
    if (document.hidden) return; // reabre quando a aba voltar a ficar visível
    // enquanto reconecta, consulta o preço a cada 5 s para a tela não parar
    if (!reserva) reserva = setInterval(() => precosBinance().then(avisar).catch(() => {}), 5000);
    tentativas++;
    setTimeout(abrirSocket, Math.min(30000, 1000 * 2 ** tentativas));
  };
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (fonte === 'binance') {
    precosBinance().then(avisar).catch(() => {});
    if (!socket) abrirSocket();
  } else if (fonte === 'gecko') {
    precosGecko().then(avisar).catch(() => {});
  }
});

let iniciado = null;
async function iniciar() {
  try {
    await precosBinance();
    fonte = 'binance';
    abrirSocket();
    return;
  } catch (e) {
    // Binance indisponível nesta rede/região: tenta a reserva
  }
  try {
    await precosGecko();
    fonte = 'gecko';
    setInterval(() => {
      if (!document.hidden) precosGecko().then(avisar).catch(() => {});
    }, 30000);
    return;
  } catch (e) {
    // nenhuma fonte respondeu
  }
  fonte = 'simulado';
  precosSimulados();
}

// registra quem quer as cotações; a primeira chamada liga as fontes
export function assinar(fn) {
  ouvintes.add(fn);
  if (!iniciado) iniciado = iniciar().then(avisar);
  else if (fonte) fn(dados, fonte);
  return () => ouvintes.delete(fn);
}

/* ---------- Histórico do período (gráficos do início) ----------
   Devolve { tempos: [...], series: { btc: [...], ... } } em reais, todos com o mesmo tamanho. */
async function historicoBinance(periodo, moedas) {
  const { intervalo, velas } = PERIODOS[periodo];
  const velasDe = (p) => buscarJSON(`${BINANCE}/klines?symbol=${p}&interval=${intervalo}&limit=${velas}`);
  const precisaDolar = moedas.some((m) => !PAR_BRL[m]);
  const pares = [...new Set([...moedas.map(par), ...(precisaDolar ? [PAR_BRL.usdt] : [])])];
  const respostas = await Promise.all(pares.map(velasDe));
  const velasPor = Object.fromEntries(pares.map((p, i) => [p, respostas[i]]));

  // dólar de cada horário, para converter as moedas negociadas em USDT
  const usdt = velasPor[PAR_BRL.usdt] || [];
  const dolarNaHora = new Map(usdt.map((x) => [x[0], [+x[1], +x[4]]]));
  const ultimo = usdt.length ? [+usdt[usdt.length - 1][1], +usdt[usdt.length - 1][4]] : [1, 1];
  const dolar = (t) => dolarNaHora.get(t) || ultimo;

  // série = abertura da primeira vela + fechamento de cada vela
  const series = {};
  let tempos = [];
  moedas.forEach((m) => {
    const v = velasPor[par(m)];
    const fator = PAR_BRL[m] ? () => [1, 1] : (t) => dolar(t);
    series[m] = [+v[0][1] * fator(v[0][0])[0], ...v.map((x) => +x[4] * fator(x[0])[1])];
    const t = [v[0][0], ...v.map((x) => x[6] + 1)];
    if (t.length > tempos.length) tempos = t;
  });
  return alinhar(tempos, series);
}

async function historicoGecko(periodo, moedas) {
  const { dias } = PERIODOS[periodo];
  const res = await Promise.all(
    moedas.map((m) => buscarJSON(`${GECKO}/coins/${GECKO_ID[m]}/market_chart?vs_currency=brl&days=${dias}`))
  );
  const series = {};
  let tempos = [];
  moedas.forEach((m, i) => {
    const pontos = reamostrar(res[i].prices, 90);
    series[m] = pontos.map((p) => p[1]);
    if (pontos.length > tempos.length) tempos = pontos.map((p) => p[0]);
  });
  return alinhar(tempos, series);
}

// forma ondulada que vai do preço do início do período ao atual (só no modo offline)
function historicoSimulado(periodo, moedas) {
  const n = 24;
  const agora = Date.now();
  const { ms } = PERIODOS[periodo];
  const tempos = Array.from({ length: n }, (_, i) => agora - ms + (ms * i) / (n - 1));
  const series = {};
  moedas.forEach((m, k) => {
    const [fim, p24] = SIMULADO[m];
    const p = p24 * (ms / 86400000) ** 0.5;
    const inicio = fim / (1 + p / 100);
    series[m] = tempos.map((_, i) => {
      const t = i / (n - 1);
      const onda = Math.sin(i * 1.1 + k * 3) * 0.02 + Math.sin(i * 0.5 + k) * 0.012;
      return (inicio + (fim - inicio) * t) * (1 + (i === 0 || i === n - 1 ? 0 : onda));
    });
  });
  return { tempos, series };
}

function reamostrar(lista, n) {
  if (lista.length <= n) return lista.slice();
  return Array.from({ length: n }, (_, i) => lista[Math.round((i / (n - 1)) * (lista.length - 1))]);
}

// todas as séries com o mesmo tamanho (as mais recentes), alinhadas pelo fim
function alinhar(tempos, series) {
  const n = Math.min(tempos.length, ...Object.values(series).map((s) => s.length));
  const corta = (s) => s.slice(s.length - n);
  return { tempos: corta(tempos), series: Object.fromEntries(Object.entries(series).map(([m, s]) => [m, corta(s)])) };
}

export async function historico(periodo, moedas) {
  if (!moedas.length) return { tempos: [], series: {} };
  if (fonte === 'binance') return historicoBinance(periodo, moedas);
  if (fonte === 'gecko') return historicoGecko(periodo, moedas);
  return historicoSimulado(periodo, moedas);
}

export const historicoOffline = historicoSimulado;
