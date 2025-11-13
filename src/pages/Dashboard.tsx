import React, { useState, useCallback } from 'react';
import { TransportApiService } from '../services/api';
import { AgentsList } from '../components/AgentsList';
import { Agent, PlanningData } from '../@types/shared';
import { FileUpload } from '../components/FileUpload';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const [planningData, setPlanningData] = useState<PlanningData[]>([]);
  const [agentsManquants, setAgentsManquants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const data = await TransportApiService.uploadPlanning(file);
      setPlanningData(data);
      
      // Vérifier les agents manquants
      const nomsAgents = data.map((item: PlanningData) => item.Salarie);
      const manquants = await TransportApiService.verifierAgentsManquants(nomsAgents);
      setAgentsManquants(manquants);
    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
      alert('Erreur lors du traitement du fichier');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddAgent = async (agentData: Partial<Agent>) => {
    try {
      await TransportApiService.createAgent(agentData);
      // Re-vérifier les agents manquants
      const nomsAgents = planningData.map(item => item.Salarie);
      const manquants = await TransportApiService.verifierAgentsManquants(nomsAgents);
      setAgentsManquants(manquants);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'agent:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>🚗 Gestionnaire de Transport Professionnel</h1>
      
      <div className="dashboard-grid">
        <div className="upload-section">
          <h2>📁 Import du Planning</h2>
          <FileUpload onFileUpload={handleFileUpload} loading={loading} />
        </div>
        
        {agentsManquants.length > 0 && (
          <div className="agents-manquants-section">
            <AgentsList 
              agentsManquants={agentsManquants}
              onAgentAdded={handleAddAgent}
            />
          </div>
        )}
        
        {planningData.length > 0 && (
          <div className="planning-stats">
            <h2>📊 Aperçu du Planning</h2>
            <div className="stats-card">
              <div className="stat">
                <span className="stat-number">{planningData.length}</span>
                <span className="stat-label">Agents chargés</span>
              </div>
              <div className="stat">
                <span className="stat-number">{agentsManquants.length}</span>
                <span className="stat-label">À compléter</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};