/* ===========================
   KYLRO - Swap
   Você paga com uma moeda que tem na carteira e recebe qualquer moeda do catálogo.
   A conversão usa as cotações ao vivo e, ao deslizar, a troca é aplicada no estado
   da carteira: os saldos mudam e a operação entra na Atividade.
   =========================== */

import { MOEDAS, IDS, logoHTML } from './core/moedas.js?v=20261127h';
import * as Estado from './core/estado.js?v=20261127h';
import * as Cotacoes from './core/cotacoes.js?v=20261127h';
import { lerNumero } from './core/formato.js?v=20261127h';

const MINIMO_REAIS = 50; // valor mínimo de uma troca

// casas decimais no swap (mais curtas que as da carteira, para caber no cartão)
const CASAS = { btc: 6, eth: 5, sol: 4, aave: 4, uni: 3, usdt: 2, xrp: 2, pol: 2, trx: 2 };

/* ---------- Estado da tela ---------- */
const pagaveis = () => Estado.moedasComSaldo();
const tela = {
  paga: pagaveis()[0] || 'btc',
  recebe: 'usdt',
  valorPago: 0,
};
tela.valorPago = Estado.saldo(tela.paga) / 2;
if (tela.recebe === tela.paga) tela.recebe = 'btc';

/* ---------- Elementos ---------- */
const payToken      = document.getElementById('payToken');
const receiveToken  = document.getElementById('receiveToken');
const payCampo      = document.getElementById('payCampo');
const payAmount     = document.getElementById('payAmount');
const payUnidade    = document.getElementById('payUnidade');
const receiveAmount = document.getElementById('receiveAmount');
const saldoEl       = document.getElementById('saldo');
const taxaEl        = document.getElementById('taxa');
const invertBtn     = document.getElementById('invertBtn');
const limitBtns     = document.querySelectorAll('.limits button');

/* ---------- Utilidades ---------- */
const formatar = (n, m) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: CASAS[m], maximumFractionDigits: CASAS[m] });

// quanto se recebe de "para" pagando "valor" de "de" (null enquanto as cotações não chegam)
function converter(valor, de, para) {
  const p = Cotacoes.precos();
  if (de === para) return valor;
  if (!p[de] || !p[para]) return null;
  return (valor * p[de]) / p[para];
}

// mantém o valor pago dentro do saldo
const limitar = (valor, m) => Math.min(Math.max(valor, 0), Estado.saldo(m));

const excedeSaldo = () => tela.valorPago > Estado.saldo(tela.paga) + 1e-12;

/* ---------- Campo do valor pago ----------
   A pessoa digita a quantidade que quiser. O campo só é reescrito quando o valor muda
   por outro caminho (MÍN, MAX, troca de moeda, inverter), nunca no meio da digitação. */
function ajustarLargura() {
  payAmount.style.width = Math.max(1, payAmount.value.length) + 0.5 + 'ch';
}

function escreverValor() {
  const m = tela.paga;
  payAmount.value = tela.valorPago > 0
    ? tela.valorPago.toLocaleString('pt-BR', { maximumFractionDigits: MOEDAS[m].casas, useGrouping: false })
    : '';
  ajustarLargura();
}

payAmount.addEventListener('input', () => {
  // só números e uma vírgula, com no máximo as casas decimais da moeda
  let v = payAmount.value.replace(/[^\d,.]/g, '').replace(/\./g, ',');
  const i = v.indexOf(',');
  if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, '').slice(0, MOEDAS[tela.paga].casas);
  payAmount.value = v;
  ajustarLargura();
  tela.valorPago = lerNumero(v);
  limitBtns.forEach((b) => b.classList.remove('active'));
  render();
});

// Enter no campo não envia nada: só sai da digitação
payAmount.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') payAmount.blur();
});

