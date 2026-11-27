/* ===========================
   KYLRO - Swap
   Você paga com uma moeda que tem na carteira e recebe qualquer moeda da lista.
   A conversão usa as cotações ao vivo (js/cotacoes.js).
   =========================== */

/* ---------- Moedas ----------
   Todos os logos ficam na mesma caixa quadrada e são encaixados sem distorcer
   (object-fit: contain), mesmo os que não são quadrados, como ETH e Polygon. */
const moedas = {
  btc:  { nome: 'BITCOIN',  simbolo: 'BTC',  casas: 4, logo: 'img/bitcoin.svg' },
  sol:  { nome: 'SOLANA',   simbolo: 'SOL',  casas: 3, logo: 'img/solana.svg' },
  aave: { nome: 'AAVE',     simbolo: 'AAVE', casas: 3, logo: 'img/aave.svg' },
  usdt: { nome: 'USDT',     simbolo: 'USDT', casas: 2, logo: 'img/usdt.svg' },
  eth:  { nome: 'ETHEREUM', simbolo: 'ETH',  casas: 4, logo: 'img/eth.svg' },
  xrp:  { nome: 'XRP',      simbolo: 'XRP',  casas: 2, logo: 'img/xrp.svg' },
  pol:  { nome: 'POLYGON',  simbolo: 'POL',  casas: 2, logo: 'img/polygon.svg' },
  trx:  { nome: 'TRON',     simbolo: 'TRX',  casas: 2, logo: 'img/tron.svg' },
  uni:  { nome: 'UNISWAP',  simbolo: 'UNI',  casas: 3, logo: 'img/uniswap.svg' }
};

// o que o usuário tem (mesmas quantidades do dashboard e da Carteira): só dá para pagar com estas
const CARTEIRA = { btc: 0.01, sol: 5, aave: 5.73 };
const PAGAVEIS = Object.keys(CARTEIRA);
const RECEBIVEIS = Object.keys(moedas);

const MINIMO_REAIS = 50; // valor mínimo de uma troca

/* ---------- Estado ---------- */
const estado = {
  paga: 'btc',
  recebe: 'usdt',
  valorPago: CARTEIRA.btc / 2
};
let precos = {}; // moeda -> preço em reais (ao vivo)

/* ---------- Elementos ---------- */
const payToken      = document.getElementById('payToken');
const receiveToken  = document.getElementById('receiveToken');
const payAmount     = document.getElementById('payAmount');
const receiveAmount = document.getElementById('receiveAmount');
const saldoEl       = document.getElementById('saldo');
const taxaEl        = document.getElementById('taxa');
const invertBtn     = document.getElementById('invertBtn');
const limitBtns     = document.querySelectorAll('.limits button');

/* ---------- Utilidades ---------- */
const formatar = (n, casas) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const logoHTML = (m, classe = 'logo') =>
  `<img class="${classe}" src="${moedas[m].logo}" alt="" width="30" height="30">`;

// quanto se recebe de "para" pagando "valor" de "de" (null enquanto as cotações não chegam)
function converter(valor, de, para) {
  if (de === para) return valor;
  if (!precos[de] || !precos[para]) return null;
  return (valor * precos[de]) / precos[para];
}

