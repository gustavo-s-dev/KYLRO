/* ===========================
   KYLRO - Cotações ao vivo (usado pela Carteira e pelo Swap)
   Mesmas fontes do dashboard:
   - Binance: preço a cada segundo por WebSocket
   - CoinGecko: reserva, consultada a cada 30 s
   - valores fixos: só se nenhuma das duas responder
   Todos os preços saem em reais, com a abertura de 24 h para calcular a variação.
   =========================== */

const Cotacoes = (() => {
  const BINANCE = "https://api.binance.com/api/v3";
  const GECKO = "https://api.coingecko.com/api/v3";

  // pares em reais na Binance (os mesmos do dashboard); as outras moedas usam o par
  // em dólar (XXXUSDT) multiplicado pelo USDT em reais
  const PAR_BRL = { btc: "BTCBRL", sol: "SOLBRL", usdt: "USDTBRL" };
  const par = (m) => PAR_BRL[m] || m.toUpperCase() + "USDT";

  const GECKO_ID = {
    btc: "bitcoin", sol: "solana", aave: "aave", usdt: "tether", eth: "ethereum",
    xrp: "ripple", pol: "polygon-ecosystem-token", trx: "tron", uni: "uniswap",
  };

  // [preço em reais, variação em 24 h] — só aparecem com as cotações offline
  const SIMULADO = {
    btc: [340000, -2.7], sol: [405, -0.3], aave: [538, -1.3], usdt: [5.53, -0.1],
    eth: [9520, -2.5], xrp: [5.37, -1.6], pol: [0.436, -0.8], trx: [1.68, -3.4], uni: [27.2, 0.2],
  };

  let moedas = [];
  let aoAtualizar = () => {};
  let fonte = null;            // "binance" | "gecko" | "simulado"
  const brutos = {};           // símbolo da Binance -> { c: último preço, o: abertura 24 h }
  const dados = {};            // moeda -> { preco, abertura } em reais

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

  const simbolos = () => [...new Set([...moedas.map(par), PAR_BRL.usdt])];

  // converte o que veio da Binance para reais
  function montarBinance() {
    const dolar = brutos[PAR_BRL.usdt];
    moedas.forEach((m) => {
      const b = brutos[par(m)];
      if (!b) return;
      if (PAR_BRL[m]) dados[m] = { preco: b.c, abertura: b.o };
      else if (dolar) dados[m] = { preco: b.c * dolar.c, abertura: b.o * dolar.o };
    });
  }

  let agendado = false;
  function avisar() {
    // várias cotações no mesmo instante viram um único redesenho
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      aoAtualizar(dados, fonte);
    });
  }

  async function precosBinance() {
    const lista = await buscarJSON(
      `${BINANCE}/ticker/24hr?type=MINI&symbols=${encodeURIComponent(JSON.stringify(simbolos()))}`
    );
    lista.forEach((x) => (brutos[x.symbol] = { c: +x.lastPrice, o: +x.openPrice }));
    montarBinance();
  }

  async function precosGecko() {
    const ids = moedas.map((m) => GECKO_ID[m]).join(",");
    const r = await buscarJSON(
      `${GECKO}/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`
    );
    moedas.forEach((m) => {
      const x = r[GECKO_ID[m]];
      if (x) dados[m] = { preco: x.brl, abertura: x.brl / (1 + (x.brl_24h_change || 0) / 100) };
    });
  }

  function precosSimulados() {
    moedas.forEach((m) => {
      const [preco, pct] = SIMULADO[m];
      dados[m] = { preco, abertura: preco / (1 + pct / 100) };
    });
  }

  // WebSocket da Binance: um aviso por segundo para cada par que mudou de preço
  let socket = null;
  let tentativas = 0;
  let reserva = null;

  function abrirSocket() {
    const canais = simbolos().map((s) => `${s.toLowerCase()}@miniTicker`).join("/");
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

  // ao voltar para a aba, atualiza na hora e reabre o canal ao vivo, se ele caiu
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (fonte === "binance") {
      precosBinance().then(avisar).catch(() => {});
      if (!socket) abrirSocket();
    } else if (fonte === "gecko") {
      precosGecko().then(avisar).catch(() => {});
    }
  });

  async function iniciar(lista, callback) {
    moedas = lista;
    aoAtualizar = callback;
    try {
      await precosBinance();
      fonte = "binance";
      avisar();
      abrirSocket();
      return;
    } catch (e) {
      // Binance indisponível nesta rede/região: tenta a reserva
    }
    try {
      await precosGecko();
      fonte = "gecko";
      avisar();
      setInterval(() => {
        if (!document.hidden) precosGecko().then(avisar).catch(() => {});
      }, 30000);
      return;
    } catch (e) {
      // nenhuma fonte respondeu
    }
    fonte = "simulado";
    precosSimulados();
    avisar();
  }

  return { iniciar };
})();
