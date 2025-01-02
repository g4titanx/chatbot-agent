import { getOnChainTools } from "@goat-sdk/adapter-eleven-labs";
import { coingecko } from "@goat-sdk/plugin-coingecko";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';
import { analyzeMarketData } from './ai';

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
      const data = await handlers['get price data']('ETH');
      return `Wallet: ${ethBalance.toFixed(4)} ETH ($${(ethBalance * data.price).toFixed(2)})
24h Change: ${data.change.toFixed(2)}%`;
    },

    'get price data': async (symbol: string) => {
      const id = tokenIds[symbol];
      if (!id) throw new Error(`Unsupported token: ${symbol}`);
      
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`);
      const data = await response.json();
      
      return {
        price: data.market_data.current_price.usd,
        change: data.market_data.price_change_percentage_24h,
        marketCap: data.market_data.market_cap.usd,
        volume: data.market_data.total_volume.usd,
        supply: data.market_data.circulating_supply
      };
    },

    'get price': async (symbol: string) => {
      const data = await handlers['get price data'](symbol);
      const volume = (data.volume / 1e9).toFixed(2);
      const mcap = (data.marketCap / 1e9).toFixed(2);
      
      return `${symbol} Market Data:
Price: $${data.price.toLocaleString()}
24h Change: ${data.change.toFixed(2)}%
Volume: $${volume}B
Market Cap: $${mcap}B`;
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

  return `Available Commands:
- check balance - View your ETH balance
- get price <token> - Get market data (ETH/BTC/SOL/USDT/USDC)
- send <address> <amount> - Send ETH to address`;
}