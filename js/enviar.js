/* ===========================
   KYLRO - Enviar cripto
   Envia uma moeda da carteira: confere o saldo (quantidade + taxa de rede),
   desconta do estado da carteira e registra o envio na Atividade.
   =========================== */

import { MOEDAS, logoHTML } from './core/moedas.js?v=20261127e';
import * as Estado from './core/estado.js?v=20261127e';
import { qtd as qtdTexto, lerNumero } from './core/formato.js?v=20261127e';

let ativoAtual = Estado.moedasComSaldo()[0] || 'btc';

/* ---------- Elementos ---------- */
const ativoBox   = document.getElementById('ativo');
const ativoBtn   = document.getElementById('ativoBtn');
const ativoLogo  = document.getElementById('ativoLogo');
const ativoNome  = document.getElementById('ativoNome');
const ativoLista = document.getElementById('ativoLista');
const carteira   = document.getElementById('carteira');
const quantidade = document.getElementById('quantidade');
const unidade    = document.getElementById('unidade');
const disponivel = document.getElementById('disponivel');
const taxa       = document.getElementById('taxa');
const form       = document.getElementById('formEnviar');
const btnEnviar  = document.getElementById('btnEnviar');
const aviso      = document.getElementById('aviso');

const nomeCompleto = (m) => `${MOEDAS[m].nome} (${MOEDAS[m].simbolo})`;

/* ---------- Seletor de ativo (só moedas com saldo) ---------- */
function renderAtivo() {
  const moedas = Estado.moedasComSaldo();
  if (!moedas.includes(ativoAtual) && moedas.length) ativoAtual = moedas[0];
  const vazia = moedas.length === 0;

  ativoLogo.innerHTML = logoHTML(ativoAtual);
  ativoNome.textContent = vazia ? 'Carteira vazia' : nomeCompleto(ativoAtual);
  unidade.textContent = MOEDAS[ativoAtual].simbolo;
  disponivel.textContent = vazia ? 'Você não tem moedas para enviar.' : `Disponível: ${qtdTexto(ativoAtual, Estado.saldo(ativoAtual))}`;
  btnEnviar.disabled = vazia;

  ativoLista.innerHTML = moedas.map((m) => `
    <li role="option" data-moeda="${m}" aria-selected="${m === ativoAtual}">
      <span class="ativo-logo">${logoHTML(m)}</span><span>${nomeCompleto(m)}</span>
    </li>`).join('');

  atualizarTaxa();
}

function abrirLista(abrir) {
  ativoLista.hidden = !abrir;
  ativoBox.classList.toggle('aberto', abrir);
  ativoBtn.setAttribute('aria-expanded', abrir);
}

ativoBtn.addEventListener('click', () => abrirLista(ativoLista.hidden));

ativoLista.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  ativoAtual = li.dataset.moeda;
  abrirLista(false);
  quantidade.parentElement.classList.remove('invalido');
  renderAtivo();
});

document.addEventListener('click', (e) => {
  if (!ativoBox.contains(e.target)) abrirLista(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') abrirLista(false);
});

/* ---------- Quantidade e taxa ---------- */
function atualizarTaxa() {
  taxa.textContent = lerNumero(quantidade.value) > 0
    ? `≈ ${qtdTexto(ativoAtual, MOEDAS[ativoAtual].taxa)}`
    : 'Taxa estimada';
}

quantidade.addEventListener('input', () => {
  // só números e uma vírgula
  let v = quantidade.value.replace(/[^\d,.]/g, '').replace(/\./g, ',');
  const i = v.indexOf(',');
  if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, '');
  quantidade.value = v;
  quantidade.parentElement.classList.remove('invalido');
  atualizarTaxa();
});

carteira.addEventListener('input', () => carteira.classList.remove('invalido'));

/* ---------- Enviar ---------- */
function mostrarAviso(texto, tipo) {
  aviso.innerHTML = texto;
  aviso.className = 'aviso ' + tipo;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const endereco = carteira.value.trim();
  const qtd = lerNumero(quantidade.value);
  const total = qtd + MOEDAS[ativoAtual].taxa;
  const saldo = Estado.saldo(ativoAtual);

  carteira.classList.toggle('invalido', endereco.length < 20);
  quantidade.parentElement.classList.toggle('invalido', qtd <= 0 || total > saldo);

  if (endereco.length < 20) return mostrarAviso('Informe um endereço de carteira válido.', 'erro');
  if (qtd <= 0) return mostrarAviso('Informe a quantidade a enviar.', 'erro');
  if (total > saldo) {
    // arredonda para baixo: o valor sugerido precisa caber no saldo
    const fator = 10 ** MOEDAS[ativoAtual].casas;
    const maximo = Math.max(0, Math.floor((saldo - MOEDAS[ativoAtual].taxa) * fator) / fator);
    return mostrarAviso(`Saldo insuficiente. Com a taxa, dá para enviar até ${qtdTexto(ativoAtual, maximo)}.`, 'erro');
  }

  try {
    Estado.enviar(ativoAtual, qtd, endereco);
  } catch (err) {
    return mostrarAviso(err.message, 'erro');
  }

  mostrarAviso(`${qtdTexto(ativoAtual, qtd)} enviado com sucesso. <a href="atividade.html">Ver na Atividade</a>`, 'ok');
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'ENVIADO';

  setTimeout(() => {
    form.reset();
    btnEnviar.textContent = 'ENVIAR';
    renderAtivo();
  }, 2500);
});

// a carteira mudou em outra aba: atualiza o disponível
Estado.aoMudar(renderAtivo);

/* ---------- Início ---------- */
renderAtivo();
