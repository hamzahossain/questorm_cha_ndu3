import { readFile } from "fs/promises";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    TicketRequest,
    TicketResponse,
    EvidenceVerdict,
    CaseType,
    Severity,
    Department,
} from "./types";
import { validateResponse } from "./validator";
import { sanitizeResponse } from "./sanitizer";
import { setCachedResponse, getCachedResponse, makeCacheKey } from "./cache";

const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

let client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
    if (!client) {
        client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        console.log("Gemini client initialized with model:", MODEL);
    }
    return client;
}

let sampleFeed: any = [];

export async function loadSampleFeed(): Promise<void> {
    try {
        const sampleFeedPath = path.resolve(process.cwd(), "data/sample_feed.json");
        const fileData = await readFile(sampleFeedPath, "utf-8");
        sampleFeed = JSON.parse(fileData);
        console.log("Sample feed loaded successfully.");
    } catch (err) {
        console.error("Failed to load sample_feed.json:", err);
        sampleFeed = [];
    }
}

// Utility: clean Gemini output before parsing
function cleanGeminiOutput(raw: string): string {
    let text = raw.trim();
    // Strip markdown fences if present
    if (text.startsWith("```")) {
        text = text.replace(/```json?/gi, "").replace(/```/g, "").trim();
    }
    // Ensure only JSON object remains
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.slice(firstBrace, lastBrace + 1);
    }
    return text;
}

async function callGemini(prompt: string): Promise<TicketResponse> {
    try {
        const model = getClient().getGenerativeModel({ model: MODEL });
        const result = await model.generateContent(prompt);
        let raw = result.response.text() || "{}";
        console.log("Raw Gemini output:", raw);

        const cleaned = cleanGeminiOutput(raw);
        console.log("Cleaned Gemini output:", cleaned);

        return JSON.parse(cleaned) as TicketResponse;
    } catch (err) {
        console.error("Gemini call failed:", err);
        throw err;
    }
}

function buildPrompt(body: TicketRequest): string {
    return `
You are QueueStorm Investigator, an AI agent in a hackathon contest.
Your role is strictly limited to acting as a middleman between customers and human employees.
You have NO authority to grant refunds, reversals, credits, or promises of resolution.

CRITICAL RULES:
- Output MUST be valid JSON, no text outside the JSON.
- Use ONLY the allowed enum values defined in types.ts.
- Do NOT invent fields or change names.
- Customer reply MUST be polite, neutral, and safe.
- Customer reply MUST NOT contain PIN, OTP, password, refund promises, or unsafe instructions.
- If the complaint is written in Bangla, respond with Bangla in the "customer_reply" field.
- Always classify into one of the defined CaseType categories.
- Severity must be chosen based on impact (low, medium, high, critical).
- Department must route correctly:
  - Fraud → fraud_risk
  - Dispute → dispute_resolution
  - Refund/payment issues → payments_ops
  - Merchant complaints → merchant_operations
  - Agent complaints → agent_operations
  - General inquiries → customer_support

### Examples
${JSON.stringify(sampleFeed, null, 2)}

### Input
Complaint: ${body.complaint}
Transaction History: ${JSON.stringify(body.transaction_history || [])}
Language: ${body.language || "unknown"}
Channel: ${body.channel || "unknown"}
User Type: ${body.user_type || "unknown"}

### Output
Return ONLY the JSON object, nothing else.
`;
}

export async function analyzeWithCache(body: TicketRequest): Promise<TicketResponse> {
    const key = makeCacheKey(body);

    const cached = getCachedResponse(key);
    if (cached) {
        return cached;
    }

    const prompt = buildPrompt(body);
    let response: TicketResponse;

    try {
        const aiResponse = await callGemini(prompt);
        response = await sanitizeResponse(aiResponse, body);

        validateResponse(response);
        setCachedResponse(key, response);
    } catch (err: any) {
        console.error("Handler error:", err);
        response = {
            ticket_id: body.ticket_id || "unknown",
            relevant_transaction_id: null,
            evidence_verdict: EvidenceVerdict.InsufficientData,
            case_type: CaseType.Other,
            severity: Severity.Low,
            department: Department.CustomerSupport,
            agent_summary: "Unable to process complaint, fallback response.",
            recommended_next_action: "Escalate to human review.",
            customer_reply: "We have received your complaint. Our team will review it.",
            human_review_required: true,
            confidence: 0.4,
            reason_codes: ["fallback"],
        };
    }

    return response;
}
