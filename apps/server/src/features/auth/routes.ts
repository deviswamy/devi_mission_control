import type { MeResponse } from "@mission-control/shared";
import { Hono } from "hono";

const authRoutes = new Hono().get("/me", (c) => {
	const user = c.get("user");
	const org = c.get("org");
	return c.json({ user, org } satisfies MeResponse);
});

export default authRoutes;
