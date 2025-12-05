import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { GestionAgents } from './pages/GestionAgents';
import './App.css';
import { PlanningProvider } from './pages/PlanningContext';
import { ImportAgents } from './pages/ImportAgents';
import { ChauffeurPage } from './pages/ChauffeurPage';
import { RapportFinancier } from './pages/RapportFinancier';
import { SpeedInsights } from "@vercel/speed-insights/react"
import Login from './components/Login';
import UsersManagement from './pages/administration/UsersManagement';
import Unauthorized from './components/Unauthorized';
import ProtectedRoute, { UserRole } from './pages/ProtectedRoute';
import TrajectoriesPage from './pages/TrajectoriesPage';
import { AffectationManager } from './pages/affectation/AffectationManager';
import { AffectationValidationPage } from './pages/affectation/AffectationValidationPage';

enum WebsiteRoute {
  LOGIN = "/",
  USERS = "/users",
  DASHBOARD = "/import-agents",
  CHAUFFEURS = "/chauffeurspage",
  AGENTS = "/agents",
  AFFECTATION = "/affectations",
  VALIDATION = "/validation",
  RAPPORTS = "/rapports",
  UNAUTHORIZED = "/unauthorized",
  TRAJECTORIES = "/trajectories"
}

// Configuration des accès par rôle
const ROLE_ACCESS: Record<UserRole, WebsiteRoute[]> = {
  'Administrateur': [
    WebsiteRoute.DASHBOARD,
    WebsiteRoute.CHAUFFEURS,
    WebsiteRoute.AGENTS,
    WebsiteRoute.AFFECTATION,
    WebsiteRoute.VALIDATION,
    WebsiteRoute.RAPPORTS,
    WebsiteRoute.USERS
  ],
  'Comptabilité': [
    WebsiteRoute.DASHBOARD,
    WebsiteRoute.VALIDATION,
    WebsiteRoute.RAPPORTS
  ],
  'Utilisateur': [
    WebsiteRoute.DASHBOARD,
    WebsiteRoute.CHAUFFEURS,
    WebsiteRoute.AGENTS,
    WebsiteRoute.AFFECTATION,
  ]
};

function App() {
  return (
    <PlanningProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path={WebsiteRoute.LOGIN} element={<Login />} />
            
            
          </Routes>
          
          {localStorage.getItem("access_token") && (
            <>
              <Navigation />
              <main className="main-content">
                <Routes>
                  <Route path={WebsiteRoute.UNAUTHORIZED} element={<Unauthorized />} />
                  <Route path={WebsiteRoute.TRAJECTORIES} element={<TrajectoriesPage />} />
                  {/* Routes pour Administrateur (accès complet) */}
                  <Route 
                    path={WebsiteRoute.USERS} 
                    element={
                      <ProtectedRoute allowedRoles={['Administrateur']}>
                        <UsersManagement />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Routes pour tous les rôles */}
                  <Route 
                    path={WebsiteRoute.DASHBOARD} 
                    element={
                      <ProtectedRoute allowedRoles={['Utilisateur', 'Administrateur', 'Comptabilité']}>
                        <ImportAgents />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path={WebsiteRoute.CHAUFFEURS} 
                    element={
                      <ProtectedRoute allowedRoles={['Utilisateur', 'Administrateur']}>
                        <ChauffeurPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path={WebsiteRoute.AGENTS} 
                    element={
                      <ProtectedRoute allowedRoles={['Utilisateur', 'Administrateur']}>
                        <GestionAgents />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path={WebsiteRoute.AFFECTATION} 
                    element={
                      <ProtectedRoute allowedRoles={['Utilisateur', 'Administrateur']}>
                        <AffectationManager />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Routes pour Comptabilité et Administrateur */}
                  <Route 
                    path={WebsiteRoute.VALIDATION} 
                    element={
                      <ProtectedRoute allowedRoles={['Comptabilité', 'Administrateur']}>
                        <AffectationValidationPage />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Routes pour Comptabilité et Administrateur */}
                  <Route 
                    path={WebsiteRoute.RAPPORTS} 
                    element={
                      <ProtectedRoute allowedRoles={['Comptabilité', 'Administrateur']}>
                        <RapportFinancier />
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
                <SpeedInsights/>
              </main>
            </>
          )}
        </div>
      </Router>
    </PlanningProvider>
  );
}

export default App;