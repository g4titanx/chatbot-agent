import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

export function getWalletClient() {
  // Check if MetaMask is installed
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  return createWalletClient({
    chain: mainnet,
    transport: custom(window.ethereum)
  });
}