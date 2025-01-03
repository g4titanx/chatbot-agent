# Blockchain Chat Interface
A web3-enabled chatbot for checking crypto balances, prices, and sending ETH.

[video]

## Features

- Wallet connection (MetaMask)
- Real-time ETH balance checking
- Live cryptocurrency prices via CoinGecko
- ETH sending functionality
- Support for ETH, BTC, SOL, USDT, USDC

Setup
```bash
# Install dependencies
pnpm install

# Add environment variables (.env.local)
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key

# Run development server
pnpm dev
```

## Requirements

MetaMask or compatible web3 wallet
CoinGecko API key (get from CoinGecko)

Commands
```bash
check balance   - View ETH balance
get price ETH   - Get market data
send 0x... 0.1  - Transfer ETH
```

## Built With
- Next.js
- GOAT SDK
- TypeScript
- Tailwind CSS