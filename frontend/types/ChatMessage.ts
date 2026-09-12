export interface ChatMessage {
  id?: number;
  sender: "patient" | "bot";
  content: string;
  crisisFlag?: boolean;
  createdAt?: string;
}
