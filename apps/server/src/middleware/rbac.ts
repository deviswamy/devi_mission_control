import type { Permission, UserRole } from "@mission-control/shared";
import { hasAnyRole, hasPermission } from "@mission-control/shared";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export function requireRole(allowed: UserRole[]) {
	return createMiddleware(async (c, next) => {
		const user = c.get("user");
		if (!user) {
			throw new HTTPException(401, { message: "Unauthorized" });
		}
		if (!hasAnyRole(user.role, allowed)) {
			throw new HTTPException(403, { message: "Forbidden" });
		}
		await next();
	});
}

export function requirePermission(permission: Permission) {
	return createMiddleware(async (c, next) => {
		const user = c.get("user");
		if (!user) {
			throw new HTTPException(401, { message: "Unauthorized" });
		}
		if (!hasPermission(user.role, permission)) {
			throw new HTTPException(403, { message: "Forbidden" });
		}
		await next();
	});
}
