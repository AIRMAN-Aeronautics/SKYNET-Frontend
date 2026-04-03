import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  permission?: string;
  anyOf?: string[];
}

/**
 * Route guard: redirects to /403 if the user lacks the required permission(s).
 * Works as a wrapper around <Outlet />, so nest protected routes inside it.
 */
export function PermissionRoute({ permission, anyOf }: Props) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const allowed = permission
    ? hasPermission(permission)
    : anyOf
    ? hasAnyPermission(anyOf)
    : true;

  return allowed ? <Outlet /> : <Navigate to="/403" replace />;
}
