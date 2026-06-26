import {
    TicketResponse,
    EvidenceVerdict,
    CaseType,
    Severity,
    Department,
} from "./types";

// Validate that a value is in a given enum
function isEnumValue<T>(enumObj: T, value: any): boolean {
    //@ts-expect-error enum shenanigans
    return Object.values(enumObj).includes(value);
}

// Main validation function
export function validateResponse(resp: TicketResponse): void {
    if (!resp.ticket_id || typeof resp.ticket_id !== "string") {
        throw new Error("Invalid or missing ticket_id");
    }

    if (
        resp.relevant_transaction_id !== null &&
        typeof resp.relevant_transaction_id !== "string"
    ) {
        throw new Error("Invalid relevant_transaction_id");
    }

    if (!isEnumValue(EvidenceVerdict, resp.evidence_verdict)) {
        throw new Error(`Invalid evidence_verdict: ${resp.evidence_verdict}`);
    }

    if (!isEnumValue(CaseType, resp.case_type)) {
        throw new Error(`Invalid case_type: ${resp.case_type}`);
    }

    if (!isEnumValue(Severity, resp.severity)) {
        throw new Error(`Invalid severity: ${resp.severity}`);
    }

    if (!isEnumValue(Department, resp.department)) {
        throw new Error(`Invalid department: ${resp.department}`);
    }

    if (!resp.agent_summary || typeof resp.agent_summary !== "string") {
        throw new Error("Invalid or missing agent_summary");
    }

    if (
        !resp.recommended_next_action ||
        typeof resp.recommended_next_action !== "string"
    ) {
        throw new Error("Invalid or missing recommended_next_action");
    }

    if (!resp.customer_reply || typeof resp.customer_reply !== "string") {
        throw new Error("Invalid or missing customer_reply");
    }

    if (typeof resp.human_review_required !== "boolean") {
        throw new Error("Invalid human_review_required");
    }

    if (
        resp.confidence !== undefined &&
        (typeof resp.confidence !== "number" ||
            resp.confidence < 0 ||
            resp.confidence > 1)
    ) {
        throw new Error("Invalid confidence value");
    }

    if (
        resp.reason_codes !== undefined &&
        !Array.isArray(resp.reason_codes)
    ) {
        throw new Error("Invalid reason_codes");
    }
}
