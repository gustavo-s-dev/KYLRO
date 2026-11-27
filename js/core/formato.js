/* ===========================
   KYLRO - Formatação de valores (padrão brasileiro)
   =========================== */

import { MOEDAS } from './moedas.js?v=20261127f';

export const brl = (n) =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (p) => `${p >= 0 ? '+' : '-'} ${Math.abs(p).toFixed(2).replace('.', ',')}%`;

// quantidade de uma moeda: "0,002 BTC" (sem zeros sobrando) ou com casas fixas ("0,0050 BTC")
export function qtd(m, n, casasFixas) {
  const casas = casasFixas ?? MOEDAS[m].casas;
  const texto = n.toLocaleString('pt-BR', {
    minimumFractionDigits: casasFixas ?? 0,
    maximumFractionDigits: casas,
  });
  return `${texto} ${MOEDAS[m].simbolo}`;
}

// lê "1.234,56", "351.000" (ponto de milhar) ou "0.45" digitado pela pessoa
export function lerNumero(texto) {
  let t = String(texto).trim().replace(/\s/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

// "hoje", "ontem" ou a data, para agrupar a Atividade
export function rotuloDia(quando, agora = new Date()) {
  const d = new Date(quando);
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  if (quando >= inicioHoje) return 'Hoje';
  if (quando >= inicioHoje - 86400000) return 'Ontem';
  const opcoes = { day: 'numeric', month: 'long' };
  if (d.getFullYear() !== agora.getFullYear()) opcoes.year = 'numeric';
  return d.toLocaleDateString('pt-BR', opcoes);
}

export const hora = (quando) =>
  new Date(quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
