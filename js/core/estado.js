/* ===========================
   KYLRO - Estado da carteira (simulada)
   Um único lugar com os saldos e o histórico, salvo no navegador.
   Swap, Enviar e Receber alteram este estado; Início, Carteira e Atividade leem dele.
   =========================== */

import { MOEDAS, IDS } from './moedas.js?v=20261127h';

const CHAVE = 'kylroCarteira';
const SALDOS_INICIAIS = { btc: 0.01, sol: 5, aave: 5.73 };
const POEIRA = 1e-9;        // abaixo disso o saldo é tratado como zero
const MAX_HISTORICO = 100;

// arredonda para não acumular erros de ponto flutuante (0,1 + 0,2 = 0,30000000000000004)
const arredondar = (n) => Math.round(n * 1e10) / 1e10;

const novoId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// carteira nova: os saldos iniciais entram no histórico como recebimentos recentes
function criar() {
  const agora = Date.now();
  const hora = 3600000;
  return {
    versao: 1,
    saldos: { ...SALDOS_INICIAIS },
    historico: [
      { id: novoId(), tipo: 'recebido', moeda: 'aave', qtd: 5.73, quando: agora - 3 * hora },
      { id: novoId(), tipo: 'recebido', moeda: 'sol', qtd: 5, quando: agora - 26 * hora },
      { id: novoId(), tipo: 'recebido', moeda: 'btc', qtd: 0.01, quando: agora - 50 * hora },
    ],
  };
}

function valido(e) {
  return e && e.versao === 1 && e.saldos && typeof e.saldos === 'object' && Array.isArray(e.historico);
}

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (valido(salvo)) return salvo;
  } catch (e) {}
  const nova = criar();
  salvar(nova);
  return nova;
}

function salvar(e = estado) {
  try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch (err) {}
}

let estado = carregar();

/* ---------- Quem quer saber das mudanças ---------- */
const ouvintes = new Set();
export function aoMudar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
const avisar = () => ouvintes.forEach((fn) => fn());

// outra aba mudou a carteira: esta aba atualiza também
window.addEventListener('storage', (e) => {
  if (e.key === CHAVE) {
    estado = carregar();
    avisar();
  }
});

/* ---------- Leitura ---------- */
export const saldo = (m) => estado.saldos[m] || 0;

// moedas com saldo, na ordem do catálogo
export const moedasComSaldo = () => IDS.filter((m) => saldo(m) > POEIRA);

export const historico = () => estado.historico.slice();

/* ---------- Operações ---------- */
function mudarSaldo(m, delta) {
  const novo = arredondar(saldo(m) + delta);
  if (novo < -POEIRA) throw new Error(`Saldo insuficiente de ${MOEDAS[m].simbolo}.`);
  if (novo <= POEIRA) delete estado.saldos[m];
  else estado.saldos[m] = novo;
}

function registrar(item) {
  estado.historico.unshift({ id: novoId(), quando: Date.now(), ...item });
  estado.historico.length = Math.min(estado.historico.length, MAX_HISTORICO);
}

// aplica a operação numa cópia: se algo der errado, o estado salvo não muda pela metade
function operar(fn) {
  const antes = JSON.stringify(estado);
  try {
    fn();
  } catch (err) {
    estado = JSON.parse(antes);
    throw err;
  }
  salvar();
  avisar();
}

const positivo = (n) => Number.isFinite(n) && n > 0;

export function trocar(de, para, qtdDe, qtdPara) {
  if (de === para) throw new Error('Escolha moedas diferentes.');
  if (!positivo(qtdDe) || !positivo(qtdPara)) throw new Error('Valor inválido para a troca.');
  operar(() => {
    mudarSaldo(de, -qtdDe);
    mudarSaldo(para, qtdPara);
    registrar({ tipo: 'swap', de, para, qtdDe, qtdPara });
  });
}

export function enviar(m, qtd, endereco) {
  if (!positivo(qtd)) throw new Error('Informe a quantidade a enviar.');
  const taxa = MOEDAS[m].taxa;
  operar(() => {
    mudarSaldo(m, -(qtd + taxa));
    registrar({ tipo: 'enviado', moeda: m, qtd, taxa, endereco });
  });
}

export function receber(m, qtd) {
  if (!positivo(qtd)) throw new Error('Quantidade inválida.');
  operar(() => {
    mudarSaldo(m, qtd);
    registrar({ tipo: 'recebido', moeda: m, qtd });
  });
}

// "Reiniciar demonstração": volta aos saldos iniciais e a um histórico novo
export function reiniciar() {
  estado = criar();
  salvar();
  avisar();
}

// usado pelo "Sair": a próxima pessoa começa com uma carteira nova
export function apagar() {
  try { localStorage.removeItem(CHAVE); } catch (e) {}
}
