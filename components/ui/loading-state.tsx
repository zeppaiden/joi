import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center p-6 text-muted-foreground", className)}>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      {message}
    </div>
  );
} 