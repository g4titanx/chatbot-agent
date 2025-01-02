"use client";

import { useState, useEffect } from 'react';
import { initializeTools, processToolCommand } from '@/lib/tools';

interface Message {
  content: string;
  role: 'user' | 'assistant';
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnection();
    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    return () => window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
  }, []);

  const checkConnection = async () => {
    if (!window.ethereum) return;
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    handleAccountsChanged(accounts as string[]);
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    setIsConnected(accounts.length > 0);
    if (accounts.length > 0) {
      const initializedTools = await initializeTools(window.ethereum);
      setTools(initializedTools);
      setMessages([{
        role: 'assistant',
        content: `Connected! Available commands: check balance - View your ETH balance, get price (some_token) - Get market data, send (address) (amount) - Send ETH`
      }]);
    } else {
      setTools(null);
      setMessages([]);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isConnected || !tools) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { content: input, role: 'user' }]);
    setInput('');

    try {
      const response = await processToolCommand(tools, input);
      setMessages(prev => [...prev, { 
        content: response.replace(/\n/g, '<br>'), 
        role: 'assistant' 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        content: error instanceof Error ? error.message : 'Error processing request',
        role: 'assistant'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-[600px] flex flex-col bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Crypto Assistant</h2>
        <button
          onClick={connectWallet}
          className={`px-4 py-2 rounded-lg ${
            isConnected ? 'bg-green-500' : 'bg-blue-500'
          } text-white`}
        >
          {isConnected ? 'Connected' : 'Connect Wallet'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
              dangerouslySetInnerHTML={{ __html: message.content }}
            />
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "Try 'get price ETH' for market analysis" : "Connect wallet first"}
            className="flex-1 p-2 border rounded-lg"
            disabled={!isConnected || isLoading}
          />
          <button
            type="submit"
            disabled={!isConnected || isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}