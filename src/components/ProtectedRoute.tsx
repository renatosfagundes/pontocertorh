import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "funcionario" | "gestor" | "rh" | "admin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role hierarchy: admin > rh > gestor > funcionario
  const roleHierarchy: Record<string, number> = {
    funcionario: 1,
    gestor: 2,
    rh: 3,
    admin: 4,
  };

  if (requiredRole && roleHierarchy[role] < roleHierarchy[requiredRole]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