function renderToken(el, m) {
  el.innerHTML = `${logoHTML(m, 'logo')}<span class="token-nome">${MOEDAS[m].nome.toUpperCase()}</span>
    <svg class="token-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
}

function render() {
  const { paga, recebe, valorPago } = tela;
  const valorRecebido = converter(valorPago, paga, recebe);
  const mp = MOEDAS[paga];
  const mr = MOEDAS[recebe];

  renderToken(payToken, paga);
  renderToken(receiveToken, recebe);
  payToken.setAttribute('aria-label', `Você paga com ${mp.nome}. Trocar moeda`);
  receiveToken.setAttribute('aria-label', `Você recebe ${mr.nome}. Trocar moeda`);

  payUnidade.textContent = mp.simbolo;
  receiveAmount.innerHTML = valorRecebido === null
    ? `<span class="carregando">cotando…</span>`
    : `<span class="sign pos">+</span>${formatar(valorRecebido, recebe)} ${mr.simbolo}`;

  const excede = excedeSaldo();
  payCampo.classList.toggle('invalido', excede);
  saldoEl.classList.toggle('erro', excede);
  saldoEl.textContent = `${excede ? 'Saldo insuficiente. Você tem' : 'Saldo:'} ${formatar(Estado.saldo(paga), paga)} ${mp.simbolo}`;

  const umPorOutro = converter(1, paga, recebe);
  taxaEl.textContent = umPorOutro === null
    ? 'Buscando cotação…'
    : `1 ${mp.simbolo} ≈ ${umPorOutro.toLocaleString('pt-BR', { maximumSignificantDigits: 6 })} ${mr.simbolo}`;

  // só dá para inverter se a moeda recebida também estiver na carteira
  const podeInverter = pagaveis().includes(recebe);
  invertBtn.classList.toggle('off', !podeInverter);
  invertBtn.setAttribute('aria-disabled', String(!podeInverter));
  invertBtn.title = podeInverter ? 'Inverter moedas' : 'Você só pode pagar com moedas da sua carteira';
}

function trocarMoeda(lado, m) {
  if (lado === 'paga') {
    if (m === tela.paga) return;
    tela.paga = m;
    tela.valorPago = Estado.saldo(m) / 2;
    if (tela.recebe === m) tela.recebe = m === 'usdt' ? 'btc' : 'usdt'; // não faz sentido trocar uma moeda por ela mesma
    escreverValor();
  } else {
    tela.recebe = m;
  }
  limitBtns.forEach((b) => b.classList.remove('active'));
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
  const atual = tela[lado];
  const lista = lado === 'paga' ? pagaveis() : IDS.filter((m) => m !== tela.paga);

  seletorTitulo.textContent = lado === 'paga' ? 'Pagar com' : 'Receber';
  seletorLista.innerHTML = lista.map((m) => {
    const mo = MOEDAS[m];
    const detalhe = lado === 'paga' ? `${formatar(Estado.saldo(m), m)} ${mo.simbolo}` : mo.simbolo;
    return `
      <li>
        <button type="button" class="opcao${m === atual ? ' atual' : ''}" data-moeda="${m}">
          ${logoHTML(m, 'opcao-logo')}
          <span class="opcao-nome">${mo.nome.toUpperCase()}</span>
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

seletorLista.addEventListener('click', (e) => {
  const opcao = e.target.closest('.opcao');
  if (!opcao) return;
  trocarMoeda(ladoAberto, opcao.dataset.moeda);
  fecharSeletor();
});
seletor.addEventListener('click', (e) => {
  if (e.target === seletor || e.target.closest('.seletor-fechar')) fecharSeletor();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !seletor.hidden) fecharSeletor();
});

/* ---------- Inverter moedas (só entre moedas da carteira) ---------- */
let rotacao = 0;

