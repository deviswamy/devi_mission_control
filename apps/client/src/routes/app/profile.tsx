import { createRoute } from "@tanstack/react-router";
import { Route as AppRoute } from "./index";

export const Route = createRoute({
	getParentRoute: () => AppRoute,
	path: "/profile",
	component: () => <h1>Profile</h1>,
});
