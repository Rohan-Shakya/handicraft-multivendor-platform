import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, hasAnyPermission, type Permission } from "@/lib/permissions";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  requiredType?: "admin" | "vendor";
  /** Single permission required to access this route */
  requiredPermission?: Permission;
  /** Any one of these permissions grants access */
  requiredPermissions?: Permission[];
}

export function ProtectedRoute({
  children,
  requiredType,
  requiredPermission,
  requiredPermissions,
}: Props) {
  const { actor, loading } = useAuth();

  // Wait for session restore (HttpOnly cookie refresh) before deciding
  if (loading) return null;

  // Not authenticated — redirect to appropriate login
  if (!actor) {
    if (requiredType === "vendor") return <Navigate to="/login" replace />;
    return <Navigate to="/admin/login" replace />;
  }

  // Wrong actor type — redirect to their home
  if (requiredType && actor.type !== requiredType) {
    if (actor.type === "vendor") return <Navigate to="/vendor" replace />;
    return <Navigate to="/" replace />;
  }

  // Permission check — redirect to home if insufficient permissions
  if (requiredPermission && !hasPermission(actor, requiredPermission)) {
    return <Navigate to={actor.type === "vendor" ? "/vendor" : "/"} replace />;
  }

  if (requiredPermissions && !hasAnyPermission(actor, requiredPermissions)) {
    return <Navigate to={actor.type === "vendor" ? "/vendor" : "/"} replace />;
  }

  return <>{children}</>;
}
