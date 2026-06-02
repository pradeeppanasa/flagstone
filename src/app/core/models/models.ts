export interface AgentRequest {
  user_id: string;
  agent_id: string;
  message: string;
  session_id: string;
}

export interface AgentResponse {
  response: string;
  session_id: string;
}

export interface BankEvent {
  bank_name: string;
  event_type: string;
  impact_level: 'unknown' | 'low' | 'medium' | 'high' | 'critical';
  affected_products: string[];
  summary: string;
  business_impact: string;
  recommended_action: string;
  source_type: 'internal' | 'external' | 'third_party' | 'vendor' | 'media' | 'unknown';
  source_reference: string;
  confidence_score: number;
}

export interface OnboardingCase {
  entity_name: string;
  onboarding_status: 'in_progress' | 'pending_documents' | 'pending_review' | 'approved' | 'escalated' | 'rejected';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  missing_documents: string[];
  ubo_identified: boolean;
  sanctions_cleared: boolean;
  jfsc_compliant: boolean;
  summary: string;
  recommended_action: string;
  confidence_score: number;
}

export interface FXAlert {
  currency_pair: string;
  quoted_rate: number;
  market_mid_rate: number;
  spread_pct: number;
  event_type: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  competitiveness: 'competitive' | 'acceptable' | 'uncompetitive' | 'critical';
  summary: string;
  recommended_action: string;
  notify: string[];
  confidence_score: number;
}

export interface RegulatoryAlert {
  regulator: string;
  jurisdiction: string;
  event_type: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'immediate' | 'urgent' | 'planned' | 'monitor';
  affected_products: string[];
  summary: string;
  compliance_deadline: string;
  recommended_action: string;
  notify: string[];
  source_reference: string;
  confidence_score: number;
}

export interface ContractAlert {
  bank_name: string;
  contract_type: string;
  change_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_clause: string;
  change_summary: string;
  commercial_impact: string;
  client_impact: boolean;
  recommended_action: string;
  route_to: 'legal' | 'commercial' | 'operations' | 'compliance' | 'monitor';
  source_reference: string;
  confidence_score: number;
}

export interface SettlementAlert {
  exception_id: string;
  exception_type: string;
  currency_pair: string;
  amount: number;
  base_currency: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  timeline: string;
  resolution_attempted: string;
  resolution_status: 'resolved' | 'in_progress' | 'escalated' | 'pending';
  recommended_action: string;
  escalate_to: string[];
  confidence_score: number;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  agentType?: string;
}
