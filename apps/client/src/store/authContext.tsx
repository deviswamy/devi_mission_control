import { useAuth0 } from "@auth0/auth0-react";
import { createContext, type ReactNode, useContext } from "react";

export type AppUser = {
	id: string;
	auth0Id: string;
	name: string;
	email: string;
};

type AuthContextValue = {
	appUser: AppUser | null;
	auth0User: ReturnType<typeof useAuth0>["user"];
	isLoading: boolean;
	isAuthenticated: boolean;
	getToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const { user, isLoading, isAuthenticated, getAccessTokenSilently } = useAuth0();

	const getToken = () =>
		getAccessTokenSilently({
			authorizationParams: {
				audience: import.meta.env.VITE_AUTH0_AUDIENCE,
			},
		});

	// appUser will be populated once the user table + /auth/me endpoint exist
	const appUser: AppUser | null = null;

	return (
		<AuthContext.Provider
			value={{ appUser, auth0User: user, isLoading, isAuthenticated, getToken }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
