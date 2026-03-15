import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import authRoutes from "./features/auth/routes.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorMiddleware } from "./middleware/errors.js";
import { tenantMiddleware } from "./middleware/tenant.js";

// All /api routes require auth; tenant middleware exposes orgId after auth resolves
const apiRoutes = new Hono()
	.use("*", authMiddleware)
	.use("*", tenantMiddleware)
	.route("/auth", authRoutes);

const app = new Hono()
	.use("*", logger())
	.use(
		"*",
		cors({
			origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
			credentials: true,
		})
	)
	.get("/health", (c) => c.json({ status: "ok" }))
	.route("/api", apiRoutes);

app.onError(errorMiddleware);

export type AppType = typeof app;
export default app;
