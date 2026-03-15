import { pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["director", "mission_lead", "crew_member"]);

export const organizations = pgTable("organizations", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name", { length: 255 }).notNull(),
	slug: varchar("slug", { length: 255 }).notNull().unique(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	orgId: uuid("org_id")
		.notNull()
		.references(() => organizations.id),
	auth0Id: varchar("auth0_id", { length: 255 }).notNull().unique(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	role: userRoleEnum("role").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
