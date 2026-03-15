import type { User } from "@mission-control/shared";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

export type RouterContext = {
	isAuthenticated: boolean;
	user: User | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => <Outlet />,
});
