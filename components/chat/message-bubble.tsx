"use client";

import { memo } from "react";
import { Bot, User } from "lucide-react";
import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <div className="break-words">{message.content}</div>
        <div
          className={cn(
            "text-xs mt-1",
            isUser
              ? "text-primary-foreground/80"
              : "text-muted-foreground"
          )}
        >
          {format(message.createdAt, 'HH:mm')}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";
