import type { Permission } from "@mission-control/shared";
import type { ReactNode } from "react";
import { useHasPermission } from "../hooks/usePermissions";

type Props = {
	permission: Permission;
	children: ReactNode;
	fallback?: ReactNode;
};

export function RequirePermission({ permission, children, fallback = null }: Props) {
	const allowed = useHasPermission(permission);
	return allowed ? <>{children}</> : <>{fallback}</>;
}
