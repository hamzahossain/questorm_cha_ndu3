import crypto from "crypto";
import { TicketRequest, TicketResponse } from "./types";

// Simple in-memory cache
const cache = new Map<string, TicketResponse>();

// Generate a stable cache key from request body
export function makeCacheKey(body: TicketRequest): string {
    // Use complaint text + ticket_id + transaction history as key material
    const keyMaterial = JSON.stringify({
        ticket_id: body.ticket_id,
        complaint: body.complaint,
        transaction_history: body.transaction_history || [],
    });

    return crypto.createHash("sha256").update(keyMaterial).digest("hex");
}

// Retrieve cached response
export function getCachedResponse(key: string): TicketResponse | null {
    return cache.get(key) || null;
}

// Store response in cache
export function setCachedResponse(key: string, resp: TicketResponse): void {
    cache.set(key, resp);
}

// Optional: clear cache (useful for tests or resets)
export function clearCache(): void {
    cache.clear();
}
