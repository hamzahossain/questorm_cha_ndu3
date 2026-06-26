import {
    TicketRequest,
    TicketResponse,
    EvidenceVerdict,
    CaseType,
    Severity,
    Department,
} from "./types";

// Forbidden phrases in customer replies
const forbiddenPatterns = [
    /refund/i,
    /reversal/i,
    /credit/i,
    /PIN/i,
    /OTP/i,
    /password/i,
    /guarantee/i,
];

// Strip unsafe content from customer reply
function cleanCustomerReply(reply: string): string {
    let safe = reply;
    forbiddenPatterns.forEach((pattern) => {
        safe = safe.replace(pattern, "[REDACTED]");
    });
    return safe.trim();
}

// Ensure enums are valid, fallback to safe defaults
function enforceEnums(resp: Partial<TicketResponse>): TicketResponse {
    return {
        ticket_id: resp.ticket_id || "unknown",
        relevant_transaction_id: resp.relevant_transaction_id ?? null,
        evidence_verdict:
            Object.values(EvidenceVerdict).includes(resp.evidence_verdict!)
                ? resp.evidence_verdict!
                : EvidenceVerdict.InsufficientData,
        case_type:
            Object.values(CaseType).includes(resp.case_type!)
                ? resp.case_type!
                : CaseType.Other,
        severity:
            Object.values(Severity).includes(resp.severity!)
                ? resp.severity!
                : Severity.Low,
        department:
            Object.values(Department).includes(resp.department!)
                ? resp.department!
                : Department.CustomerSupport,
        agent_summary: resp.agent_summary || "No summary provided.",
        recommended_next_action:
            resp.recommended_next_action || "Escalate to human review.",
        customer_reply: cleanCustomerReply(resp.customer_reply || "We have received your complaint."),
        human_review_required: resp.human_review_required ?? true,
        confidence: resp.confidence ?? 0.4,
        reason_codes: resp.reason_codes ?? ["sanitized"],
    };
}

// Retry logic: attempt to sanitize multiple times if invalid
export async function sanitizeResponse(
    aiResponse: any,
    _req: TicketRequest,
    maxRetries = 2
): Promise<TicketResponse> {
    let attempt = 0;
    let sanitized: TicketResponse | null = null;

    while (attempt <= maxRetries) {
        try {
            sanitized = enforceEnums(aiResponse);
            break; // success
        } catch (err) {
            console.error("Sanitizer error:", err);
            attempt++;
        }
    }

    if (!sanitized) {
        // Fallback safe response
        sanitized = {
            ticket_id: _req.ticket_id || "unknown",
            relevant_transaction_id: null,
            evidence_verdict: EvidenceVerdict.InsufficientData,
            case_type: CaseType.Other,
            severity: Severity.Low,
            department: Department.CustomerSupport,
            agent_summary: "Sanitizer fallback response.",
            recommended_next_action: "Escalate to human review.",
            customer_reply: "We have received your complaint. Our team will review it.",
            human_review_required: true,
            confidence: 0.3,
            reason_codes: ["sanitizer_fallback"],
        };
    }

    return sanitized;
}
