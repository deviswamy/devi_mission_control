import app from "./app.js";

export type { AppType } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

Bun.serve({
	fetch: app.fetch,
	port,
});

console.log(`Server running on http://localhost:${port}`);
