'use client';

import React, { useCallback } from "react";
import { MessageSquare, X, Bot } from "lucide-react";
import { useDebouncedCallback } from 'use-debounce';
import { Message, QuickResponse } from "./types";
import { MessageBubble } from "./message-bubble";
import { QuickResponsesPanel } from "./quick-responses-panel";
import { ChatInput } from "./chat-input";

const quickResponses: QuickResponse[] = [
  {
    id: "1",
    category: "Greetings",
    title: "Welcome",
    content: "Hello! Thank you for reaching out. How can I assist you today?",
  },
  {
    id: "2",
    category: "Greetings",
    title: "Goodbye",
    content: "Thank you for contacting us. Have a great day!",
  },
  {
    id: "3",
    category: "Technical",
    title: "Reset Password",
    content:
      'To reset your password, please click on the "Forgot Password" link on the login page. You will receive an email with instructions.',
  },
  {
    id: "4",
    category: "Technical",
    title: "Account Access",
    content:
      "I understand you're having trouble accessing your account. Let me help you with that. Could you please verify your email address?",
  },
  {
    id: "5",
    category: "Billing",
    title: "Refund Process",
    content:
      "I understand you'd like to request a refund. Our refund process typically takes 3-5 business days to complete once initiated.",
  },
  {
    id: "6",
    category: "Billing",
    title: "Payment Failed",
    content:
      "I see your payment wasn't processed. This usually happens due to insufficient funds or expired card details. Would you like to try another payment method?",
  },
];

const categories = Array.from(new Set(quickResponses.map(r => r.category)));

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
  const [showQuickResponses, setShowQuickResponses] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleQuickResponse = useCallback((response: QuickResponse) => {
    setInputMessage(response.content);
    setShowQuickResponses(false);
    setSelectedCategory(null);
  }, []);

  const debouncedScroll = useDebouncedCallback(
    () => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    },
    100
  );

  const memoizedDebouncedScroll = useCallback(debouncedScroll, [debouncedScroll]);

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
        <div className="bg-white rounded-lg shadow-xl w-96 flex flex-col border border-gray-200 transition-all duration-300 ease-in-out">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-blue-600 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-white" />
              <span className="text-white font-medium">Support Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Bot className="w-8 h-8 p-1.5 bg-gray-100 rounded-full" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {showQuickResponses && (
            <QuickResponsesPanel
              categories={categories}
              selectedCategory={selectedCategory}
              quickResponses={quickResponses}
              onSelectCategory={setSelectedCategory}
              onBack={() => setSelectedCategory(null)}
              onSelectResponse={handleQuickResponse}
            />
          )}
          <ChatInput
            inputMessage={inputMessage}
            isLoading={isLoading}
            showQuickResponses={showQuickResponses}
            onSubmit={handleSubmit}
            onInputChange={(e) => setInputMessage(e.target.value)}
            onToggleQuickResponses={() => setShowQuickResponses(!showQuickResponses)}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
} 