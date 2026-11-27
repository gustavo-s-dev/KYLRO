/* ===========================
   KYLRO - Barra de navegação do celular nas páginas internas
   Monta a mesma barra do início (Início, Swap, Atividade, Carteira, Ajustes) e
   marca a página atual. Os estilos ficam em css/navegacao.css (só aparece até 700px).
   =========================== */

const ITENS = [
  { href: 'index.html', nome: 'Início', icone: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>' },
  { href: 'swap.html', nome: 'Swap', icone: '<path d="M3 8h16"/><path d="M15 4l4 4-4 4"/><path d="M21 16H5"/><path d="M9 12l-4 4 4 4"/>' },
  { href: 'atividade.html', nome: 'Atividade', icone: '<path d="M6 18L18 6"/><path d="M8 6h10v10"/>' },
  { href: 'carteira.html', nome: 'Carteira', icone: '<path d="M4 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M4 12h5v4H4"/>' },
  {
    href: 'configuracoes.html', nome: 'Ajustes',
    icone: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  },
];

// Enviar e Receber são ações do Início: a barra marca o Início nessas páginas
const PAI = { 'enviar.html': 'index.html', 'receber.html': 'index.html' };

const pagina = location.pathname.split('/').pop() || 'index.html';
const atual = PAI[pagina] || pagina;

const nav = document.createElement('nav');
nav.className = 'nav-app';
nav.setAttribute('aria-label', 'Navegação principal');
nav.innerHTML = ITENS.map((i) => `
  <a href="${i.href}"${i.href === atual ? ' aria-current="page"' : ''}>
    <svg viewBox="0 0 24 24" aria-hidden="true">${i.icone}</svg>
    <span>${i.nome}</span>
  </a>`).join('');
document.body.appendChild(nav);
