export interface ChatToolsConfig {
  getBalance: () => Promise<string>;
  getTokenPrice: (symbol: string) => Promise<number>;
}

export interface ToolCommand {
  balance: () => Promise<string>;
  price: (symbol: string) => Promise<string>;
}