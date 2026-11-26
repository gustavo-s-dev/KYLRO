/* ===========================
   KYLRO - Dashboard
   =========================== */

const user = { nome: "Pedro" };

/* ---------- Dados por período ---------- */
const periodos = {
  "1D": { valor: 9525, pct: 4.93, seed: 2 },
  "1S": { valor: 9310, pct: 7.8, seed: 5 },
  "1M": { valor: 8870, pct: -3.42, seed: 9 },
  "1A": { valor: 6120, pct: 55.64, seed: 14 },
};

/* ---------- Utilidades ---------- */
const brl = (n) => "R$ " + n.toLocaleString("pt-BR");

// Gera uma série suave e ondulada (determinística, baseada em seed)
function gerarSerie(seed, pontos = 14, tendencia = 1) {
  const serie = [];
  for (let i = 0; i < pontos; i++) {
    const t = i / (pontos - 1);
    const onda =
      Math.sin(i * 1.1 + seed) * 0.16 + Math.sin(i * 0.5 + seed * 2) * 0.1;
    const base = tendencia > 0 ? 0.15 + t * 0.65 : 0.8 - t * 0.55;
    serie.push(Math.min(0.95, Math.max(0.05, base + onda)));
  }
  return serie;
}

// Converte pontos em curva suave (Catmull-Rom -> Bézier)
function caminhoSuave(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function paraPontos(serie, w, h, margem) {
  return serie.map((v, i) => ({
    x: (i / (serie.length - 1)) * w,
    y: h - margem - v * (h - margem * 2),
  }));
}

/* ---------- Gráfico principal ---------- */
const W = 800,
  H = 300;
const mainLine = document.getElementById("mainLine");
const mainGlow = document.getElementById("mainGlow");
const mainArea = document.getElementById("mainArea");
const mainDot = document.getElementById("mainDot");

function desenharGraficoPrincipal(periodo) {
  const { seed, pct } = periodos[periodo];
  const serie = gerarSerie(seed, 14, pct >= 0 ? 1 : -1);
  const pts = paraPontos(serie, W, H, 30);
  const d = caminhoSuave(pts);

  mainLine.setAttribute("d", d);
  mainGlow.setAttribute("d", d);
  mainArea.setAttribute("d", `${d} L ${W} ${H} L 0 ${H} Z`);

  posicionarBolinha();
}

// Coloca a bolinha exatamente sobre a linha, na posição horizontal em que ela
// é desenhada (o centro fica um pouco antes da borda direita do gráfico).
function posicionarBolinha() {
  const largura = mainDot.parentElement.clientWidth;
  if (!largura) return;
  const alvoX = (mainDot.offsetLeft / largura) * W; // centro da bolinha em unidades do SVG

  // busca binária do ponto da curva com esse x (x cresce ao longo da linha)
  let ini = 0,
    fim = mainLine.getTotalLength(),
    ponto = mainLine.getPointAtLength(fim);
  for (let i = 0; i < 30; i++) {
    const meio = (ini + fim) / 2;
    ponto = mainLine.getPointAtLength(meio);
    if (ponto.x < alvoX) ini = meio;
    else fim = meio;
  }
  mainDot.style.top = (ponto.y / H) * 100 + "%";
}

window.addEventListener("resize", posicionarBolinha);

/* ---------- Saldo / Período ---------- */
const balanceValue = document.getElementById("balanceValue");
const balancePct = document.getElementById("balancePct");
const balanceVar = document.getElementById("balanceVariation");
const ranges = document.querySelectorAll(".range");

let periodoAtual = "1D";
let saldoVisivel = true;

function atualizarSaldo() {
  const { valor, pct } = periodos[periodoAtual];
  balanceValue.textContent = saldoVisivel ? brl(valor) : "R$ ••••••";

  const sinal = pct >= 0 ? "+" : "-";
  balancePct.textContent = `${sinal} ${Math.abs(pct).toFixed(2).replace(".", ",")}%`;

  balanceVar.classList.toggle("up", pct >= 0);
  balanceVar.classList.toggle("down", pct < 0);
  balanceVar.querySelector("svg").style.transform =
    pct >= 0 ? "none" : "rotate(90deg)";
}

ranges.forEach((btn) => {
  btn.addEventListener("click", () => {
    ranges.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    periodoAtual = btn.dataset.range;
    atualizarSaldo();
    desenharGraficoPrincipal(periodoAtual);
  });
});

/* ---------- Olho (mostrar/ocultar saldo) ---------- */
const eyeBtn = document.getElementById("toggleBalance");
const eyeOpen = document.getElementById("eyeOpen");
const eyeClosed = document.getElementById("eyeClosed");

eyeBtn.addEventListener("click", () => {
  saldoVisivel = !saldoVisivel;
  eyeOpen.classList.toggle("hidden", !saldoVisivel);
  eyeClosed.classList.toggle("hidden", saldoVisivel);
  atualizarSaldo();
});

/* ---------- Mini gráficos das moedas ---------- */
document.querySelectorAll(".spark").forEach((el) => {
  const w = 200,
    h = 76;
  const seed = Number(el.dataset.seed);
  const id = el.dataset.id;
  const serie = gerarSerie(seed, 12, 1);
  const pts = paraPontos(serie, w, h, 8);
  const d = caminhoSuave(pts);

  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="s-${id}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${el.dataset.from}"/>
          <stop offset="1" stop-color="${el.dataset.to}"/>
        </linearGradient>
        <linearGradient id="f-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${el.dataset.from}" stop-opacity=".35"/>
          <stop offset="1" stop-color="${el.dataset.from}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${d} L ${w} ${h} L 0 ${h} Z" fill="url(#f-${id})" stroke="none"/>
      <path d="${d}" fill="none" stroke="url(#s-${id})" stroke-width="4"
            stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
});

/* ---------- Menu lateral ---------- */
document.querySelectorAll(".menu .menu-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    // links reais (ex.: swap.html) navegam normalmente; só "#" é bloqueado
    if (item.getAttribute("href") === "#") e.preventDefault();
    document
      .querySelectorAll(".menu .menu-item")
      .forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
  });
});

