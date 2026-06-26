// Transaction types
export enum TransactionType {
  Transfer = "transfer",
  Payment = "payment",
  CashIn = "cash_in",
  CashOut = "cash_out",
  Settlement = "settlement",
  Refund = "refund",
}

// Transaction status
export enum TransactionStatus {
  Completed = "completed",
  Failed = "failed",
  Pending = "pending",
  Reversed = "reversed",
}

// Language codes
export enum Language {
  EN = "en",
  BN = "bn",
  Mixed = "mixed",
}

// Complaint channel
export enum Channel {
  InAppChat = "in_app_chat",
  CallCenter = "call_center",
  Email = "email",
  MerchantPortal = "merchant_portal",
  FieldAgent = "field_agent",
}

// User type
export enum UserType {
  Customer = "customer",
  Merchant = "merchant",
  Agent = "agent",
  Unknown = "unknown",
}

// Evidence verdict
export enum EvidenceVerdict {
  Consistent = "consistent",
  Inconsistent = "inconsistent",
  InsufficientData = "insufficient_data",
}

// Case type categories
export enum CaseType {
  WrongTransfer = "wrong_transfer",
  PaymentFailed = "payment_failed",
  RefundRequest = "refund_request",
  DuplicatePayment = "duplicate_payment",
  MerchantSettlementDelay = "merchant_settlement_delay",
  AgentCashInIssue = "agent_cash_in_issue",
  PhishingOrSocialEngineering = "phishing_or_social_engineering",
  Other = "other",
}

// Severity levels
export enum Severity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

// Department routing
export enum Department {
  CustomerSupport = "customer_support",
  DisputeResolution = "dispute_resolution",
  PaymentsOps = "payments_ops",
  MerchantOperations = "merchant_operations",
  AgentOperations = "agent_operations",
  FraudRisk = "fraud_risk",
}

// Transaction history entry
export interface Transaction {
  transaction_id: string;
  timestamp: string; // ISO 8601
  type: TransactionType;
  amount: number;
  counterparty: string;
  status: TransactionStatus;
}

// Request schema (input)
export interface TicketRequest {
  ticket_id: string;
  complaint: string;
  language?: Language;
  channel?: Channel;
  user_type?: UserType;
  campaign_context?: string;
  transaction_history?: Transaction[];
  metadata?: Record<string, any>;
}

// Response schema (output)
export interface TicketResponse {
  ticket_id: string;
  relevant_transaction_id: string | null;
  evidence_verdict: EvidenceVerdict;
  case_type: CaseType;
  severity: Severity;
  department: Department;
  agent_summary: string;
  recommended_next_action: string;
  customer_reply: string;
  human_review_required: boolean;
  confidence?: number;
  reason_codes?: string[];
}
