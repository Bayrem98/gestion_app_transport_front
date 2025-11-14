import React, { useState, useCallback } from 'react';
import { TransportApiService } from '../services/api';
import { AgentsList } from '../components/AgentsList';
import { Agent, PlanningData } from '../@types/shared';
import { FileUpload } from '../components/FileUpload';
import { usePlanning } from './PlanningContext';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const [planningData, setPlanningData] = useState<PlanningData[]>([]);
  const [agentsManquants, setAgentsManquants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { setPlanningData: setGlobalPlanningData } = usePlanning();

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const data = await TransportApiService.uploadPlanning(file);
      
      // Mettre à jour l'état local
      setPlanningData(data);
      
      // Mettre à jour le contexte global pour la gestion des chauffeurs
      setGlobalPlanningData(data);
      
      // Vérifier les agents manquants
      const nomsAgents = data.map((item: PlanningData) => item.Salarie);
      const manquants = await TransportApiService.verifierAgentsManquants(nomsAgents);
      setAgentsManquants(manquants);
      
      // Afficher un message de succès
      alert(`✅ Planning importé avec succès !\n${data.length} agents chargés\n${manquants.length} agents à compléter`);
      
    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
      alert('❌ Erreur lors du traitement du fichier. Vérifiez le format du fichier Excel.');
    } finally {
      setLoading(false);
    }
  }, [setGlobalPlanningData]);

  const handleAddAgent = async (agentData: Partial<Agent>) => {
    try {
      await TransportApiService.createAgent(agentData);
      
      // Re-vérifier les agents manquants
      const nomsAgents = planningData.map(item => item.Salarie);
      const manquants = await TransportApiService.verifierAgentsManquants(nomsAgents);
      setAgentsManquants(manquants);
      
      // Message de succès
      alert(`✅ Agent "${agentData.nom}" ajouté avec succès !`);
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'agent:', error);
      alert('❌ Erreur lors de l\'ajout de l\'agent');
    }
  };

  // Statistiques détaillées du planning
  const getStatsDetails = () => {
    const totalAgents = planningData.length;
    const agentsAvecPlanning = planningData.filter(agent => {
      // Vérifier si l'agent a au moins un jour de travail
      const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      return jours.some(jour => {
        const planningJour = agent[jour as keyof PlanningData] as string;
        return planningJour && 
               !['REPOS', 'ABSENCE', 'OFF', 'MALADIE', 'CONGÉ PAYÉ', 'CONGÉ MATERNITÉ'].includes(
                 planningJour.toUpperCase()
               );
      });
    }).length;

    return {
      totalAgents,
      agentsAvecPlanning,
      agentsSansPlanning: totalAgents - agentsAvecPlanning,
      agentsManquants: agentsManquants.length
    };
  };

  const stats = getStatsDetails();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🚗 Gestionnaire de Transport Professionnel</h1>
        <p className="dashboard-subtitle">
          Importez votre planning Excel et gérez les transports de vos agents
        </p>
      </div>

       {/* Section Statistiques */}
        {planningData.length > 0 && (
          <div className="planning-stats">
            <div className="section-card">
              <div className="section-header">
                <h2>📊 Aperçu du Planning</h2>
                <span className="badge success">{planningData.length} agents</span>
              </div>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.totalAgents}</span>
                    <span className="stat-label">Agents total</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.agentsAvecPlanning}</span>
                    <span className="stat-label">Avec planning</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.agentsManquants}</span>
                    <span className="stat-label">À compléter</span>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.agentsSansPlanning}</span>
                    <span className="stat-label">Sans planning</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h3>Actions Rapides</h3>
                <div className="action-buttons">
                  <button 
                    className="action-btn primary"
                    onClick={() => window.location.href = '/chauffeurs'}
                    disabled={agentsManquants.length > 0}
                  >
                    🚗 Gérer les transports
                  </button>
                  <button 
                    className="action-btn secondary"
                    onClick={() => window.location.href = '/agents'}
                  >
                    👥 Voir tous les agents
                  </button>
                </div>
                {agentsManquants.length > 0 && (
                  <p className="action-warning">
                    ⚠️ Complétez d'abord les agents manquants pour gérer les transports
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <br />

      
      <div className="dashboard-grid">
        {/* Section Upload */}
        <div className="upload-section">
          <div className="section-card">
            <div className="section-header">
              <h2>📁 Import du Planning</h2>
              <div className="file-requirements">
                <span className="requirement">📋 Format Excel (.xlsx, .xls)</span>
                <span className="requirement">👥 Colonne "Salarié" requise</span>
                <span className="requirement">📅 Jours de la semaine</span>
              </div>
            </div>
            <FileUpload onFileUpload={handleFileUpload} loading={loading} />
            
            {loading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
                <p>Traitement du fichier en cours...</p>
              </div>
            )}
          </div>
        </div>

        {/* Section Agents Manquants */}
        {agentsManquants.length > 0 && (
          <div className="agents-manquants-section">
            <div className="section-card warning-card">
              <div className="section-header">
                <h2>⚠️ Agents à Compléter</h2>
                <span className="badge warning">{agentsManquants.length} manquant(s)</span>
              </div>
              <p className="section-description">
                Les agents suivants sont dans le planning mais pas dans la base de données. 
                Ajoutez-les pour pouvoir gérer leurs transports.
              </p>
              <AgentsList 
                agentsManquants={agentsManquants}
                onAgentAdded={handleAddAgent}
              />
            </div>
          </div>
        )}

       
        {/* Section Instructions */}
        {planningData.length === 0 && !loading && (
          <div className="instructions-section">
            <div className="section-card">
              <h2>📋 Comment utiliser</h2>
              <div className="instructions-list">
                <div className="instruction-step">
                  <span className="step-number">1</span>
                  <div className="step-content">
                    <h4>Importez votre planning Excel</h4>
                    <p>Utilisez le format standard avec les colonnes : Salarié, Lundi, Mardi, etc.</p>
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-number">2</span>
                  <div className="step-content">
                    <h4>Complétez les agents manquants</h4>
                    <p>Ajoutez les informations manquantes (adresse, téléphone, société)</p>
                  </div>
                </div>
                <div className="instruction-step">
                  <span className="step-number">3</span>
                  <div className="step-content">
                    <h4>Gérez les transports</h4>
                    <p>Organisez les ramassages et départs selon les plannings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer avec informations */}
      <div className="dashboard-footer">
        <p>
          💡 <strong>Astuce :</strong> Le planning importé sera utilisé pour filtrer automatiquement 
          les agents disponibles pour le ramassage (6h-8h) et le départ (22h-3h) dans la gestion des chauffeurs.
        </p>
      </div>
    </div>
  );
};