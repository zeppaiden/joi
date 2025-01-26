"use client";

import { Send } from "lucide-react";

interface ChatInputProps {
  inputMessage: string;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ChatInput({
  inputMessage,
  isLoading,
  onSubmit,
  onInputChange,
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t">
      <div className="flex space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={onInputChange}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
