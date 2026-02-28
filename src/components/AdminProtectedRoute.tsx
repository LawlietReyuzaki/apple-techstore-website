import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const adminSession = localStorage.getItem("admin_session");

  if (!adminSession) {
    return <Navigate to="/admin-login" replace />;
  }

  try {
    const session = JSON.parse(adminSession);
    
    // Optional: Check if session is still valid (e.g., expired after 24 hours)
    const loginTime = new Date(session.loginTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    // Invalidate session after 24 hours
    if (hoursDiff > 24) {
      localStorage.removeItem("admin_session");
      return <Navigate to="/admin-login" replace />;
    }

    return <>{children}</>;
  } catch {
    localStorage.removeItem("admin_session");
    return <Navigate to="/admin-login" replace />;
  }
};
