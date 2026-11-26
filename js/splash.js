/* ===========================
   KYLRO - Entrada ao abrir o site (uma vez por visita)
   =========================== */

(() => {
  const DURACAO = 3700; // tempo na tela antes de começar a sair (ms)
  const SAIDA = 800;    // duração da saída (ms)

  // a tela é montada uma única vez, invisível, quando a página carrega,
  // e só aparece na abertura do site (sem custo de montagem na hora de animar)
  const letras = [...'KYLRO']
    .map((l, i) => `<span style="--i:${i}">${l}</span>`)
    .join('');

  const tela = document.createElement('div');
  tela.className = 'splash';
  tela.hidden = true;
  tela.setAttribute('role', 'dialog');
  tela.setAttribute('aria-label', 'KYLRO: A liberdade financeira começa com você.');
  tela.innerHTML = `
    <div class="splash-brilho"></div>
    <div class="splash-conteudo">
      <div class="splash-marca" aria-hidden="true">${letras}</div>
      <span class="splash-linha"></span>
      <p class="splash-frase">A liberdade financeira começa com <strong>você</strong>.</p>
    </div>`;
  document.body.appendChild(tela);


  let estado = 'fechada'; // fechada | aberta | saindo
  let timerFechar, timerSaida;

  function fechar() {
    if (estado !== 'aberta') return;
    estado = 'saindo';
    clearTimeout(timerFechar);
    tela.classList.add('saindo');
    // na abertura do site, a cobertura roxa sai junto: a entrada se dissolve revelando a página
    document.documentElement.classList.remove('kylro-abertura');
    timerSaida = setTimeout(() => {
      tela.hidden = true;
      tela.classList.remove('ativa', 'saindo');
      estado = 'fechada';
    }, SAIDA);
  }

  // preparo: tempo extra (ms) desenhando quase transparente antes do primeiro movimento
  function abrir(preparo = 0) {
    if (estado !== 'fechada') return; // evita abrir duas vezes
    estado = 'aberta';
    clearTimeout(timerFechar);
    clearTimeout(timerSaida);
    tela.hidden = false;
    tela.classList.add('aquecendo');

    // espera dois quadros (desenhando tudo quase transparente): o navegador prepara as camadas
    // antes do primeiro movimento, e a animação já começa lisa
    const comecar = () => {
      tela.classList.remove('aquecendo');
      if (estado !== 'aberta') return; // fechada antes de começar
      tela.classList.add('ativa');
      timerFechar = setTimeout(fechar, DURACAO); // some sozinha; clique ou Esc pulam
    };
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (preparo) setTimeout(() => requestAnimationFrame(comecar), preparo);
      else comecar();
    }));
  }

  tela.addEventListener('click', fechar);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fechar();
  });


  /* ---------- Abertura do site (uma vez por visita) ---------- */
  if (document.documentElement.classList.contains('kylro-abertura')) {
    try { sessionStorage.setItem('kylroAberturaVista', '1'); } catch (e) {}

    // a animação só começa quando a página terminou de carregar e está ociosa
    // (fontes prontas, Dashboard montado por trás da cobertura): assim ela roda lisa do início ao fim.
    // A cobertura roxa já está na tela, então essa espera não aparece para o usuário.
    const fontes = document.fonts ? document.fonts.ready : Promise.resolve();
    const carregou = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(r => window.addEventListener('load', r, { once: true }));
    const ocioso = () => new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 500 }));
    const limite = new Promise(r => setTimeout(r, 2000)); // nunca espera mais que 2s
    Promise.race([Promise.all([fontes, carregou]).then(ocioso), limite]).then(() => abrir(300)); // na abertura, a cobertura esconde o preparo extra

    // segurança: se algo der errado, a cobertura nunca fica presa na tela
    setTimeout(() => {
      if (estado === 'fechada') document.documentElement.classList.remove('kylro-abertura');
    }, 8000);
  }
})();
