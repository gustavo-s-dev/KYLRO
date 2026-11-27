/* ===========================
   KYLRO - Entrada ao abrir o site (uma vez por visita)
   =========================== */

const DURACAO = 2300; // tempo na tela antes de começar a sair (ms): a animação termina em ~1,7 s
const SAIDA = 600;    // duração da saída (ms)

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
// sem nome salvo, quem abre a entrada é a tela do nome, depois que a pessoa entra
const esperandoNome = document.documentElement.classList.contains('kylro-nome');

if (document.documentElement.classList.contains('kylro-abertura') && !esperandoNome) {
  try { sessionStorage.setItem('kylroAberturaVista', '1'); } catch (e) {}

  // a animação começa assim que as fontes estão prontas (sem elas, as letras trocariam no meio).
  // Não espera imagens nem cotações: o dashboard termina de montar por trás da cobertura roxa.
  const fontes = document.fonts ? document.fonts.ready : Promise.resolve();
  const limite = new Promise(r => setTimeout(r, 1000)); // nunca espera mais que 1 s
  Promise.race([fontes, limite]).then(() => abrir(100));

  // segurança: se algo der errado, a cobertura nunca fica presa na tela
  setTimeout(() => {
    if (estado === 'fechada') document.documentElement.classList.remove('kylro-abertura');
  }, 6000);
}

// a tela do nome (js/tela-nome.js) abre a entrada depois que a pessoa digita o nome
export { abrir as abrirEntrada };
