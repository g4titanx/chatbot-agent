import { getOnChainTools } from "@goat-sdk/adapter-eleven-labs";
import { coingecko } from "@goat-sdk/plugin-coingecko";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

export async function initializeTools(ethereum: Window['ethereum']) {
  if (!ethereum) {
    throw new Error('Ethereum provider not found');
  }

  try {
    const walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(ethereum)
    });

    const tools = await getOnChainTools({
      wallet: viem(walletClient),
      plugins: [
        coingecko({ 
          apiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY ?? "" 
        })
      ],
      options: {
        logTools: true,
      }
    });

    console.log('Tools initialized:', tools);
    return tools;
  } catch (error) {
    console.error('Error initializing tools:', error);
    throw error;
  }
}

export async function processToolCommand(
  tools: any,
  command: string,
): Promise<string> {
  console.log('Processing command:', command);
  console.log('Available tools:', tools);

  try {
    // Process the command using GOAT's built-in handlers
    const response = await tools.processMessage(command, {
      get_eth_balance: async () => {
        const accounts = await window.ethereum?.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No account connected');
        }
        const balance = await window.ethereum?.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest']
        });
        // Convert from wei to ETH
        const ethBalance = parseInt(balance, 16) / 1e18;
        return `Your ETH balance is ${ethBalance.toFixed(4)} ETH`;
      },
      get_token_price: async (params: { symbol: string }) => {
        try {
          const price = await tools.getTokenPrice(params.symbol);
          return `The price of ${params.symbol} is $${price}`;
        } catch (error) {
          throw new Error(`Failed to get price for ${params.symbol}`);
        }
      }
    });

    return response;
  } catch (error) {
    console.error('Error in processToolCommand:', error);
    throw error;
  }
}