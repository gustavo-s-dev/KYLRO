/* ===========================
   KYLRO - Nome do usuário (regras)
   Guarda o nome, formata ("maria DA silva" -> "Maria da Silva") e recusa palavrões.
   A tela que pergunta o nome fica em js/tela-nome.js.
   =========================== */

const CHAVE = 'kylroNome';

export const ler = () => {
  try { return localStorage.getItem(CHAVE) || ''; } catch (e) { return ''; }
};
export const salvar = (nome) => {
  try { localStorage.setItem(CHAVE, nome); } catch (e) {}
};
// usado pelo "Sair": esquece o nome e mostra a entrada de novo
export const apagar = () => {
  try {
    localStorage.removeItem(CHAVE);
    sessionStorage.removeItem('kylroAberturaVista');
  } catch (e) {}
};

/* ---------- Palavrões ----------
   A comparação ignora maiúsculas, acentos e letras repetidas ("PORRRA", "merdaaa").
   PALAVRAS: bloqueadas como palavra inteira (assim nomes como "Pinto" ou "Cuca" passam).
   TRECHOS: bloqueados em qualquer lugar do nome, até grudados ou separados por espaço. */
const PALAVRAS = [
  'porra', 'caralho', 'caralha', 'krl', 'crl', 'buceta', 'boceta', 'bct', 'puta', 'puto',
  'putinha', 'putaria', 'merda', 'bosta', 'foda', 'foder', 'fodido', 'fodida', 'fodase',
  'cu', 'cuzao', 'cuzinho', 'viado', 'arrombado', 'arrombada', 'piroca', 'pica', 'cacete',
  'desgraca', 'desgracado', 'desgracada', 'otario', 'otaria', 'babaca', 'imbecil', 'idiota',
  'retardado', 'retardada', 'vagabundo', 'vagabunda', 'vadia', 'piranha', 'safado', 'safada',
  'corno', 'corna', 'punheta', 'siririca', 'xoxota', 'xereca', 'xota', 'chota', 'pentelho',
  'escroto', 'escrota', 'broxa', 'fdp', 'vsf', 'vtnc', 'tnc', 'pqp', 'filhodaputa',
  'bicha', 'sapatao', 'traveco', 'nazista', 'hitler',
  'fuck', 'fucker', 'shit', 'bitch', 'dick', 'pussy', 'asshole', 'cunt', 'whore', 'slut',
  'bastard', 'nigger', 'nigga'
];
const TRECHOS = [
  'caralh', 'buceta', 'boceta', 'porra', 'merda', 'arrombad', 'punhet', 'filhodaput',
  'fodase', 'xoxot', 'xerec', 'siriric', 'piroca', 'putaria', 'vagabund', 'desgracad',
  'viado', 'cuzao', 'fuck', 'bitch', 'nigger', 'nigga'
];

// minúsculas, sem acentos e sem letras repetidas em sequência
const simplificar = (s) =>
  s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/(.)\1+/g, '$1');

const PALAVRAS_S = new Set(PALAVRAS.map(simplificar));
const TRECHOS_S = TRECHOS.map(simplificar);

function temPalavrao(nome) {
  const s = simplificar(nome);
  const palavras = s.split(/[^a-z]+/).filter(Boolean);
  const grudado = palavras.join('');
  return palavras.some((p) => PALAVRAS_S.has(p)) ||
    PALAVRAS_S.has(grudado) ||
    TRECHOS_S.some((t) => grudado.includes(t));
}

/* ---------- Formatação: "maria DA silva" -> "Maria da Silva" ---------- */
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

export function formatar(nome) {
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palavra, i) => {
      const minuscula = palavra.toLocaleLowerCase('pt-BR');
      if (i > 0 && PARTICULAS.has(minuscula)) return minuscula;
      // cada parte ganha maiúscula: "ana-clara" -> "Ana-Clara", "d’ávila" -> "D’Ávila"
      return minuscula.replace(/(^|[-'’])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase('pt-BR'));
    })
    .join(' ');
}

/* ---------- Validação: devolve a mensagem de erro, ou "" se o nome serve ---------- */
export function validar(nome) {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if ((limpo.match(/\p{L}/gu) || []).length < 2) return 'Digite pelo menos 2 letras.';
  if (limpo.length > 30) return 'Use no máximo 30 caracteres.';
  if (!/^\p{L}+(?:[ '’-]\p{L}+)*$/u.test(limpo)) return 'Use só letras (espaço, hífen e apóstrofo também valem).';
  if (temPalavrao(limpo)) return 'Esse nome não é permitido. Tente outro.';
  return '';
}

