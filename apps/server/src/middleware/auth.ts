import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { createRemoteJWKSet, jwtVerify } from "jose";

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

if (!domain || !audience) {
	throw new Error("AUTH0_DOMAIN and AUTH0_AUDIENCE must be set");
}

const JWKS = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));

export type AppUser = {
	id: string;
	auth0Id: string;
	name: string;
	email: string;
};

declare module "hono" {
	interface ContextVariableMap {
		user: AppUser;
		orgId: string;
	}
}

export const authMiddleware = createMiddleware(async (c, next) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
	}

	const token = authHeader.slice(7);

	let payload: Record<string, unknown>;
	try {
		const result = await jwtVerify(token, JWKS, {
			audience,
			issuer: `https://${domain}/`,
		});
		payload = result.payload as Record<string, unknown>;
	} catch {
		throw new HTTPException(401, { message: "Invalid token" });
	}

	const auth0Id = payload.sub as string;

	// DB lookup deferred until schema + user table exist
	c.set("user", { id: "", auth0Id, name: "", email: "" } as AppUser);
	c.set("orgId", "");

	await next();
});
