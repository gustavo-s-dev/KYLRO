# KYLRO

Uma carteira de criptomoedas simulada, com cotações reais atualizadas ao vivo. Fiz o projeto com HTML, CSS e JavaScript puros, sem frameworks nem bibliotecas.

[Ver o site no ar](https://gustavo-s-dev.github.io/KYLRO/)

> [!IMPORTANT]
> Este é um projeto de portfólio e funciona como uma simulação. Saldo, quantidades, envios, recebimentos e trocas são fictícios: nenhuma transação financeira acontece e o site não pede nenhum dado real. Apenas as cotações são reais, vindas de APIs públicas. O nome digitado na entrada fica salvo só no navegador de quem acessa.

![Dashboard da KYLRO no computador](docs/prints/computador-inicio.png)

<table>
  <tr>
    <td align="center"><img src="docs/prints/celular-nome.png" width="190" alt="Tela que pergunta o nome antes de entrar"><br><sub>Entrada</sub></td>
    <td align="center"><img src="docs/prints/celular-inicio.png" width="190" alt="Dashboard no celular com saldo e gráfico"><br><sub>Início</sub></td>
    <td align="center"><img src="docs/prints/celular-carteira.png" width="190" alt="Carteira com valores em tempo real"><br><sub>Carteira</sub></td>
    <td align="center"><img src="docs/prints/celular-swap.png" width="190" alt="Swap com a lista de moedas para receber"><br><sub>Swap</sub></td>
  </tr>
</table>

## Funcionalidades

- Na primeira visita, o site pergunta o nome da pessoa e passa a usá-lo no painel. Qualquer nome é aceito, com acento, hífen ou apóstrofo; só palavrões são recusados, inclusive com letras repetidas ou separadas por espaço.
- O saldo e o gráfico da carteira acompanham o mercado segundo a segundo, com os períodos de 1 dia, 1 semana, 1 mês e 1 ano.
- Na Carteira, cada moeda mostra o valor em reais e a variação das últimas 24 horas, em verde quando subiu e em vermelho quando caiu.
- No Swap, o pagamento é feito com as moedas da carteira (BTC, SOL ou AAVE) e é possível receber USDT, ETH, XRP, POL, TRX, UNI ou outra moeda da carteira, pela cotação do momento.
- Também há telas de envio, recebimento (com QR code), atividade e configurações.

## Como funciona

**Cotações.** A fonte principal é a API da Binance. O site busca os preços uma vez e depois recebe as atualizações por WebSocket, cerca de uma por segundo. Se a conexão cair, ele tenta reconectar e, enquanto isso, consulta os preços a cada 5 segundos. Quando a Binance não responde (algumas redes e países bloqueiam o acesso), os dados vêm da CoinGecko, consultada a cada 30 segundos. Se nenhuma das duas responder, o site mostra valores de exemplo e indica que as cotações estão offline.

**Preços em reais.** BTC, SOL e USDT têm par em reais na Binance. Para as outras moedas, como a AAVE, uso o par em dólar (por exemplo, AAVE/USDT) e multiplico pela cotação do USDT em reais.

**Gráficos.** As curvas são desenhadas em SVG, sem biblioteca, com suavização Catmull-Rom convertida para curvas de Bézier. O gráfico principal soma, em cada ponto do período, o valor de todas as moedas da carteira.

**Responsividade.** São três layouts: no computador, com menu lateral; no tablet; e no celular, com uma barra de navegação fixa na parte de baixo, como em um aplicativo.

**Acessibilidade.** Os botões que só têm ícone recebem rótulos para leitores de tela, as janelas fecham com Esc e a animação de entrada é desativada para quem ativou a opção de reduzir movimento no aparelho.

## Tecnologias

- HTML5, CSS3 e JavaScript
- WebSocket e Fetch API
- APIs públicas da [Binance](https://developers.binance.com/docs/binance-spot-api-docs) e da [CoinGecko](https://docs.coingecko.com/)
- SVG para gráficos e ícones
- GitHub Pages, com publicação pelo GitHub Actions

## Estrutura

```
index.html          início: saldo, gráfico e moedas
carteira.html       ativos com valor em tempo real
swap.html           troca entre moedas
enviar.html · receber.html · atividade.html · configuracoes.html
css/                um arquivo de estilo por página
js/
  script.js         início: cotações, saldo e gráficos
  cotacoes.js       cotações ao vivo usadas pela carteira e pelo swap
  nome.js           tela do nome e filtro de palavrões
  splash.js         animação de entrada
  ...               um arquivo por página
img/                logos das moedas e ícones
docs/prints/        imagens deste README
```

## Como executar

O projeto não tem dependências. Basta abrir o `index.html` no navegador ou servir a pasta com um servidor estático:

```bash
git clone https://github.com/gustavo-s-dev/KYLRO.git
cd KYLRO
python -m http.server 8000   # depois abra http://localhost:8000
```

## Autor

Gustavo Silva · [github.com/gustavo-s-dev](https://github.com/gustavo-s-dev)
