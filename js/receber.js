/* ===========================
   KYLRO - Receber cripto
   =========================== */

// endereços de exemplo (simulados)
const ativos = {
  BTC: {
    nome: 'Bitcoin (BTC)',
    endereco: '0x7A3f9B2C8D1E6F4A5B0C9D7E3F2A8B6C1D4E5F90',
    logo: '<span class="ativo-logo logo-btc">₿</span>'
  },
  SOL: {
    nome: 'Solana (SOL)',
    endereco: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    logo: `<span class="ativo-logo"><svg viewBox="0 0 40 32"><defs><linearGradient id="solg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9945ff"/><stop offset="1" stop-color="#14f195"/></linearGradient></defs><path d="M8 2h28l-4 6H4z" fill="url(#solg)"/><path d="M4 13h28l4 6H8z" fill="url(#solg)"/><path d="M8 24h28l-4 6H4z" fill="url(#solg)"/></svg></span>`
  },
  AAVE: {
    nome: 'Aave (AAVE)',
    endereco: '0x4F2b8C1d9E7a3B5c6D0e1F8a2B9c7D3e5F6a1B04',
    logo: `<span class="ativo-logo"><svg viewBox="0 0 30 30"><path d="M30 15.0079C30 6.70866 23.2913 0 15.0079 0C6.72441 0 0 6.70866 0 15.0079C0 23.3071 6.70866 30.0157 15.0079 30.0157C23.3071 30.0157 30 23.2913 30 15.0079Z" fill="#9391F7"/><path d="M12.2047 15.7323C13.496 15.5276 14.3622 14.315 14.1574 13.0236C13.9527 11.7323 12.7401 10.8661 11.4488 11.0709C10.1574 11.2756 9.29128 12.4882 9.49601 13.7795C9.71648 15.0709 10.9291 15.937 12.2047 15.7323ZM18.3779 15.7323C19.6692 15.5276 20.5354 14.315 20.3307 13.0236C20.1259 11.7323 18.9133 10.8661 17.622 11.0709C16.3307 11.2756 15.4645 12.4882 15.6692 13.7795C15.874 15.0709 17.0866 15.937 18.3779 15.7323Z" fill="white"/><path d="M14.9134 3.66928C8.50398 3.66928 3.30713 8.96062 3.30713 15.4803H6.26776C6.26776 10.5827 10.1103 6.62991 14.8977 6.62991C19.7008 6.62991 23.5276 10.5984 23.5276 15.4803H26.4882C26.5197 8.96062 21.3229 3.66928 14.9134 3.66928Z" fill="white"/></svg></span>`
  },
  USDT: {
    nome: 'Tether (USDT)',
    endereco: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE8x4Pq',
    logo: `<span class="ativo-logo"><svg viewBox="0 0 40 40"><path d="M9 5h22l7 10-18 21L2 15z" fill="#50af95"/><path d="M11 11h18v4h-7v2.4c4.4.3 7.6 1.2 7.6 2.4s-3.2 2.1-7.6 2.4V30h-4v-7.8c-4.4-.3-7.6-1.2-7.6-2.4s3.2-2.1 7.6-2.4V15h-6z" fill="#fff"/></svg></span>`
  }
};

let ativoAtual = 'BTC';

/* ---------- Elementos ---------- */
const ativoBox    = document.getElementById('ativo');
const ativoBtn    = document.getElementById('ativoBtn');
const ativoNome   = document.getElementById('ativoNome');
const ativoLista  = document.getElementById('ativoLista');
const enderecoEl  = document.getElementById('endereco');
const copiarIcone = document.getElementById('copiarIcone');
const btnCopiar   = document.getElementById('btnCopiar');
const btnShare    = document.getElementById('btnCompartilhar');
const aviso       = document.getElementById('aviso');

/* ---------- Seletor de ativo ---------- */
function renderAtivo() {
  const a = ativos[ativoAtual];
  document.getElementById('ativoLogo').outerHTML =
    a.logo.replace('class="ativo-logo', 'id="ativoLogo" class="ativo-logo');
  ativoNome.textContent = a.nome;
  enderecoEl.textContent = a.endereco;
  enderecoEl.title = a.endereco;

  ativoLista.innerHTML = Object.entries(ativos)
    .map(([sigla, x]) =>
      `<li role="option" data-sigla="${sigla}" aria-selected="${sigla === ativoAtual}">${x.logo}<span>${x.nome}</span></li>`)
    .join('');
}

function abrirLista(abrir) {
  ativoLista.hidden = !abrir;
  ativoBox.classList.toggle('aberto', abrir);
  ativoBtn.setAttribute('aria-expanded', abrir);
}

ativoBtn.addEventListener('click', () => abrirLista(ativoLista.hidden));

ativoLista.addEventListener('click', e => {
  const li = e.target.closest('li');
  if (!li) return;
  ativoAtual = li.dataset.sigla;
  abrirLista(false);
  renderAtivo();
  mostrarAviso('');
});

document.addEventListener('click', e => {
  if (!ativoBox.contains(e.target)) abrirLista(false);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') abrirLista(false);
});

/* ---------- Copiar / Compartilhar ---------- */
let avisoTimer;
function mostrarAviso(texto) {
  aviso.textContent = texto;
  clearTimeout(avisoTimer);
  if (texto) avisoTimer = setTimeout(() => (aviso.textContent = ''), 2500);
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // alternativa para navegadores/arquivos sem acesso à área de transferência
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

async function copiarEndereco() {
  const ok = await copiar(ativos[ativoAtual].endereco);
  mostrarAviso(ok ? 'Endereço copiado!' : 'Não foi possível copiar o endereço.');

  if (ok) {
    const txt = btnCopiar.querySelector('.acao-txt');
    txt.textContent = 'Copiado!';
    setTimeout(() => (txt.textContent = 'Copiar endereço'), 1500);
  }
}

copiarIcone.addEventListener('click', copiarEndereco);
btnCopiar.addEventListener('click', copiarEndereco);

btnShare.addEventListener('click', async () => {
  const a = ativos[ativoAtual];
  const texto = `Meu endereço ${a.nome} na KYLRO: ${a.endereco}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Receber cripto - KYLRO', text: texto });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // usuário cancelou
    }
  }
  const ok = await copiar(texto);
  mostrarAviso(ok ? 'Compartilhamento indisponível: endereço copiado.' : 'Não foi possível compartilhar.');
});

/* ---------- Início ---------- */
renderAtivo();
