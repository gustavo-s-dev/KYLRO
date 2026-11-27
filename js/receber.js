/* ===========================
   KYLRO - Receber cripto
   Mostra o endereço de exemplo de cada moeda e permite simular um recebimento,
   que entra no estado da carteira e na Atividade.
   =========================== */

import { MOEDAS, IDS, logoHTML } from './core/moedas.js?v=20261127d';
import * as Estado from './core/estado.js?v=20261127d';
import { qtd } from './core/formato.js?v=20261127d';

let ativoAtual = 'btc';

/* ---------- Elementos ---------- */
const ativoBox    = document.getElementById('ativo');
const ativoBtn    = document.getElementById('ativoBtn');
const ativoLogo   = document.getElementById('ativoLogo');
const ativoNome   = document.getElementById('ativoNome');
const ativoLista  = document.getElementById('ativoLista');
const enderecoEl  = document.getElementById('endereco');
const copiarIcone = document.getElementById('copiarIcone');
const btnCopiar   = document.getElementById('btnCopiar');
const btnShare    = document.getElementById('btnCompartilhar');
const btnSimular  = document.getElementById('btnSimular');
const aviso       = document.getElementById('aviso');

const nomeCompleto = (m) => `${MOEDAS[m].nome} (${MOEDAS[m].simbolo})`;

/* ---------- Seletor de ativo ---------- */
function renderAtivo() {
  const m = MOEDAS[ativoAtual];
  ativoLogo.innerHTML = logoHTML(ativoAtual);
  ativoNome.textContent = nomeCompleto(ativoAtual);
  enderecoEl.textContent = m.endereco;
  enderecoEl.title = m.endereco;
  btnSimular.textContent = `Simular recebimento de ${qtd(ativoAtual, m.deposito)}`;

  ativoLista.innerHTML = IDS.map((id) => `
    <li role="option" data-moeda="${id}" aria-selected="${id === ativoAtual}">
      <span class="ativo-logo">${logoHTML(id)}</span><span>${nomeCompleto(id)}</span>
    </li>`).join('');
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
  renderAtivo();
});

document.addEventListener('click', (e) => {
  if (!ativoBox.contains(e.target)) abrirLista(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') abrirLista(false);
});

/* ---------- Copiar / Compartilhar ---------- */
let avisoTimer;
function mostrarAviso(texto, ms = 2500) {
  aviso.innerHTML = texto;
  clearTimeout(avisoTimer);
  if (texto) avisoTimer = setTimeout(() => (aviso.textContent = ''), ms);
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // alternativa para navegadores sem acesso à área de transferência
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

async function copiarEndereco() {
  const ok = await copiar(MOEDAS[ativoAtual].endereco);
  mostrarAviso(ok ? 'Endereço copiado!' : 'Não foi possível copiar o endereço.');
  if (ok) {
    const txt = btnCopiar.querySelector('.acao-txt');
    txt.textContent = 'Copiado!';
    setTimeout(() => (txt.textContent = 'Copiar endereço'), 1500);
  }
}

copiarIcone.addEventListener('click', copiarEndereco);
btnCopiar.addEventListener('click', copiarEndereco);

btnShare.addEventListener('click', async () => {
  const texto = `Meu endereço ${nomeCompleto(ativoAtual)} na KYLRO: ${MOEDAS[ativoAtual].endereco}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Receber cripto - KYLRO', text: texto });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // a pessoa cancelou
    }
  }
  const ok = await copiar(texto);
  mostrarAviso(ok ? 'Compartilhamento indisponível: endereço copiado.' : 'Não foi possível compartilhar.');
});

/* ---------- Simular recebimento ---------- */
btnSimular.addEventListener('click', () => {
  const m = MOEDAS[ativoAtual];
  Estado.receber(ativoAtual, m.deposito);
  mostrarAviso(
    `${qtd(ativoAtual, m.deposito)} recebido. Saldo: ${qtd(ativoAtual, Estado.saldo(ativoAtual))}. <a href="atividade.html">Ver na Atividade</a>`,
    5000
  );
});

/* ---------- Início ---------- */
renderAtivo();
