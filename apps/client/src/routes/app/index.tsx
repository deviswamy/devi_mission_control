import { createRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthContext } from "../../store/authContext";
import { Route as rootRoute } from "../__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/app",
	beforeLoad: ({ context }) => {
		if (!context.isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: AppIndex,
});

function AppIndex() {
	const { user, isLoading } = useAuthContext();
	const navigate = useNavigate();

	useEffect(() => {
		if (isLoading || !user) return;
		if (user.role === "director") {
			navigate({ to: "/app/dashboard" });
		} else if (user.role === "mission_lead") {
			navigate({ to: "/app/missions" });
		} else {
			navigate({ to: "/app/profile" });
		}
	}, [user, isLoading, navigate]);

	return null;
}