invertBtn.addEventListener('click', () => {
  if (!pagaveis().includes(tela.recebe)) {
    invertBtn.classList.remove('nega');
    void invertBtn.offsetWidth;
    invertBtn.classList.add('nega'); // balança para mostrar que não dá
    return;
  }
  const valorRecebido = converter(tela.valorPago, tela.paga, tela.recebe);
  [tela.paga, tela.recebe] = [tela.recebe, tela.paga];
  tela.valorPago = valorRecebido === null ? Estado.saldo(tela.paga) / 2 : limitar(valorRecebido, tela.paga);
  escreverValor();

  rotacao += 180;
  invertBtn.style.setProperty('--rot', rotacao + 'deg');
  limitBtns.forEach((b) => b.classList.remove('active'));
  render();
});

/* ---------- MÍN / MAX: atalhos que preenchem o campo ---------- */
limitBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const m = tela.paga;
    const preco = Cotacoes.precos()[m];
    tela.valorPago = btn.dataset.limit === 'max'
      ? Estado.saldo(m)                                                  // tudo o que tem
      : limitar(preco ? MINIMO_REAIS / preco : Estado.saldo(m) * 0.01, m); // o equivalente a R$ 50
    limitBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    escreverValor();
    render();
  });
});

/* ---------- Cotações ao vivo e mudanças na carteira ---------- */
Cotacoes.assinar(render);

// a carteira mudou (aqui ou em outra aba): ajusta a moeda e o valor pago ao saldo novo
Estado.aoMudar(() => {
  const antes = tela.paga + tela.valorPago;
  if (!pagaveis().includes(tela.paga)) {
    tela.paga = pagaveis()[0] || tela.paga;
    tela.valorPago = Estado.saldo(tela.paga) / 2;
    if (tela.recebe === tela.paga) tela.recebe = tela.paga === 'usdt' ? 'btc' : 'usdt';
  }
  tela.valorPago = limitar(tela.valorPago, tela.paga);
  if (tela.paga + tela.valorPago !== antes) escreverValor();
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
  slider.classList.remove('erro');
  mover(0);
  sliderText.textContent = TEXTO_PADRAO;
  sliderText.style.opacity = 1;
  concluido = false;
  setTimeout(() => slider.classList.remove('reset'), 300);
}

// aplica a troca na carteira; devolve o texto do resultado
function fazerSwap() {
  const recebido = converter(tela.valorPago, tela.paga, tela.recebe);
  if (recebido === null) throw new Error('aguarde a cotação');
  if (!(tela.valorPago > 0)) throw new Error('digite a quantidade');
  if (excedeSaldo()) throw new Error('saldo insuficiente');
  Estado.trocar(tela.paga, tela.recebe, tela.valorPago, recebido);
  return 'swap concluído';
}

thumb.addEventListener('pointerdown', (e) => {
  if (concluido) return;
  arrastando = true;
  inicioX = e.clientX - posX;
  slider.classList.remove('reset');
  thumb.setPointerCapture(e.pointerId);
});

thumb.addEventListener('pointermove', (e) => {
  if (!arrastando) return;
  mover(e.clientX - inicioX);
});

function soltar() {
  if (!arrastando) return;
  arrastando = false;

  if (posX >= percurso() * 0.9) {
    concluido = true;
    mover(percurso());
    try {
      sliderText.textContent = fazerSwap();
      tela.valorPago = limitar(tela.valorPago, tela.paga);
      escreverValor();
    } catch (err) {
      slider.classList.add('erro');
      sliderText.textContent = err.message.toLowerCase().replace(/\.$/, '');
    }
    sliderText.style.opacity = 1;
    render();
    setTimeout(resetar, 2000);
  } else {
    resetar();
  }
}

thumb.addEventListener('pointerup', soltar);
thumb.addEventListener('pointercancel', soltar);

// teclado: Enter ou espaço no botão do controle também confirmam a troca
thumb.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && !concluido) {
    e.preventDefault();
    arrastando = true;
    posX = percurso();
    soltar();
  }
});

/* ---------- Início ---------- */
escreverValor();
render();
