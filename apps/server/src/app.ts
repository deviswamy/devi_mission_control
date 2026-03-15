import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import authRoutes from "./features/auth/routes.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorMiddleware } from "./middleware/errors.js";
import { tenantMiddleware } from "./middleware/tenant.js";

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

// All /api routes require auth; tenant middleware exposes orgId after auth resolves
const api = app.basePath("/api").use("*", authMiddleware).use("*", tenantMiddleware);

const authApi = api.route("/auth", authRoutes);

export type AppType = typeof authApi;
export default app;
