console.log("STARTTTT")
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
console.log(`\n\n\nbruh\n\n\n`, process.env.OPENAI_API_KEY)
import { analyzeWithCache } from "./handler";

const app = express();
const PORT = process.env.PORT || 8000;
// Built-in JSON parser
app.use(express.json());

// Health check route
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
});

// Main complaint analysis route
app.post("/analyze-ticket", async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Basic input validation
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

app.listen(PORT, () => {
    console.log(`QueueStorm API running on port ${PORT}`);
});
