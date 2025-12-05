import React from 'react';
import { Navigate } from 'react-router-dom';

// Définition des rôles
export type UserRole = 'Administrateur' | 'Comptabilité' | 'Utilisateur';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = ['Administrateur', 'Comptabilité', 'Utilisateur'] // Par défaut, tous les rôles sont autorisés
}) => {
  const token = localStorage.getItem('access_token');
  const userRole = localStorage.getItem('user_role') as UserRole;

  // Si pas de token, rediriger vers login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si l'utilisateur n'a pas le rôle requis, rediriger vers unauthorized
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;