export type UserRole = "director" | "mission_lead" | "crew_member";

export type User = {
	id: string;
	orgId: string;
	auth0Id: string;
	name: string;
	email: string;
	role: UserRole;
	createdAt: Date;
};

export type Organization = {
	id: string;
	name: string;
	slug: string;
	createdAt: Date;
};

export type MeResponse = {
	user: User;
	org: Organization;
};
