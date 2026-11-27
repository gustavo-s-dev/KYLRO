/* ===========================
   KYLRO - Carteira
   Lista as moedas do estado da carteira com o valor ao vivo:
   verde quando a moeda subiu nas últimas 24 h, vermelho quando caiu.
   =========================== */

import { MOEDAS, logoHTML } from './core/moedas.js?v=20261127h';
import * as Estado from './core/estado.js?v=20261127h';
import * as Cotacoes from './core/cotacoes.js?v=20261127h';
import { brl, pct, qtd } from './core/formato.js?v=20261127h';

const lista = document.getElementById('lista');
const qtdEl = document.getElementById('qtd');
const totalEl = document.getElementById('total');

const ESTADO_FONTE = { binance: ['vivo', 'ao vivo'], gecko: ['atrasado', 'a cada 30 s'], simulado: ['simulado', 'offline'] };
const anteriores = {};

// valor em reais de cada moeda (para ordenar da maior para a menor)
const valorDe = (m) => Estado.saldo(m) * (Cotacoes.precos()[m] || 0);

function render() {
  const moedas = Estado.moedasComSaldo().sort((a, b) => valorDe(b) - valorDe(a));
  const n = moedas.length;
  qtdEl.querySelector('.contagem').textContent = `${n} ${n === 1 ? 'ativo' : 'ativos'}`;

  if (!n) {
    lista.innerHTML = `<p class="vazio">Sua carteira está vazia. <a href="receber.html">Simule um recebimento</a> para começar.</p>`;
    totalEl.textContent = brl(0);
    return;
  }

  lista.innerHTML = moedas.map((m) => `
    <article class="item">
      <span class="item-ic">${logoHTML(m)}</span>
      <div class="item-info">
        <h3 class="item-nome">${MOEDAS[m].nome}</h3>
        <p class="item-qtd">${qtd(m, Estado.saldo(m))}</p>
      </div>
      <div class="item-direita">
        <p class="item-valor carregando" id="valor-${m}">R$ —</p>
        <p class="item-var" id="var-${m}">24 h</p>
      </div>
    </article>`).join('');
  atualizarValores();
}

function atualizarValores() {
  const fonte = Cotacoes.fonteAtual();
  if (!fonte) return;
  const aoVivo = document.getElementById('aoVivo');
  const [estado, texto] = ESTADO_FONTE[fonte];
  aoVivo.dataset.estado = estado;
  aoVivo.lastChild.textContent = texto;

  let total = 0;
  let completo = true;
  Estado.moedasComSaldo().forEach((m) => {
    const d = Cotacoes.dadosDe(m);
    const valorEl = document.getElementById(`valor-${m}`);
    if (!d || !valorEl) { completo = false; return; }
    const valor = Estado.saldo(m) * d.preco;
    const p = ((d.preco - d.abertura) / d.abertura) * 100;
    const cor = p >= 0 ? 'up' : 'down';
    total += valor;

    valorEl.textContent = brl(valor);
    valorEl.className = `item-valor ${cor}`;
    const varEl = document.getElementById(`var-${m}`);
    varEl.textContent = `${pct(p)} · 24 h`;
    varEl.className = `item-var ${cor}`;

    // pisca de leve quando o valor muda, como o saldo do início
    const antes = anteriores[m];
    if (antes !== undefined && Math.abs(valor - antes) >= 0.005) {
      void valorEl.offsetWidth;
      valorEl.classList.add(valor > antes ? 'sobe' : 'desce');
    }
    anteriores[m] = valor;
  });
  if (completo) totalEl.textContent = brl(total);
}

let primeira = true;
Cotacoes.assinar(() => {
  if (primeira) {
    primeira = false;
    render(); // a primeira cotação define a ordem por valor
  } else {
    atualizarValores();
  }
});
Estado.aoMudar(render);
render();

/* ---------- Reiniciar demonstração ---------- */
const reiniciarBtn = document.getElementById('reiniciarBtn');
const confirmar = document.getElementById('reiniciarConfirmar');

reiniciarBtn.addEventListener('click', () => {
  confirmar.hidden = false;
  reiniciarBtn.hidden = true;
  confirmar.querySelector('.cancelar').focus();
});
confirmar.querySelector('.cancelar').addEventListener('click', () => {
  confirmar.hidden = true;
  reiniciarBtn.hidden = false;
  reiniciarBtn.focus();
});
confirmar.querySelector('.confirmar').addEventListener('click', () => {
  Estado.reiniciar();
  confirmar.hidden = true;
  reiniciarBtn.hidden = false;
  const aviso = document.getElementById('reiniciarAviso');
  aviso.textContent = 'Pronto: a carteira voltou aos saldos iniciais.';
  setTimeout(() => (aviso.textContent = ''), 3000);
});
