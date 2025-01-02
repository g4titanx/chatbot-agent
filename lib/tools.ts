import { getOnChainTools } from "@goat-sdk/adapter-eleven-labs";
import { coingecko } from "@goat-sdk/plugin-coingecko";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

export async function initializeTools(ethereum: Window['ethereum']) {
  if (!ethereum) throw new Error('Ethereum provider not found');

  const walletClient = createWalletClient({
    chain: mainnet,
    transport: custom(ethereum)
  });

  return await getOnChainTools({
    wallet: viem(walletClient),
    plugins: [coingecko({ apiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY ?? "" })],
    options: { logTools: true }
  });
}

const tokenIds: Record<string, string> = {
 'ETH': 'ethereum',
 'BTC': 'bitcoin',
 'SOL': 'solana',
 'USDT': 'tether',
 'USDC': 'usd-coin'
};

export async function processToolCommand(tools: any, command: string) {
 const handlers = {
   'check balance': async () => {
     const accounts = await window.ethereum?.request({ method: 'eth_accounts' });
     if (!accounts?.length) throw new Error('No account connected');
     const balance = await window.ethereum?.request({
       method: 'eth_getBalance',
       params: [accounts[0], 'latest']
     });
     const ethBalance = parseInt(balance as string, 16) / 1e18;
     const usdPrice = await handlers['get price data']('ETH');
     const usdValue = ethBalance * usdPrice;
     return `Your wallet holds ${ethBalance.toFixed(4)} ETH (≈$${usdValue.toLocaleString()})`;
   },

   'get price data': async (symbol: string): Promise<number> => {
     const id = tokenIds[symbol];
     if (!id) throw new Error(`Unsupported token: ${symbol}`);
     
     const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false&sparkline=false`);
     const data = await response.json();
     return data.market_data.current_price.usd;
   },

   'get price': async (symbol: string) => {
     const id = tokenIds[symbol];
     if (!id) throw new Error(`Unsupported token: ${symbol}`);

     const data = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`).then(r => r.json());
     const price = data.market_data.current_price.usd;
     const priceChange = data.market_data.price_change_percentage_24h;
     const marketCap = data.market_data.market_cap.usd;
     const volume = data.market_data.total_volume.usd;

     const sentiment = priceChange > 5 ? "strongly bullish" : 
                      priceChange > 2 ? "bullish" :
                      priceChange < -5 ? "strongly bearish" :
                      priceChange < -2 ? "bearish" : "neutral";

     return `${symbol} Analysis:
Price: $${price.toLocaleString()}
24h Change: ${priceChange.toFixed(2)}% (${sentiment})
Market Cap: $${(marketCap/1e9).toFixed(2)}B
24h Volume: $${(volume/1e9).toFixed(2)}B

${getMarketSentiment(symbol, priceChange, volume/marketCap)}`;
   },

   'send': async (to: string, amount: string) => {
     const accounts = await window.ethereum?.request({ method: 'eth_accounts' });
     if (!accounts?.length) throw new Error('No wallet connected');
     
     const weiAmount = (parseFloat(amount) * 1e18).toString(16);
     const tx = await window.ethereum?.request({
       method: 'eth_sendTransaction',
       params: [{
         from: accounts[0],
         to,
         value: `0x${weiAmount}`
       }]
     });
     
     return `Transaction sent! Hash: ${tx}`;
   }
 };

 const text = command.toLowerCase();
 if (text.includes('balance')) return await handlers['check balance']();
 if (text.includes('price')) {
   const tokens = text.toUpperCase().split(' ');
   const lastToken = tokens[tokens.length - 1];
   return await handlers['get price'](lastToken);
 }
 if (text.startsWith('send')) {
   const [_, to, amount] = text.split(' ');
   return await handlers['send'](to, amount);
 }

 return `Available commands:
- 'check balance': View your ETH balance
- 'get price <token>': Get detailed market analysis (ETH, BTC, SOL, USDT, USDC)
- 'send <address> <amount>': Send ETH to an address`;
}

function getMarketSentiment(symbol: string, priceChange: number, volumeToMcap: number): string {
 const insights = [];
 
 if (priceChange > 5) {
   insights.push(`${symbol} is showing strong upward momentum`);
 } else if (priceChange < -5) {
   insights.push(`${symbol} is experiencing significant selling pressure`);
 }

 if (volumeToMcap > 0.2) {
   insights.push("High trading volume indicates strong market interest");
 }

 insights.push(priceChange > 0 
   ? "Consider DCA (Dollar Cost Averaging) to manage volatility"
   : "Current dip might present buying opportunities for long-term holders");

 return insights.join(". ");
}