import { useAuth0 } from "@auth0/auth0-react";
import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) {
			throw redirect({ to: "/app" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const { loginWithRedirect } = useAuth0();

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="flex flex-col items-center gap-6">
				<div className="text-4xl font-bold">Mission Control</div>
				<button
					type="button"
					onClick={() => loginWithRedirect()}
					className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
				>
					Log in
				</button>
			</div>
		</div>
	);
}
