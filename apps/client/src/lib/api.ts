import type { AppType } from "@mission-control/server";
import { hc } from "hono/client";

export const api = hc<AppType>(import.meta.env.VITE_API_BASE_URL ?? window.location.origin);
