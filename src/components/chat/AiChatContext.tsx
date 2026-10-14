'use client';

import React, { createContext, useContext, useState } from 'react';

interface AiChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleChat: () => void;
}

const AiChatContext = createContext<AiChatContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggleChat: () => {},
});

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleChat = () => setIsOpen((prev) => !prev);

  return (
    <AiChatContext.Provider value={{ isOpen, setIsOpen, toggleChat }}>
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  return useContext(AiChatContext);
}
