import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { GestionAgents } from './pages/GestionAgents';
import { GestionChauffeurs } from './pages/GestionChauffeurs';
import { Rapports } from './pages/Rapports';
import './App.css';
import { PlanningProvider } from './pages/PlanningContext';
import { ImportAgents } from './pages/ImportAgents';
import { ChauffeurPage } from './pages/ChauffeurPage';

function App() {
  return (
    <PlanningProvider>
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ImportAgents />} />
            <Route path="/import-agents" element={<ImportAgents />} />
            <Route path="/agents" element={<GestionAgents />} />
            <Route path="/chauffeurs" element={<GestionChauffeurs />} />
            <Route path="/chauffeurspage" element={<ChauffeurPage />} />
            <Route path="/rapports" element={<Rapports />} />
          </Routes>
        </main>
      </div>
    </Router>
    </PlanningProvider>
  );
}

export default App;