/* ===========================
   KYLRO - Nome do usuário
   Pergunta o nome antes de entrar no site (só na primeira vez neste aparelho;
   "Sair" apaga e pergunta de novo). Aceita qualquer nome; bloqueia só palavrões.
   =========================== */

const KylroNome = (() => {
  const CHAVE = 'kylroNome';

  const ler = () => {
    try { return localStorage.getItem(CHAVE) || ''; } catch (e) { return ''; }
  };
  const salvar = (nome) => {
    try { localStorage.setItem(CHAVE, nome); } catch (e) {}
  };
  // usado pelo "Sair": esquece o nome e mostra a entrada de novo
  const apagar = () => {
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

  function formatar(nome) {
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
  function validar(nome) {
    const limpo = nome.trim().replace(/\s+/g, ' ');
    if ((limpo.match(/\p{L}/gu) || []).length < 2) return 'Digite pelo menos 2 letras.';
    if (limpo.length > 30) return 'Use no máximo 30 caracteres.';
    if (!/^\p{L}+(?:[ '’-]\p{L}+)*$/u.test(limpo)) return 'Use só letras (espaço, hífen e apóstrofo também valem).';
    if (temPalavrao(limpo)) return 'Esse nome não é permitido. Tente outro.';
    return '';
  }

  return { ler, salvar, apagar, validar, formatar };
})();


/* ===========================
   Tela "Como podemos te chamar?"
   Só aparece quando ainda não há nome salvo (o <head> marca o <html> com "kylro-nome").
   Só a pergunta, sem repetir a marca: depois do nome vem a entrada do KYLRO
   (js/splash.js) e então o dashboard.
   =========================== */
(() => {
  const html = document.documentElement;
  if (!html.classList.contains('kylro-nome')) return;

  const tela = document.createElement('div');
  tela.className = 'nome-tela';
  tela.setAttribute('role', 'dialog');
  tela.setAttribute('aria-modal', 'true');
  tela.setAttribute('aria-labelledby', 'nomeTitulo');
  tela.innerHTML = `
    <div class="nome-brilho" aria-hidden="true"></div>
    <form class="nome-caixa" id="nomeForm" novalidate>
      <h1 class="nome-titulo" id="nomeTitulo">
        <span class="nome-ola">Olá,</span>
        <span class="nome-pergunta">como podemos <em>te chamar?</em></span>
      </h1>
      <div class="nome-campo">
        <label class="nome-rotulo" for="nomeInput">Seu nome</label>
        <input class="nome-input" id="nomeInput" type="text" name="nome" placeholder="Seu nome"
               maxlength="30" autocomplete="given-name" autocapitalize="words" spellcheck="false"
               enterkeyhint="go" aria-describedby="nomeErro">
      </div>
      <p class="nome-erro" id="nomeErro" aria-live="polite"></p>
      <button class="nome-btn" type="submit" disabled>
        Entrar
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
      </button>
    </form>`;
  document.body.appendChild(tela);

  const form = tela.querySelector('#nomeForm');
  const input = tela.querySelector('#nomeInput');
  const erro = tela.querySelector('#nomeErro');
  const botao = tela.querySelector('.nome-btn');

  // entra animada depois de as fontes carregarem, para não trocar de letra no meio
  const fontes = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontes, new Promise((r) => setTimeout(r, 1200))]).then(() => {
    requestAnimationFrame(() => tela.classList.add('ativa'));
    setTimeout(() => input.focus({ preventScroll: true }), 700);
  });

  function mostrarErro(msg) {
    erro.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    tela.classList.toggle('com-erro', !!msg);
    if (msg) {
      form.classList.remove('treme');
      void form.offsetWidth; // reinicia a animação
      form.classList.add('treme');
    }
  }

  input.addEventListener('input', () => {
    botao.disabled = !input.value.trim();
    if (erro.textContent) mostrarErro('');
  });

  let enviado = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (enviado) return;
    const msg = KylroNome.validar(input.value);
    if (msg) {
      mostrarErro(msg);
      input.focus();
      return;
    }
    enviado = true;
    const nome = KylroNome.formatar(input.value);
    KylroNome.salvar(nome);
    window.dispatchEvent(new CustomEvent('kylro:nome', { detail: nome })); // dashboard já recebe o nome
    input.blur(); // fecha o teclado do celular

    // a pergunta sobe e se dissolve no mesmo roxo da entrada; em seguida a entrada do KYLRO começa
    tela.classList.add('confirmado');
    setTimeout(() => {
      tela.remove();
      html.classList.remove('kylro-nome');
      if (window.KylroEntrada) window.KylroEntrada.abrir(150);
      else html.classList.remove('kylro-abertura'); // segurança: nunca prende a tela
    }, 700);
  });
})();
