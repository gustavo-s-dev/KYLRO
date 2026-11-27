/* ===========================
   KYLRO - Configurações
   =========================== */

/* ---------- Nome digitado na entrada do site (js/nome.js guarda em "kylroNome") ---------- */
try {
  const nome = localStorage.getItem('kylroNome');
  if (nome) document.getElementById('perfilNome').textContent = nome;
} catch (e) {}

/* ---------- Abrir / fechar cada opção (uma por vez, como um FAQ) ---------- */
const topos = document.querySelectorAll('.opcao-topo[aria-controls]');

function fechar(topo) {
  topo.setAttribute('aria-expanded', 'false');
  document.getElementById(topo.getAttribute('aria-controls')).hidden = true;
}

topos.forEach(topo => {
  topo.addEventListener('click', () => {
    const abrir = topo.getAttribute('aria-expanded') !== 'true';
    topos.forEach(fechar);
    if (abrir) {
      topo.setAttribute('aria-expanded', 'true');
      document.getElementById(topo.getAttribute('aria-controls')).hidden = false;
    }
  });
});

// abrir direto uma opção pelo link (ex.: configuracoes.html#perfil, vindo do menu da conta)
const alvo = location.hash &&
  document.querySelector('.opcao-topo[aria-controls="painel-' + location.hash.slice(1) + '"]');
if (alvo) alvo.click();

/* ---------- Sair: confirmação ---------- */
const btnSair      = document.getElementById('btnSair');
const modal        = document.getElementById('modalSair');
const cancelarSair = document.getElementById('cancelarSair');
const confirmarSair = document.getElementById('confirmarSair');

function abrirModal() {
  modal.hidden = false;
  cancelarSair.focus();
}

function fecharModal() {
  modal.hidden = true;
  btnSair.focus();
}

btnSair.addEventListener('click', abrirModal);
cancelarSair.addEventListener('click', fecharModal);

// clicar fora da caixa ou apertar Esc também cancela
modal.addEventListener('click', e => {
  if (e.target === modal) fecharModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) fecharModal();
});

confirmarSair.addEventListener('click', () => {
  // simulação: encerra a sessão (esquece o nome) e volta para o início, que pergunta o nome de novo
  try {
    localStorage.removeItem('kylroNome');
    sessionStorage.removeItem('kylroAberturaVista');
  } catch (e) {}
  confirmarSair.disabled = true;
  cancelarSair.disabled = true;
  confirmarSair.textContent = 'Saindo...';
  setTimeout(() => (window.location.href = 'index.html'), 900);
});
