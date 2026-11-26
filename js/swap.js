const moedas = {
  BTC: {
    nome: 'BITCOIN',
    simbolo: 'BTC',
    casas: 4,
    logo: '<span class="logo logo-btc">₿</span>'
  },
  USDT: {
    nome: 'USDT',
    simbolo: 'USDT',
    casas: 2,
    logo: `
      <span class="logo">
        <svg viewBox="0 0 40 40">
          <path d="M9 5h22l7 10-18 21L2 15z" fill="#50af95"/>
          <path d="M11 11h18v4h-7v2.4c4.4.3 7.600 1.200 7.600 2.400s-3.200 2.100-7.600 2.400V30h-4v-7.800c-4.400-.3-7.600-1.200-7.600-2.400s3.200-2.100 7.600-2.400V15h-6z" fill="#fff"/>
        </svg>
      </span>`
  }
};

/* ---------- Estado (valores de exemplo) ---------- */
const TAXA = 5252.95 / 0.0083;        // quantos USDT valem 1 BTC
const LIMITE_BTC = { min: 0.0001, max: 0.0210 };

const estado = {
  paga: 'BTC',
  recebe: 'USDT',
  valorPago: 0.0083
};

/* ---------- Elementos ---------- */
const payToken      = document.getElementById('payToken');
const receiveToken  = document.getElementById('receiveToken');
const payAmount     = document.getElementById('payAmount');
const receiveAmount = document.getElementById('receiveAmount');
const invertBtn     = document.getElementById('invertBtn');
const limitBtns     = document.querySelectorAll('.limits button');

/* ---------- Utilidades ---------- */
const formatar = (n, casas) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const converter = (valor, de, para) => {
  if (de === para) return valor;
  return de === 'BTC' ? valor * TAXA : valor / TAXA;
};

function renderToken(el, simbolo) {
  const m = moedas[simbolo];
  el.innerHTML = `${m.logo}<span>${m.nome}</span>`;
}

function render() {
  const { paga, recebe, valorPago } = estado;
  const valorRecebido = converter(valorPago, paga, recebe);

  renderToken(payToken, paga);
  renderToken(receiveToken, recebe);

  payAmount.innerHTML =
    `<span class="sign neg">−</span>${formatar(valorPago, moedas[paga].casas)} ${moedas[paga].simbolo}`;
  receiveAmount.innerHTML =
    `<span class="sign pos">+</span>${formatar(valorRecebido, moedas[recebe].casas)} ${moedas[recebe].simbolo}`;
}

/* ---------- Inverter moedas ---------- */
let rotacao = 0;

invertBtn.addEventListener('click', () => {
  const valorRecebido = converter(estado.valorPago, estado.paga, estado.recebe);
  [estado.paga, estado.recebe] = [estado.recebe, estado.paga];
  estado.valorPago = valorRecebido;

  rotacao += 180;
  invertBtn.style.setProperty('--rot', rotacao + 'deg');

  limitBtns.forEach(b => b.classList.remove('active'));
  render();
});

/* ---------- MÍN / MAX ---------- */
limitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const limiteBtc = LIMITE_BTC[btn.dataset.limit];
    estado.valorPago = converter(limiteBtc, 'BTC', estado.paga);

    limitBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
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