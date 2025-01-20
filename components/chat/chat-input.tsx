'use client';

import { List, Send } from "lucide-react";

interface ChatInputProps {
  inputMessage: string;
  isLoading: boolean;
  showQuickResponses: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleQuickResponses: () => void;
}

export function ChatInput({
  inputMessage,
  isLoading,
  showQuickResponses,
  onSubmit,
  onInputChange,
  onToggleQuickResponses,
}: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-4 border-t border-gray-200"
    >
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={onToggleQuickResponses}
          className={`p-2 rounded-lg transition-colors ${showQuickResponses ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
        >
          <List className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={inputMessage}
          onChange={onInputChange}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
} 