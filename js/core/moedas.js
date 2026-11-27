/* ===========================
   KYLRO - Catálogo de moedas
   Tudo o que as telas precisam saber sobre cada moeda fica aqui, num lugar só.
   =========================== */

/*
  casas      casas decimais ao mostrar quantidades
  logo       arquivo em img/ (todos encaixados numa caixa quadrada, sem distorcer)
  claro      logo escuro: ganha um círculo claro atrás para aparecer no fundo roxo
  cor        cor do nome e do degradê do minigráfico no início
  taxa       taxa de rede simulada, cobrada na própria moeda ao enviar
  deposito   quantidade creditada pelo botão "Simular recebimento"
  endereco   endereço de recebimento de exemplo (fictício)
*/
export const MOEDAS = {
  btc: {
    nome: 'Bitcoin', simbolo: 'BTC', casas: 8, logo: 'img/bitcoin.svg',
    cor: { texto: '#f5922a', de: '#d9640b', ate: '#ffb23d' },
    taxa: 0.00002, deposito: 0.001,
    endereco: 'bc1qk7ylr0w4mz9tq6sv3jxhc8n2dfa5pe0u4gtw7m'
  },
  sol: {
    nome: 'Solana', simbolo: 'SOL', casas: 4, logo: 'img/solana.svg',
    cor: { texto: '#ad84ff', de: '#9d5cff', ate: '#19e6a1' },
    taxa: 0.000005, deposito: 0.5,
    endereco: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
  },
  aave: {
    nome: 'Aave', simbolo: 'AAVE', casas: 4, logo: 'img/aave.svg',
    cor: { texto: '#b6a6ff', de: '#c0509c', ate: '#33c7c7' },
    taxa: 0.0015, deposito: 0.2,
    endereco: '0x4F2b8C1d9E7a3B5c6D0e1F8a2B9c7D3e5F6a1B04'
  },
  usdt: {
    nome: 'Tether', simbolo: 'USDT', casas: 2, logo: 'img/usdt.svg',
    cor: { texto: '#5fd3ab', de: '#26a17b', ate: '#6ff0c4' },
    taxa: 1, deposito: 20,
    endereco: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
  },
  eth: {
    nome: 'Ethereum', simbolo: 'ETH', casas: 6, logo: 'img/eth.svg', claro: true,
    cor: { texto: '#a9b8ff', de: '#627eea', ate: '#b3c1ff' },
    taxa: 0.0004, deposito: 0.01,
    endereco: '0x7A3f9B2C8D1E6F4A5B0C9D7E3F2A8B6C1D4E5F90'
  },
  xrp: {
    nome: 'XRP', simbolo: 'XRP', casas: 2, logo: 'img/xrp.svg', claro: true,
    cor: { texto: '#c9d4df', de: '#7d8b99', ate: '#dfe7ef' },
    taxa: 0.00001, deposito: 20,
    endereco: 'rKyLRoWq9XbT2mZp8VdN4sJc7HfG5eRu1A'
  },
  pol: {
    nome: 'Polygon', simbolo: 'POL', casas: 2, logo: 'img/polygon.svg',
    cor: { texto: '#b18cff', de: '#7b3fe4', ate: '#c3a4ff' },
    taxa: 0.01, deposito: 200,
    endereco: '0x9c1E4b7A2d8F3e6C5a5B1d9E7f2A4c8B6e3D1F17'
  },
  trx: {
    nome: 'Tron', simbolo: 'TRX', casas: 2, logo: 'img/tron.svg',
    cor: { texto: '#ff8a8c', de: '#e0262a', ate: '#ff9a9c' },
    taxa: 1.1, deposito: 100,
    endereco: 'TKyLRwm9XbT2zPq8VdN4sJc7HfG5eRu1Ad'
  },
  uni: {
    nome: 'Uniswap', simbolo: 'UNI', casas: 4, logo: 'img/uniswap.svg',
    cor: { texto: '#ff7ac0', de: '#e5007a', ate: '#ff9fd2' },
    taxa: 0.2, deposito: 5,
    endereco: '0x2B5e8D1c7A4f9E3b6C2d2A8F5e1B7c4D9a6E3F08'
  }
};

export const IDS = Object.keys(MOEDAS);

// <img> do logo, sempre na mesma caixa quadrada
export function logoHTML(m, classe = '') {
  const c = MOEDAS[m];
  return `<img class="logo-moeda${c.claro ? ' logo-claro' : ''}${classe ? ' ' + classe : ''}" src="${c.logo}" alt="" width="30" height="30">`;
}
