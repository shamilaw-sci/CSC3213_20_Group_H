export interface EmotionalIndicator {
  emotion: string;
  evidence: string;
  tentative?: boolean;
}

export interface DepressionIndicator {
  indicator: string;
  present: boolean;
  evidence: string;
}

export interface AiMessageMetadata {
  validatedRiskLevel?: "low" | "moderate" | "high";
  emotionalIndicators?: EmotionalIndicator[];
  depressionIndicators?: DepressionIndicator[];
  uncertaintyFlag?: boolean;
  detectedLanguage?: string;
  recommendPhq9?: boolean;
  followUpTopicsCovered?: string[];
}

export interface ChatMessage {
  id?: number;
  conversationId?: number;
  sender: "patient" | "bot";
  modality?: "text" | "voice";
  content: string;
  crisisFlag?: boolean;
  aiMetadata?: AiMessageMetadata | null;
  createdAt?: string;
}

export interface CrisisContact {
  name: string;
  number: string;
  availability: string;
}

export interface CrisisResources {
  disclaimer: string;
  contacts: CrisisContact[];
}

export interface RiskAssessmentSummary {
  id: number;
  validatedRiskLevel: "low" | "moderate" | "high";
  aiSuggestedLevel?: "low" | "moderate" | "high" | null;
  reasons: string[];
  emotionalIndicators: EmotionalIndicator[];
  depressionIndicators: DepressionIndicator[];
  uncertaintyFlag: boolean;
  deterministicOverride: boolean;
  recommendPhq9?: boolean;
  detectedLanguage?: string;
}

export interface Phq9Question {
  number: number;
  key: string;
  text: string;
  si: string;
}

export interface Phq9Option {
  value: number;
  label: string;
  si: string;
}

export interface Phq9HistoryItem {
  id: number;
  conversationId?: number | null;
  totalScore: number | null;
  severityBand: string | null;
  q9Score: number | null;
  q9SafetyTriggered: boolean;
  status: string;
  createdAt: string;
  completedAt?: string | null;
}
