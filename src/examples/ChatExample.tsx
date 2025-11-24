/*
 * Copyright (c) 2024-2025 Datalayer, Inc.
 *
 * BSD 3-Clause License
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../components/ui/tooltip';
import { ChatComponent } from '../components/chat/ChatComponent';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Chat Example Component
 *
 * Demonstrates the ChatComponent with all necessary providers:
 * - QueryClientProvider for data fetching
 * - TooltipProvider for tooltip functionality
 */
const ChatExample: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen bg-background">
          <header className="border-b p-4">
            <h1 className="text-2xl font-bold">Chat Example</h1>
            <p className="text-sm text-muted-foreground">
              Interactive chat interface with AI assistance
            </p>
          </header>
          <main className="flex-1 overflow-hidden">
            <ChatComponent />
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default ChatExample;
