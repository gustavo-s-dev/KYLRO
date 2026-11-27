/* ===========================
   KYLRO - Dashboard
   =========================== */

// nome digitado na tela de entrada (js/nome.js); chega pelo evento "kylro:nome" na primeira visita
const user = { nome: KylroNome.ler() };

/* ---------- Carteira do usuário (mesmas quantidades da página Carteira) ---------- */
const CARTEIRA = { btc: 0.01, sol: 5, aave: 5.73 };
const MOEDAS = Object.keys(CARTEIRA);

// pontos de cada período: intervalo e quantidade de velas na Binance, dias na CoinGecko
const PERIODOS = {
  "1D": { intervalo: "15m", velas: 96, dias: 1 },
  "1S": { intervalo: "2h", velas: 84, dias: 7 },
  "1M": { intervalo: "12h", velas: 60, dias: 30 },
  "1A": { intervalo: "1w", velas: 53, dias: 365 },
};

// dados simulados: só aparecem se nenhuma fonte de cotação responder
const SIMULADO = {
  precos: { btc: 375997.9, sol: 455.85, aave: 608.17 },
  "1D": { pct: 4.93, seed: 2 },
  "1S": { pct: 7.8, seed: 5 },
  "1M": { pct: -3.42, seed: 9 },
  "1A": { pct: 55.64, seed: 14 },
};

/* ---------- Utilidades ---------- */
const brl = (n) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctTexto = (p) => `${p >= 0 ? "+" : "-"} ${Math.abs(p).toFixed(2).replace(".", ",")}%`;

// Gera uma série suave e ondulada (determinística, baseada em seed) — usada só no modo simulado
function gerarSerie(seed, pontos = 14, tendencia = 1) {
  const serie = [];
  for (let i = 0; i < pontos; i++) {
    const t = i / (pontos - 1);
    const onda =
      Math.sin(i * 1.1 + seed) * 0.16 + Math.sin(i * 0.5 + seed * 2) * 0.1;
    const base = tendencia > 0 ? 0.15 + t * 0.65 : 0.8 - t * 0.55;
    serie.push(Math.min(0.95, Math.max(0.05, base + onda)));
  }
  return serie;
}

// Leva qualquer série de preços para a faixa 0–1 (o gráfico usa a altura toda)
function normalizar(serie) {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  if (max - min < 1e-9) return serie.map(() => 0.5);
  return serie.map((v) => 0.06 + ((v - min) / (max - min)) * 0.88);
}

