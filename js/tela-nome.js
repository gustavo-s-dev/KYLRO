/* ===========================
   Tela "Como podemos te chamar?"
   Só aparece quando ainda não há nome salvo (o <head> marca o <html> com "kylro-nome").
   Só a pergunta, sem repetir a marca: depois do nome vem a entrada do KYLRO
   (js/splash.js) e então o dashboard.
   =========================== */

import * as Nome from "./core/nome.js?v=20261127e";
import { abrirEntrada } from "./splash.js?v=20261127e";

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
  Promise.race([fontes, new Promise((r) => setTimeout(r, 800))]).then(() => {
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
    const msg = Nome.validar(input.value);
    if (msg) {
      mostrarErro(msg);
      input.focus();
      return;
    }
    enviado = true;
    const nome = Nome.formatar(input.value);
    Nome.salvar(nome);
    window.dispatchEvent(new CustomEvent('kylro:nome', { detail: nome })); // dashboard já recebe o nome
    input.blur(); // fecha o teclado do celular

    // a pergunta sobe e se dissolve no mesmo roxo da entrada; em seguida a entrada do KYLRO começa
    tela.classList.add('confirmado');
    setTimeout(() => {
      tela.remove();
      html.classList.remove('kylro-nome');
      try { sessionStorage.setItem('kylroAberturaVista', '1'); } catch (err) {}
      abrirEntrada(150);
    }, 700);
  });
})();
