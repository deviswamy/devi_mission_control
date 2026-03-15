import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

const router = createRouter({
	routeTree,
	context: { isAuthenticated: false },
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

function InnerApp() {
	const { isAuthenticated } = useAuth0();
	return <RouterProvider router={router} context={{ isAuthenticated }} />;
}

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed to exist in index.html
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Auth0Provider
			domain={domain}
			clientId={clientId}
			authorizationParams={{
				redirect_uri: window.location.origin,
				audience,
			}}
		>
			<QueryClientProvider client={queryClient}>
				<InnerApp />
			</QueryClientProvider>
		</Auth0Provider>
	</StrictMode>
);
