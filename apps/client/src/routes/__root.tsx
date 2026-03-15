import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "../store/authContext";

export type RouterContext = {
	isAuthenticated: boolean;
};

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => (
		<AuthProvider>
			<Outlet />
		</AuthProvider>
	),
});
