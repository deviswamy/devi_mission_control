import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorMiddleware } from "./middleware/errors.js";

const app = new Hono();

app.use("*", logger());
app.use(
	"*",
	cors({
		origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
		credentials: true,
	})
);
app.onError(errorMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));

export type AppType = typeof app;
export default app;
