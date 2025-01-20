import React, { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  List,
  ChevronRight,
} from "lucide-react";
interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}
interface QuickResponse {
  id: string;
  category: string;
  title: string;
  content: string;
}
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
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: "Hello! How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickResponses, setShowQuickResponses] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const categories = Array.from(new Set(quickResponses.map((r) => r.category)));
  const handleQuickResponse = (response: QuickResponse) => {
    setInputMessage(response.content);
    setShowQuickResponses(false);
    setSelectedCategory(null);
  };
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
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
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
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[80%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === "user" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                  >
                    {message.type === "user" ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-3 ${message.type === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
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
            <div className="absolute bottom-[72px] left-0 right-0 bg-white border-t border-gray-200 rounded-t-lg shadow-lg max-h-72 overflow-y-auto">
              <div className="p-2">
                {!selectedCategory ? (
                  <div className="space-y-1">
                    <h3 className="px-2 py-1 text-sm font-medium text-gray-500">
                      Quick Responses
                    </h3>
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className="w-full px-2 py-2 text-left text-sm hover:bg-gray-50 rounded-lg flex items-center justify-between group"
                      >
                        <span>{category}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center px-2 py-1">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        ← Back
                      </button>
                      <h3 className="ml-2 text-sm font-medium text-gray-500">
                        {selectedCategory}
                      </h3>
                    </div>
                    {quickResponses
                      .filter((r) => r.category === selectedCategory)
                      .map((response) => (
                        <button
                          key={response.id}
                          onClick={() => handleQuickResponse(response)}
                          className="w-full px-2 py-2 text-left text-sm hover:bg-gray-50 rounded-lg"
                        >
                          <div className="font-medium">{response.title}</div>
                          <div className="text-gray-500 truncate">
                            {response.content}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-gray-200"
          >
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowQuickResponses(!showQuickResponses)}
                className={`p-2 rounded-lg transition-colors ${showQuickResponses ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
              >
                <List className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
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
