export interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

export interface QuickResponse {
  id: string;
  category: string;
  title: string;
  content: string;
} 