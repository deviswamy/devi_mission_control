import type { Permission, UserRole } from "@mission-control/shared";
import { hasAnyRole, hasPermission } from "@mission-control/shared";
import { useAuthContext } from "../store/authContext";

export function useHasPermission(permission: Permission): boolean {
	const { user } = useAuthContext();
	if (!user) return false;
	return hasPermission(user.role, permission);
}

export function useHasRole(role: UserRole | UserRole[]): boolean {
	const { user } = useAuthContext();
	if (!user) return false;
	const roles = Array.isArray(role) ? role : [role];
	return hasAnyRole(user.role, roles);
}