function renderToken(el, m) {
  el.innerHTML = `${logoHTML(m)}<span class="token-nome">${moedas[m].nome}</span>
    <svg class="token-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
}

function render() {
  const { paga, recebe, valorPago } = estado;
  const valorRecebido = converter(valorPago, paga, recebe);
  const mp = moedas[paga];
  const mr = moedas[recebe];

  renderToken(payToken, paga);
  renderToken(receiveToken, recebe);
  payToken.setAttribute('aria-label', `Você paga com ${mp.nome}. Trocar moeda`);
  receiveToken.setAttribute('aria-label', `Você recebe ${mr.nome}. Trocar moeda`);

  payAmount.innerHTML =
    `<span class="sign neg">−</span>${formatar(valorPago, mp.casas)} ${mp.simbolo}`;
  receiveAmount.innerHTML = valorRecebido === null
    ? `<span class="carregando">cotando…</span>`
    : `<span class="sign pos">+</span>${formatar(valorRecebido, mr.casas)} ${mr.simbolo}`;

  saldoEl.textContent = `Saldo: ${formatar(CARTEIRA[paga], mp.casas)} ${mp.simbolo}`;

  const umPorOutro = converter(1, paga, recebe);
  taxaEl.textContent = umPorOutro === null
    ? 'Buscando cotação…'
    : `1 ${mp.simbolo} ≈ ${umPorOutro.toLocaleString('pt-BR', { maximumSignificantDigits: 6 })} ${mr.simbolo}`;

  // só dá para inverter se a moeda recebida também estiver na carteira
  const podeInverter = PAGAVEIS.includes(recebe);
  invertBtn.classList.toggle('off', !podeInverter);
  invertBtn.setAttribute('aria-disabled', String(!podeInverter));
  invertBtn.title = podeInverter ? 'Inverter moedas' : 'Você só pode pagar com moedas da sua carteira';
}

// mantém o valor pago dentro do saldo
const limitar = (valor, m) => Math.min(Math.max(valor, 0), CARTEIRA[m]);

function trocarMoeda(lado, m) {
  if (lado === 'paga') {
    if (m === estado.paga) return;
    estado.paga = m;
    estado.valorPago = CARTEIRA[m] / 2;
    if (estado.recebe === m) estado.recebe = 'usdt'; // não faz sentido trocar uma moeda por ela mesma
  } else {
    estado.recebe = m;
  }
  limitBtns.forEach(b => b.classList.remove('active'));
  render();
}

/* ---------- Escolher moeda (lista que abre ao tocar no botão da moeda) ---------- */
const seletor       = document.getElementById('seletor');
const seletorTitulo = document.getElementById('seletorTitulo');
const seletorLista  = document.getElementById('seletorLista');
let ladoAberto = null;
let botaoAberto = null;

function abrirSeletor(lado, botao) {
  ladoAberto = lado;
  botaoAberto = botao;
  const atual = estado[lado];
  const lista = lado === 'paga' ? PAGAVEIS : RECEBIVEIS.filter(m => m !== estado.paga);

  seletorTitulo.textContent = lado === 'paga' ? 'Pagar com' : 'Receber';
  seletorLista.innerHTML = lista.map(m => {
    const mo = moedas[m];
    const detalhe = lado === 'paga'
      ? `${formatar(CARTEIRA[m], mo.casas)} ${mo.simbolo}`
      : mo.simbolo;
    return `
      <li>
        <button type="button" class="opcao${m === atual ? ' atual' : ''}" data-moeda="${m}">
          ${logoHTML(m, 'opcao-logo')}
          <span class="opcao-nome">${mo.nome}</span>
          <span class="opcao-detalhe">${detalhe}</span>
        </button>
      </li>`;
  }).join('');

  seletor.hidden = false;
  (seletorLista.querySelector('.atual') || seletorLista.querySelector('button')).focus();
}

function fecharSeletor() {
  seletor.hidden = true;
  if (botaoAberto) botaoAberto.focus();
  ladoAberto = botaoAberto = null;
}

payToken.addEventListener('click', () => abrirSeletor('paga', payToken));
receiveToken.addEventListener('click', () => abrirSeletor('recebe', receiveToken));

seletorLista.addEventListener('click', e => {
  const opcao = e.target.closest('.opcao');
  if (!opcao) return;
  trocarMoeda(ladoAberto, opcao.dataset.moeda);
  fecharSeletor();
});
seletor.addEventListener('click', e => {
  if (e.target === seletor || e.target.closest('.seletor-fechar')) fecharSeletor();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !seletor.hidden) fecharSeletor();
});

/* ---------- Inverter moedas (só entre moedas da carteira) ---------- */
let rotacao = 0;

invertBtn.addEventListener('click', () => {
  if (!PAGAVEIS.includes(estado.recebe)) {
    invertBtn.classList.remove('nega');
    void invertBtn.offsetWidth;
    invertBtn.classList.add('nega'); // balança para mostrar que não dá
    return;
  }
  const valorRecebido = converter(estado.valorPago, estado.paga, estado.recebe);
  [estado.paga, estado.recebe] = [estado.recebe, estado.paga];
  estado.valorPago = valorRecebido === null
    ? CARTEIRA[estado.paga] / 2
    : limitar(valorRecebido, estado.paga);

  rotacao += 180;
  invertBtn.style.setProperty('--rot', rotacao + 'deg');

  limitBtns.forEach(b => b.classList.remove('active'));
  render();
});

/* ---------- MÍN / MAX ---------- */
limitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const m = estado.paga;
    if (btn.dataset.limit === 'max') {
      estado.valorPago = CARTEIRA[m];               // tudo o que tem
    } else {
      const minimo = precos[m] ? MINIMO_REAIS / precos[m] : CARTEIRA[m] * 0.01;
      estado.valorPago = limitar(minimo, m);       // o equivalente a R$ 50
    }
    limitBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

/* ---------- Cotações ao vivo ---------- */
Cotacoes.iniciar(RECEBIVEIS, dados => {
  precos = Object.fromEntries(Object.entries(dados).map(([m, d]) => [m, d.preco]));
  render();
});

/* ---------- Deslize para swap ---------- */
const slider     = document.getElementById('slider');
const thumb      = document.getElementById('sliderThumb');
const sliderText = document.getElementById('sliderText');

const TEXTO_PADRAO = 'deslize para swap';
const MARGEM = 10;

let arrastando = false;
let inicioX = 0;
let posX = 0;
let concluido = false;

const percurso = () => slider.clientWidth - MARGEM * 2 - thumb.offsetWidth;

function mover(x) {
  posX = Math.max(0, Math.min(x, percurso()));
  thumb.style.setProperty('--x', posX + 'px');
  sliderText.style.opacity = 1 - posX / percurso();
}

function resetar() {
  slider.classList.add('reset');
  mover(0);
  sliderText.textContent = TEXTO_PADRAO;
  sliderText.style.opacity = 1;
  concluido = false;
  setTimeout(() => slider.classList.remove('reset'), 300);
}

thumb.addEventListener('pointerdown', e => {
  if (concluido) return;
  arrastando = true;
  inicioX = e.clientX - posX;
  slider.classList.remove('reset');
  thumb.setPointerCapture(e.pointerId);
});

thumb.addEventListener('pointermove', e => {
  if (!arrastando) return;
  mover(e.clientX - inicioX);
});

function soltar() {
  if (!arrastando) return;
  arrastando = false;

  if (posX >= percurso() * 0.9) {
    concluido = true;
    mover(percurso());
    sliderText.textContent = 'swap concluído';
    sliderText.style.opacity = 1;
    setTimeout(resetar, 2000);
  } else {
    resetar();
  }
}

thumb.addEventListener('pointerup', soltar);
thumb.addEventListener('pointercancel', soltar);

/* ---------- Início ---------- */
render();
