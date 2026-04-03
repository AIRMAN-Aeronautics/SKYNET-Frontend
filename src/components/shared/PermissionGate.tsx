import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  permission?: string;
  anyOf?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders children only when the current user holds the required permission(s).
 * Use `permission` for a single key, `anyOf` for OR logic.
 */
export function PermissionGate({ permission, anyOf, fallback = null, children }: Props) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const allowed = permission
    ? hasPermission(permission)
    : anyOf
    ? hasAnyPermission(anyOf)
    : true;

  return allowed ? <>{children}</> : <>{fallback}</>;
}
