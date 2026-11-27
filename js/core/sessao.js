/* ===========================
   KYLRO - Sair
   Encerra a sessão simulada: esquece o nome, a carteira e os alertas.
   A próxima visita pergunta o nome de novo e começa com uma carteira nova.
   =========================== */

import * as Nome from './nome.js?v=20261127e';
import * as Estado from './estado.js?v=20261127e';
import * as Alertas from './alertas.js?v=20261127e';

export function sair() {
  Nome.apagar();
  Estado.apagar();
  Alertas.apagar();
}
