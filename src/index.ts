import express, { Request, Response, NextFunction } from "express";
import "dotenv/config";
import { analyzeWithCache, loadSampleFeed } from "./handler";

const app = express();
const PORT = process.env.PORT || 8000;

// Global error/rejection handlers
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

// Built-in JSON parser
app.use(express.json());

// Health check route
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

// Main complaint analysis route
app.post("/analyze-ticket", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body || typeof req.body.complaint !== "string") {
            return res.status(400).json({ error: "Missing or invalid complaint in request body" });
        }

        const result = await analyzeWithCache(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// Catch-all for unknown routes
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Route not found" });
});

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// Startup sequence: load sample feed first, then start server
(async () => {
    try {
        console.log("Loading sample feed...");
        await loadSampleFeed();
        console.log("Sample feed loaded.");
        console.log("Startup check:", {
            PORT,
            MODEL: process.env.OPENAI_MODEL,
            KEY: process.env.OPENAI_API_KEY?.slice(0, 8) + "..."
        });
        app.listen(PORT, () => {
            console.log(`QueueStorm API running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Startup error:", err);
        process.exit(1);
    }
})();
