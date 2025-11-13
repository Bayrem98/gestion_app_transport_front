import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { GestionAgents } from './pages/GestionAgents';
import { GestionChauffeurs } from './pages/GestionChauffeurs';
import { Rapports } from './pages/Rapports';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<GestionAgents />} />
            <Route path="/chauffeurs" element={<GestionChauffeurs />} />
            <Route path="/rapports" element={<Rapports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;