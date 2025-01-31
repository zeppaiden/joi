"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ChatWidget() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link href="/protected/chat">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
