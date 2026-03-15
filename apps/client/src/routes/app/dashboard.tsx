import { hasAnyRole } from "@mission-control/shared";
import { createRoute, redirect } from "@tanstack/react-router";
import { Route as AppRoute } from "./index";

export const Route = createRoute({
	getParentRoute: () => AppRoute,
	path: "/dashboard",
	beforeLoad: ({ context }) => {
		if (!context.user || !hasAnyRole(context.user.role, ["director"])) {
			throw redirect({ to: "/app" });
		}
	},
	component: () => <h1>Dashboard</h1>,
});
