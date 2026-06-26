import { readFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";
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

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Lazy client init
let client: OpenAI | null = null;
function getClient(): OpenAI {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
        console.log("OpenAI client initialized with model:", MODEL);
    }
    return client;
}

// Sample feed cache
let sampleFeed: any = [];

// Explicit loader function
export async function loadSampleFeed(): Promise<void> {
    try {
        const sampleFeedPath = path.resolve(process.cwd(), "data/sample_feed.json");
        const fileData = await readFile(sampleFeedPath, "utf-8");
        sampleFeed = JSON.parse(fileData);
        console.log("Sample feed loaded successfully.");
    } catch (err) {
        console.error("Failed to load sample_feed.json:", err);
        sampleFeed = []; // fallback to empty
    }
}

// Call OpenAI with strict JSON output
async function callOpenAI(prompt: string): Promise<TicketResponse> {
    try {
        const response = await getClient().chat.completions.create({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const raw = response.choices[0].message?.content || "{}";
        return JSON.parse(raw) as TicketResponse;
    } catch (err) {
        console.error("OpenAI call failed:", err);
        throw err;
    }
}

// Build the full prompt for each request
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
- Department must route correctly (customer_support, dispute_resolution, payments_ops, merchant_operations, agent_operations, fraud_risk).

### Examples (input → output)
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

// Main analysis function with cache + validation + sanitization
export async function analyzeWithCache(body: TicketRequest): Promise<TicketResponse> {
    const key = makeCacheKey(body);

    const cached = getCachedResponse(key);
    if (cached) {
        return cached;
    }

    const prompt = buildPrompt(body);
    let response: TicketResponse;

    try {
        const aiResponse = await callOpenAI(prompt);
        response = await sanitizeResponse(aiResponse, body);

        // Validate schema before caching
        validateResponse(response);
        setCachedResponse(key, response);
    } catch (err) {
        console.error("Handler error:", err);
        // Fallback: minimal safe response using enums
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
