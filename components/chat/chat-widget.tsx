"use client";

import React, { useCallback } from "react";
import { MessageSquare, X, Bot } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { Message } from "./types";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";

export function ChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: "Hello! How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const debouncedScroll = useDebouncedCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, 100);

  const memoizedDebouncedScroll = useCallback(debouncedScroll, [
    debouncedScroll,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content:
          "Thank you for your message. I'm here to help! This is a simulated response.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  React.useEffect(() => {
    memoizedDebouncedScroll();
  }, [messages, memoizedDebouncedScroll]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-background rounded-lg shadow-xl w-96 flex flex-col border transition-all duration-300 ease-in-out">
          <div className="p-4 border-b flex justify-between items-center bg-primary rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-primary-foreground" />
              <span className="text-primary-foreground font-medium">
                AI Assistant
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:text-primary-foreground/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Bot className="w-8 h-8 p-1.5 bg-muted rounded-full" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <ChatInput
            inputMessage={inputMessage}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onInputChange={(e) => setInputMessage(e.target.value)}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
