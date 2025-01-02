"use client";

import { useState, useEffect, useCallback } from 'react';
import { initializeTools, processToolCommand } from '@/lib/tools';
import type { ChatToolsConfig } from '@/lib/types';

interface Message {
  content: string;
  role: 'user' | 'assistant';
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tools, setTools] = useState<ChatToolsConfig | null>(null);

  const checkConnection = useCallback(async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      handleAccountsChanged(accounts);
    }
  }, []);

  const handleAccountsChanged = async (accounts: string[]) => {
    setIsConnected(accounts.length > 0);
    if (accounts.length > 0) {
      const tools = await initializeTools(window.ethereum);
      setTools(tools);
    } else {
      setTools(null);
    }
  };

  useEffect(() => {
    checkConnection();
    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [checkConnection]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }
  
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      console.error('Error connecting:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isConnected || !tools) return;
  
    setIsLoading(true);
    setMessages(prev => [...prev, { content: input, role: 'user' }]);
    setInput('');
  
    try {
      if (!tools) {
        console.log('Reinitializing tools...');
        const newTools = await initializeTools(window.ethereum);
        setTools(newTools);
      }
  
      console.log('Processing with tools:', tools);
      const response = await processToolCommand(tools, input);
      setMessages(prev => [...prev, { 
        content: response, 
        role: 'assistant' 
      }]);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setMessages(prev => [...prev, {
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure your wallet is connected and try again.`,
        role: 'assistant'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto h-[600px] flex flex-col bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Blockchain Chat</h2>
        {!isConnected ? (
          <button onClick={connectWallet} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
            Connect Wallet
          </button>
        ) : (
          <div className="text-sm text-gray-600">Connected ✓</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || !isConnected}
            placeholder={isConnected ? "Ask something..." : "Connect wallet first"}
            className="flex-1 p-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}