// Converte pontos em curva suave (Catmull-Rom -> Bézier)
function caminhoSuave(pts) {
  if (pts.length < 2) return "";
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

function paraPontos(serie, w, h, margem) {
  return serie.map((v, i) => ({
    x: (i / (serie.length - 1)) * w,
    y: h - margem - v * (h - margem * 2),
  }));
}

// reduz uma série longa para n pontos (escolhendo pontos igualmente espaçados)
function reamostrar(serie, n) {
  if (serie.length <= n) return serie.slice();
  return Array.from({ length: n }, (_, i) => serie[Math.round((i / (n - 1)) * (serie.length - 1))]);
}

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
const W = 800,
  H = 300;
const mainLine = document.getElementById("mainLine");
const mainGlow = document.getElementById("mainGlow");
const mainArea = document.getElementById("mainArea");
const mainDot = document.getElementById("mainDot");

function desenharGraficoPrincipal(serie) {
  const pts = paraPontos(serie, W, H, 30);
  const d = caminhoSuave(pts);

  mainLine.setAttribute("d", d);
  mainGlow.setAttribute("d", d);
  mainArea.setAttribute("d", `${d} L ${W} ${H} L 0 ${H} Z`);

  posicionarBolinha();
}

// Coloca a bolinha exatamente sobre a linha, na posição horizontal em que ela
// é desenhada (o centro fica um pouco antes da borda direita do gráfico).
function posicionarBolinha() {
  const largura = mainDot.parentElement.clientWidth;
  if (!largura || !mainLine.getAttribute("d")) return;
  const alvoX = (mainDot.offsetLeft / largura) * W; // centro da bolinha em unidades do SVG

  // busca binária do ponto da curva com esse x (x cresce ao longo da linha)
  let ini = 0,
    fim = mainLine.getTotalLength(),
    ponto = mainLine.getPointAtLength(fim);
  for (let i = 0; i < 30; i++) {
    const meio = (ini + fim) / 2;
    ponto = mainLine.getPointAtLength(meio);
    if (ponto.x < alvoX) ini = meio;
    else fim = meio;
  }
  mainDot.style.top = (ponto.y / H) * 100 + "%";
}

window.addEventListener("resize", posicionarBolinha);

/* ---------- Mini gráficos das moedas ---------- */
const sparks = {};
document.querySelectorAll(".spark").forEach((el) => {
  const w = 200,
    h = 76;
  const id = el.dataset.id;
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="s-${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${el.dataset.from}"/>
          <stop offset="1" stop-color="${el.dataset.to}"/>
        </linearGradient>
        <linearGradient id="f-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${el.dataset.from}" stop-opacity=".35"/>
          <stop offset="1" stop-color="${el.dataset.from}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="spark-area" fill="url(#f-${id})" stroke="none"/>
      <path class="spark-linha" fill="none" stroke="url(#s-${id})" stroke-width="4"
            stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  sparks[id] = {
    area: el.querySelector(".spark-area"),
    linha: el.querySelector(".spark-linha"),
    w,
    h,
    seed: Number(el.dataset.seed),
  };
});

function desenharSpark(id, serie) {
  const s = sparks[id];
  if (!s) return;
  const d = caminhoSuave(paraPontos(serie, s.w, s.h, 8));
  s.linha.setAttribute("d", d);
  s.area.setAttribute("d", `${d} L ${s.w} ${s.h} L 0 ${s.h} Z`);
}

/* ---------- Cotações ao vivo ----------
   Fonte principal: Binance (preço em reais a cada segundo, por WebSocket).
   Reserva: CoinGecko (consultada a cada 30 s), caso a Binance não responda na região.
   AAVE não é negociada em reais na Binance: o preço vem de AAVE/USDT × USDT/BRL. */
const BINANCE = "https://api.binance.com/api/v3";
const GECKO = "https://api.coingecko.com/api/v3";
const PAR = { btc: "BTCBRL", sol: "SOLBRL", aave: "AAVEUSDT", usdt: "USDTBRL" };
const GECKO_ID = { btc: "bitcoin", sol: "solana", aave: "aave" };

const precos = {};       // preço atual em reais de cada moeda
let dolar = 0;           // USDT em reais (só para converter a AAVE)
let aaveUsd = 0;
let fonte = null;        // "binance" | "gecko" | "simulado"
const historicos = {};   // período -> { btc: [...], sol: [...], aave: [...], quando }

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscarJSON(url, limite = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), limite);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function definirPrecoAave() {
  if (aaveUsd && dolar) precos.aave = aaveUsd * dolar;
}

async function precosBinance() {
  const simbolos = encodeURIComponent(JSON.stringify(Object.values(PAR)));
  const lista = await buscarJSON(`${BINANCE}/ticker/price?symbols=${simbolos}`);
  const por = Object.fromEntries(lista.map((x) => [x.symbol, +x.price]));
  precos.btc = por.BTCBRL;
  precos.sol = por.SOLBRL;
  aaveUsd = por.AAVEUSDT;
  dolar = por.USDTBRL;
  definirPrecoAave();
}

async function precosGecko() {
  const ids = Object.values(GECKO_ID).join(",");
  const r = await buscarJSON(`${GECKO}/simple/price?ids=${ids}&vs_currencies=brl`);
  MOEDAS.forEach((m) => (precos[m] = r[GECKO_ID[m]].brl));
}

async function historicoBinance(periodo) {
  const { intervalo, velas } = PERIODOS[periodo];
  const velasDe = (par) =>
    buscarJSON(`${BINANCE}/klines?symbol=${par}&interval=${intervalo}&limit=${velas}`);
  const [btc, sol, aave, usdt] = await Promise.all(
    [PAR.btc, PAR.sol, PAR.aave, PAR.usdt].map(velasDe)
  );
  // série = abertura da primeira vela + fechamento de cada vela
  const serie = (v) => [+v[0][1], ...v.map((x) => +x[4])];
  // AAVE em reais: cada vela de AAVE/USDT vezes o dólar da vela do mesmo horário
  const dolarNaHora = new Map(usdt.map((x) => [x[0], [+x[1], +x[4]]]));
  const ultimo = [+usdt[usdt.length - 1][1], +usdt[usdt.length - 1][4]];
  const aaveBrl = [
    +aave[0][1] * (dolarNaHora.get(aave[0][0]) || ultimo)[0],
    ...aave.map((x) => +x[4] * (dolarNaHora.get(x[0]) || ultimo)[1]),
  ];
  return { btc: serie(btc), sol: serie(sol), aave: aaveBrl };
}

async function historicoGecko(periodo) {
  const { dias } = PERIODOS[periodo];
  const res = await Promise.all(
    MOEDAS.map((m) =>
      buscarJSON(`${GECKO}/coins/${GECKO_ID[m]}/market_chart?vs_currency=brl&days=${dias}`)
    )
  );
  const h = {};
  MOEDAS.forEach((m, i) => (h[m] = reamostrar(res[i].prices.map((p) => p[1]), 90)));
  return h;
}

function historicoSimulado(periodo) {
  const { pct, seed } = SIMULADO[periodo];
  const h = {};
  MOEDAS.forEach((m, i) => {
    const forma = gerarSerie(seed + i * 3, 14, pct >= 0 ? 1 : -1);
    const fim = SIMULADO.precos[m];
    const inicio = fim / (1 + pct / 100);
    // a forma ondulada vai do preço inicial ao atual
    h[m] = forma.map((v, j) => {
      const t = j / (forma.length - 1);
      return inicio + (fim - inicio) * t + (v - (forma[0] + (forma[forma.length - 1] - forma[0]) * t)) * fim * 0.04;
    });
  });
  return h;
}

// histórico do período (guardado por 1 min na Binance e 5 min na CoinGecko, para não exagerar nas consultas)
async function carregarHistorico(periodo, forcar = false) {
  const guardado = historicos[periodo];
  const validade = fonte === "gecko" ? 300000 : 60000;
  if (!forcar && guardado && Date.now() - guardado.quando < validade) return guardado;
  let h;
  if (fonte === "binance") h = await historicoBinance(periodo);
  else if (fonte === "gecko") h = await historicoGecko(periodo);
  else h = historicoSimulado(periodo);
  h.quando = Date.now();
  historicos[periodo] = h;
  return h;
}

/* ---------- Saldo / Período ---------- */
const balanceValue = document.getElementById("balanceValue");
const balancePct = document.getElementById("balancePct");
const balanceVar = document.getElementById("balanceVariation");
const aoVivo = document.getElementById("aoVivo");
const ranges = document.querySelectorAll(".range");

let periodoAtual = "1D";
let saldoVisivel = true;
let saldoAnterior = null;

function saldoAtual() {
  return MOEDAS.reduce((total, m) => total + CARTEIRA[m] * (precos[m] || 0), 0);
}

// junta tudo: saldo, variação do período, cartões das moedas e gráficos
function atualizarTela() {
  const h = historicos[periodoAtual];
  if (!h || !MOEDAS.every((m) => precos[m])) return;

  // o último ponto de cada série é sempre o preço deste instante
  const series = {};
  MOEDAS.forEach((m) => {
    series[m] = h[m].slice();
    series[m][series[m].length - 1] = precos[m];
  });

  // saldo da carteira em cada ponto do período
  const n = Math.min(...MOEDAS.map((m) => series[m].length));
  const carteira = Array.from({ length: n }, (_, i) =>
    MOEDAS.reduce((t, m) => t + CARTEIRA[m] * series[m][series[m].length - n + i], 0)
  );

  const saldo = saldoAtual();
  const pct = ((saldo - carteira[0]) / carteira[0]) * 100;

  balanceValue.textContent = saldoVisivel ? brl(saldo) : "R$ ••••••";
  balanceValue.classList.remove("carregando");

  // pisca de leve em verde ou vermelho quando o saldo muda
  if (saldoAnterior !== null && Math.abs(saldo - saldoAnterior) >= 0.005 && saldoVisivel) {
    const classe = saldo > saldoAnterior ? "sobe" : "desce";
    balanceValue.classList.remove("sobe", "desce");
    void balanceValue.offsetWidth;
    balanceValue.classList.add(classe);
  }
  saldoAnterior = saldo;

  balancePct.textContent = pctTexto(pct);
  balanceVar.classList.toggle("up", pct >= 0);
  balanceVar.classList.toggle("down", pct < 0);
  balanceVar.querySelector("svg").style.transform = pct >= 0 ? "none" : "rotate(90deg)";

  // cartões das moedas: preço atual e variação no período escolhido
  MOEDAS.forEach((m) => {
    const s = series[m];
    const p = ((s[s.length - 1] - s[0]) / s[0]) * 100;
    const elPct = document.getElementById(`pct-${m}`);
    elPct.textContent = pctTexto(p);
    elPct.classList.toggle("up", p >= 0);
    elPct.classList.toggle("down", p < 0);
    document.getElementById(`preco-${m}`).textContent = brl(precos[m]);
    desenharSpark(m, normalizar(suavizar(s, 16)));
  });

  desenharGraficoPrincipal(normalizar(suavizar(carteira, 24)));
}

function marcarAoVivo(estado) {
  aoVivo.dataset.estado = estado; // "vivo" | "atrasado" | "simulado"
  aoVivo.lastChild.textContent =
    estado === "vivo" ? "ao vivo" : estado === "atrasado" ? "atualiza a cada 30 s" : "cotações offline";
}

ranges.forEach((btn) => {
  btn.addEventListener("click", async () => {
    ranges.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    periodoAtual = btn.dataset.range;
    if (!fonte) return; // ainda carregando: o período escolhido entra assim que os dados chegarem
    try {
      await carregarHistorico(periodoAtual);
    } catch (e) {
      historicos[periodoAtual] = Object.assign(historicoSimulado(periodoAtual), { quando: Date.now() });
    }
    if (btn.dataset.range === periodoAtual) atualizarTela();
  });
});

/* ---------- Olho (mostrar/ocultar saldo) ---------- */
const eyeBtn = document.getElementById("toggleBalance");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");

eyeBtn.addEventListener("click", () => {
  saldoVisivel = !saldoVisivel;
  eyeOpen.classList.toggle("hidden", !saldoVisivel);
  eyeClosed.classList.toggle("hidden", saldoVisivel);
  atualizarTela();
});

/* ---------- Atualização contínua ---------- */
let telaAgendada = false;
function agendarTela() {
  // várias cotações no mesmo instante viram um único redesenho
  if (telaAgendada) return;
  telaAgendada = true;
  requestAnimationFrame(() => {
    telaAgendada = false;
    atualizarTela();
  });
}

// WebSocket da Binance: um aviso por segundo para cada par que mudou de preço
let socket = null;
let tentativasSocket = 0;
let consultaReserva = null;

function abrirSocket() {
  const canais = Object.values(PAR).map((p) => `${p.toLowerCase()}@miniTicker`).join("/");
  socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${canais}`);

  socket.onopen = () => {
    tentativasSocket = 0;
    clearInterval(consultaReserva);
    consultaReserva = null;
    marcarAoVivo("vivo");
  };
  socket.onmessage = (e) => {
    const { s, c } = JSON.parse(e.data).data;
    const preco = +c;
    if (s === PAR.btc) precos.btc = preco;
    else if (s === PAR.sol) precos.sol = preco;
    else if (s === PAR.aave) aaveUsd = preco;
    else if (s === PAR.usdt) dolar = preco;
    definirPrecoAave();
    agendarTela();
  };
  socket.onclose = () => {
    socket = null;
    if (document.hidden) return; // reabre quando a aba voltar a ficar visível
    // enquanto reconecta, consulta o preço a cada 5 s para a tela não parar
    if (!consultaReserva) {
      consultaReserva = setInterval(() => precosBinance().then(agendarTela).catch(() => {}), 5000);
    }
    tentativasSocket++;
    setTimeout(abrirSocket, Math.min(30000, 1000 * 2 ** tentativasSocket));
  };
}

// o gráfico do período também anda: o histórico é recarregado a cada minuto
setInterval(() => {
  if (!fonte || fonte === "simulado" || document.hidden) return;
  carregarHistorico(periodoAtual).then(agendarTela).catch(() => {});
}, 60000);

// na reserva (CoinGecko), o preço é consultado a cada 30 s
let consultaGecko = null;
function iniciarGecko() {
  consultaGecko = setInterval(() => {
    if (!document.hidden) precosGecko().then(agendarTela).catch(() => {});
  }, 30000);
}

// ao voltar para a aba, atualiza na hora e reabre o canal ao vivo, se ele caiu
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !fonte || fonte === "simulado") return;
  const preco = fonte === "binance" ? precosBinance() : precosGecko();
  Promise.all([preco, carregarHistorico(periodoAtual)]).then(agendarTela).catch(() => {});
  if (fonte === "binance" && !socket) abrirSocket();
});

async function iniciarCotacoes() {
  balanceValue.classList.add("carregando");
  try {
    await precosBinance();
    fonte = "binance";
    await carregarHistorico(periodoAtual);
    atualizarTela();
    abrirSocket();
    return;
  } catch (e) {
    // Binance indisponível nesta rede/região: tenta a reserva
  }
  try {
    await precosGecko();
    fonte = "gecko";
    await carregarHistorico(periodoAtual);
    atualizarTela();
    marcarAoVivo("atrasado");
    iniciarGecko();
    return;
  } catch (e) {
    // nenhuma fonte respondeu
  }
  fonte = "simulado";
  Object.assign(precos, SIMULADO.precos);
  await carregarHistorico(periodoAtual);
  atualizarTela();
  marcarAoVivo("simulado");
}

/* ---------- Menu lateral ---------- */
document.querySelectorAll(".menu .menu-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    // links reais (ex.: swap.html) navegam normalmente; só "#" é bloqueado
    if (item.getAttribute("href") === "#") e.preventDefault();
    document
      .querySelectorAll(".menu .menu-item")
      .forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
  });
});

/* ---------- Início ---------- */
// saudação, menu da conta e avatar com o nome da pessoa
function aplicarNome() {
  document.getElementById("greeting").textContent = user.nome ? `Boas-vindas, ${user.nome}!` : "Boas-vindas!";
  document.getElementById("popNome").textContent = user.nome;
  document.getElementById("popAvatar").textContent = user.nome.charAt(0).toLocaleUpperCase("pt-BR");
}
window.addEventListener("kylro:nome", (e) => {
  user.nome = e.detail;
  aplicarNome();
});
aplicarNome();
iniciarCotacoes(); // saldo, moedas e gráficos com cotações reais, atualizados o tempo todo

/* ---------- Botão Enviar ---------- */
document.getElementById("sendBtn").addEventListener("click", () => {
  window.location.href = "enviar.html";
});

/* ---------- Botão Receber ---------- */
document.getElementById("receiveBtn").addEventListener("click", () => {
  window.location.href = "receber.html";
});

/* ---------- Sair (barra lateral): mesma confirmação das Configurações ---------- */
const sairBtn = document.getElementById("sairBtn");
const modalSair = document.getElementById("modalSair");
const cancelarSair = document.getElementById("cancelarSair");
const confirmarSair = document.getElementById("confirmarSair");

function abrirModalSair() {
  modalSair.hidden = false;
  cancelarSair.focus();
}

function fecharModalSair() {
  modalSair.hidden = true;
  sairBtn.focus();
}

sairBtn.addEventListener("click", (e) => {
  e.preventDefault();
  abrirModalSair();
});
cancelarSair.addEventListener("click", fecharModalSair);

// clicar fora da caixa ou apertar Esc também cancela
modalSair.addEventListener("click", (e) => {
  if (e.target === modalSair) fecharModalSair();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalSair.hidden) fecharModalSair();
});

confirmarSair.addEventListener("click", () => {
  // simulação: encerra a sessão (esquece o nome) e recarrega o início, que pergunta o nome de novo
  KylroNome.apagar();
  confirmarSair.disabled = true;
  cancelarSair.disabled = true;
  confirmarSair.textContent = "Saindo...";
  setTimeout(() => window.location.reload(), 900);
});

/* ---------- Painéis do topo: notificações e conta ---------- */
const paineis = [
  { btn: document.getElementById("notifBtn"), painel: document.getElementById("popNotif") },
  { btn: document.getElementById("perfilBtn"), painel: document.getElementById("popPerfil") },
];

function fecharPaineis() {
  paineis.forEach(({ btn, painel }) => {
    painel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  });
}

paineis.forEach(({ btn, painel }) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const abrir = painel.hidden;
    fecharPaineis();
    if (abrir) {
      painel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    }
  });
});

// clicar fora ou apertar Esc fecha
document.addEventListener("click", (e) => {
  if (!e.target.closest(".pop")) fecharPaineis();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharPaineis();
});

// "Sair" do menu da conta abre a mesma confirmação
document.getElementById("popSair").addEventListener("click", () => {
  fecharPaineis();
  abrirModalSair();
});
