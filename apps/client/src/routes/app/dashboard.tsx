import { createRoute } from "@tanstack/react-router";
import { Route as AppRoute } from "./index";

export const Route = createRoute({
	getParentRoute: () => AppRoute,
	path: "/dashboard",
	component: () => <h1>Dashboard</h1>,
});