/* ---------- Início ---------- */
document.getElementById("greeting").textContent =
  `Bem-vindo de volta, ${user.nome} !`;
atualizarSaldo();
desenharGraficoPrincipal(periodoAtual);

/* ---------- Botão Enviar ---------- */
document.getElementById("sendBtn").addEventListener("click", () => {
  window.location.href = "enviar.html";
});

/* ---------- Botão Receber ---------- */
document.getElementById("receiveBtn").addEventListener("click", () => {
  window.location.href = "receber.html";
});

/* ---------- Sair (barra lateral): mesma confirmação das Configurações ---------- */
const sairBtn = document.getElementById("sairBtn");
const modalSair = document.getElementById("modalSair");
const cancelarSair = document.getElementById("cancelarSair");
const confirmarSair = document.getElementById("confirmarSair");

function abrirModalSair() {
  modalSair.hidden = false;
  cancelarSair.focus();
}

function fecharModalSair() {
  modalSair.hidden = true;
  sairBtn.focus();
}

sairBtn.addEventListener("click", (e) => {
  e.preventDefault();
  abrirModalSair();
});
cancelarSair.addEventListener("click", fecharModalSair);

// clicar fora da caixa ou apertar Esc também cancela
modalSair.addEventListener("click", (e) => {
  if (e.target === modalSair) fecharModalSair();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalSair.hidden) fecharModalSair();
});

confirmarSair.addEventListener("click", () => {
  // simulação: encerra a sessão e recarrega o início
  confirmarSair.disabled = true;
  cancelarSair.disabled = true;
  confirmarSair.textContent = "Saindo...";
  setTimeout(() => window.location.reload(), 900);
});

/* ---------- Painéis do topo: notificações e conta ---------- */
const paineis = [
  { btn: document.getElementById("notifBtn"), painel: document.getElementById("popNotif") },
  { btn: document.getElementById("perfilBtn"), painel: document.getElementById("popPerfil") },
];

function fecharPaineis() {
  paineis.forEach(({ btn, painel }) => {
    painel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  });
}

paineis.forEach(({ btn, painel }) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const abrir = painel.hidden;
    fecharPaineis();
    if (abrir) {
      painel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      // o ponto vermelho some depois que as notificações são vistas
      if (btn.id === "notifBtn") document.getElementById("notifBadge").classList.add("lida");
    }
  });
});

// clicar fora ou apertar Esc fecha
document.addEventListener("click", (e) => {
  if (!e.target.closest(".pop")) fecharPaineis();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharPaineis();
});

// nome e inicial vêm do mesmo usuário da saudação
document.getElementById("popNome").textContent = user.nome;
document.getElementById("popAvatar").textContent = user.nome.charAt(0).toUpperCase();

// "Sair" do menu da conta abre a mesma confirmação
document.getElementById("popSair").addEventListener("click", () => {
  fecharPaineis();
  abrirModalSair();
});
