"use client";

import { memo } from "react";
import { Bot, User } from "lucide-react";
import { Message } from "./types";

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(({ message }: MessageBubbleProps) => (
  <div
    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`flex items-start space-x-2 max-w-[80%] ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === "user" ? "bg-secondary" : "bg-muted"}`}
      >
        {message.type === "user" ? (
          <User className="w-5 h-5" />
        ) : (
          <Bot className="w-8 h-8 p-1.5" />
        )}
      </div>
      <div
        className={`rounded-lg p-3 ${message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
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
));

MessageBubble.displayName = "MessageBubble";
