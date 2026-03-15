import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export async function errorMiddleware(err: unknown, c: Context) {
	if (err instanceof HTTPException) {
		return c.json({ error: err.message }, err.status);
	}

	if (err instanceof ZodError) {
		return c.json({ error: "Validation error", issues: err.issues }, 400);
	}

	console.error("Unhandled error:", err);
	return c.json({ error: "Internal server error" }, 500);
}
