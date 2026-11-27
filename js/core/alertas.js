/* ===========================
   KYLRO - Alertas de preço e notificações
   A pessoa cria "me avise quando o BTC passar de R$ X"; a cada cotação ao vivo
   os alertas são conferidos e, quando um é atingido, vira uma notificação.
   =========================== */

import { MOEDAS } from './moedas.js?v=20261127b';
import { brl } from './formato.js?v=20261127b';

const CHAVE = 'kylroAlertas';
const MAX_NOTIFICACOES = 30;

function carregar() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE));
    if (s && Array.isArray(s.alertas) && Array.isArray(s.notificacoes)) return s;
  } catch (e) {}
  return { alertas: [], notificacoes: [] };
}

let dados = carregar();
const salvar = () => {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) {}
};

const ouvintes = new Set();
export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
const avisar = () => ouvintes.forEach((fn) => fn());

window.addEventListener('storage', (e) => {
  if (e.key === CHAVE) {
    dados = carregar();
    avisar();
  }
});

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const alertas = () => dados.alertas.slice();
export const notificacoes = () => dados.notificacoes.slice();
export const naoLidas = () => dados.notificacoes.filter((n) => !n.lida).length;

export function descrever(a) {
  return `${MOEDAS[a.moeda].simbolo} ${a.tipo === 'acima' ? 'passar de' : 'cair abaixo de'} ${brl(a.valor)}`;
}

// cria o alerta; recusa um que já estaria atingido agora (dispararia na hora)
export function criar(moeda, tipo, valor, precoAtual) {
  if (!(valor > 0)) throw new Error('Informe um preço em reais.');
  if (precoAtual) {
    if (tipo === 'acima' && valor <= precoAtual) throw new Error(`O ${MOEDAS[moeda].simbolo} já está acima desse valor.`);
    if (tipo === 'abaixo' && valor >= precoAtual) throw new Error(`O ${MOEDAS[moeda].simbolo} já está abaixo desse valor.`);
  }
  dados.alertas.push({ id: novoId(), moeda, tipo, valor, criado: Date.now() });
  salvar();
  avisar();
}

export function remover(id) {
  dados.alertas = dados.alertas.filter((a) => a.id !== id);
  salvar();
  avisar();
}

export function marcarLidas() {
  if (!naoLidas()) return;
  dados.notificacoes.forEach((n) => (n.lida = true));
  salvar();
  avisar();
}

export function limparNotificacoes() {
  dados.notificacoes = [];
  salvar();
  avisar();
}

// confere os alertas com as cotações; devolve as notificações novas
export function verificar(precos) {
  const novas = [];
  dados.alertas = dados.alertas.filter((a) => {
    const p = precos[a.moeda];
    const atingiu = p && (a.tipo === 'acima' ? p >= a.valor : p <= a.valor);
    if (!atingiu) return true;
    novas.push({
      id: novoId(),
      moeda: a.moeda,
      titulo: `${MOEDAS[a.moeda].simbolo} ${a.tipo === 'acima' ? 'passou de' : 'caiu abaixo de'} ${brl(a.valor)}`,
      texto: `Agora: ${brl(p)}`,
      quando: Date.now(),
      lida: false,
    });
    return false; // alerta atingido sai da lista (dispara uma vez só)
  });
  if (novas.length) {
    dados.notificacoes = [...novas, ...dados.notificacoes].slice(0, MAX_NOTIFICACOES);
    salvar();
    avisar();
  }
  return novas;
}

export function apagar() {
  try { localStorage.removeItem(CHAVE); } catch (e) {}
}
