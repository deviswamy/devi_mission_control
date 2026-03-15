import { createMiddleware } from "hono/factory";

export const tenantMiddleware = createMiddleware(async (c, next) => {
	// org is set by authMiddleware; expose orgId as a convenience shortcut
	const org = c.get("org");
	c.set("orgId", org.id);
	await next();
});
