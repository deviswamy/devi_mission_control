import { createRoute } from "@tanstack/react-router";
import { Route as AppRoute } from "./index";

export const Route = createRoute({
	getParentRoute: () => AppRoute,
	path: "/missions",
	component: () => <h1>Missions</h1>,
});
