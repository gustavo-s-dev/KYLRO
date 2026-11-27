/* ===========================
   KYLRO - Sino de notificações (início)
   Lista as notificações, mostra os alertas de preço ativos e o formulário para criar um.
   As regras ficam em js/core/alertas.js; aqui fica só a parte da tela.
   =========================== */

import { MOEDAS, IDS } from './core/moedas.js?v=20261127c';
import * as Alertas from './core/alertas.js?v=20261127c';
import * as Cotacoes from './core/cotacoes.js?v=20261127c';
import { brl, lerNumero, rotuloDia, hora } from './core/formato.js?v=20261127c';

const badge = document.getElementById('notifBadge');
const notifBtn = document.getElementById('notifBtn');
const lista = document.getElementById('notifLista');
const vazio = document.getElementById('notifVazio');
const limpar = document.getElementById('limparNotif');
const alertaLista = document.getElementById('alertaLista');
const form = document.getElementById('alertaForm');
const selMoeda = document.getElementById('alertaMoeda');
const selTipo = document.getElementById('alertaTipo');
const inputValor = document.getElementById('alertaValor');
const dicaEl = document.getElementById('alertaDica');
const toast = document.getElementById('toast');

const escapar = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const quandoTexto = (ts) => `${rotuloDia(ts)}, ${hora(ts)}`;

/* ---------- Notificações ---------- */
function renderNotificacoes() {
  const ns = Alertas.notificacoes();
  vazio.hidden = ns.length > 0;
  limpar.hidden = ns.length === 0;
  lista.innerHTML = ns.map((n) => `
    <li class="notif${n.lida ? '' : ' nova'}">
      <span class="notif-ic" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
      </span>
      <div>
        <strong>${escapar(n.titulo)}</strong>
        <span>${escapar(n.texto)} · ${quandoTexto(n.quando)}</span>
      </div>
    </li>`).join('');

  // o ponto vermelho só aparece quando há notificação ainda não vista
  const novas = Alertas.naoLidas();
  badge.hidden = novas === 0;
  notifBtn.setAttribute('aria-label', novas ? `Notificações: ${novas} nova${novas > 1 ? 's' : ''}` : 'Notificações');
}

/* ---------- Alertas ativos ---------- */
function renderAlertas() {
  const as = Alertas.alertas();
  alertaLista.innerHTML = as.length
    ? as.map((a) => `
      <li class="alerta">
        <img class="logo-moeda${MOEDAS[a.moeda].claro ? ' logo-claro' : ''}" src="${MOEDAS[a.moeda].logo}" alt="" width="22" height="22">
        <span>${Alertas.descrever(a)}</span>
        <button type="button" class="alerta-remover" data-id="${a.id}" aria-label="Remover alerta: ${Alertas.descrever(a)}">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>
        </button>
      </li>`).join('')
    : '<li class="alerta-vazio">Nenhum alerta ativo.</li>';
}

alertaLista.addEventListener('click', (e) => {
  const btn = e.target.closest('.alerta-remover');
  if (btn) Alertas.remover(btn.dataset.id);
});

limpar.addEventListener('click', () => Alertas.limparNotificacoes());

/* ---------- Criar alerta ---------- */
selMoeda.innerHTML = IDS.map((m) => `<option value="${m}">${MOEDAS[m].simbolo} · ${MOEDAS[m].nome}</option>`).join('');

// arredonda a sugestão para um número "redondo" (ex.: 356.981 -> 357.000)
function redondo(n) {
  const casas = Math.max(0, Math.floor(Math.log10(n)) - 2);
  const passo = 10 ** casas;
  return n >= 100 ? Math.round(n / passo) * passo : Math.round(n * 100) / 100;
}
const formatarValor = (n) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: n < 1 ? 4 : 2 });

let valorEditado = false;
function sugerir() {
  const p = Cotacoes.precos()[selMoeda.value];
  dicaEl.className = 'alerta-dica';
  dicaEl.textContent = p ? `Agora: ${brl(p)}` : 'Buscando cotação…';
  if (p && !valorEditado) inputValor.value = formatarValor(redondo(p * (selTipo.value === 'acima' ? 1.05 : 0.95)));
}

selMoeda.addEventListener('change', () => { valorEditado = false; sugerir(); });
selTipo.addEventListener('change', () => { valorEditado = false; sugerir(); });
inputValor.addEventListener('input', () => {
  valorEditado = true;
  inputValor.value = inputValor.value.replace(/[^\d.,]/g, '');
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    Alertas.criar(selMoeda.value, selTipo.value, lerNumero(inputValor.value), Cotacoes.precos()[selMoeda.value]);
  } catch (err) {
    dicaEl.className = 'alerta-dica erro';
    dicaEl.textContent = err.message;
    return;
  }
  valorEditado = false;
  sugerir();
  dicaEl.className = 'alerta-dica ok';
  dicaEl.textContent = 'Alerta criado. Avisamos aqui quando ele for atingido.';
  // pede permissão para avisar também fora do site (uma vez; a pessoa pode recusar)
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
});

/* ---------- Aviso quando um alerta é atingido ---------- */
let toastTimer;
function mostrarToast(n) {
  toast.innerHTML = `<strong>${escapar(n.titulo)}</strong><span>${escapar(n.texto)}</span>`;
  toast.hidden = false;
  toast.classList.remove('saindo');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('saindo');
    setTimeout(() => (toast.hidden = true), 300);
  }, 6000);
  notifBtn.classList.remove('balanca');
  void notifBtn.offsetWidth;
  notifBtn.classList.add('balanca');
}

function avisarSistema(n) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try { new Notification(n.titulo, { body: n.texto, icon: 'img/favicon-32.png', tag: n.id }); } catch (e) {}
}

export function aoAbrirPainel() {
  sugerir();
  Alertas.marcarLidas();
}

export function iniciarNotificacoes() {
  renderNotificacoes();
  renderAlertas();
  Alertas.aoMudar(() => {
    renderNotificacoes();
    renderAlertas();
  });
  Cotacoes.assinar(() => {
    const novas = Alertas.verificar(Cotacoes.precos());
    novas.forEach((n) => {
      mostrarToast(n);
      avisarSistema(n);
    });
    // painel aberto: o "Agora: R$ ..." acompanha a cotação (sem mexer no valor digitado)
    const p = Cotacoes.precos()[selMoeda.value];
    if (p && dicaEl.className === 'alerta-dica') dicaEl.textContent = `Agora: ${brl(p)}`;
  });
}
