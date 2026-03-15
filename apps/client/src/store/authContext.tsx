import { useAuth0 } from "@auth0/auth0-react";
import type { MeResponse, Organization, User } from "@mission-control/shared";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import { api } from "../lib/api";

type AuthContextValue = {
	user: User | null;
	org: Organization | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	getToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const { isLoading: auth0Loading, isAuthenticated, getAccessTokenSilently } = useAuth0();

	const getToken = () =>
		getAccessTokenSilently({
			authorizationParams: {
				audience: import.meta.env.VITE_AUTH0_AUDIENCE,
			},
		});

	const { data, isLoading: meLoading } = useQuery({
		queryKey: ["me"],
		queryFn: async (): Promise<MeResponse> => {
			const token = await getToken();
			const res = await api.api.auth.me.$get({}, { headers: { Authorization: `Bearer ${token}` } });
			if (!res.ok) throw new Error("Failed to fetch user");
			return res.json();
		},
		enabled: isAuthenticated,
	});

	return (
		<AuthContext.Provider
			value={{
				user: data?.user ?? null,
				org: data?.org ?? null,
				isLoading: auth0Loading || (isAuthenticated && meLoading),
				isAuthenticated,
				getToken,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuthContext() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
	return ctx;
}
