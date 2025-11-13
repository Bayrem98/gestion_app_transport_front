import React, { useState, useEffect } from 'react';
import { TransportApiService } from '../services/api';
import { Affectation, Agent } from '../@types/shared';
import './Rapports.css';

interface Statistiques {
  totalAgents: number;
  agentsAvecVoiture: number;
  agentsSansVoiture: number;
  totalAffectations: number;
  affectationsPayees: number;
  affectationsNonPayees: number;
  totalMontant: number;
  repartitionSocietes: { [societe: string]: number };
  repartitionChauffeurs: { [chauffeur: string]: number };
}

export const Rapports: React.FC = () => {
  const [statistiques, setStatistiques] = useState<Statistiques | null>(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<'mois' | 'trimestre' | 'annee'>('mois');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');

  useEffect(() => {
    // Set default dates to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateDebut(firstDay.toISOString().split('T')[0]);
    setDateFin(lastDay.toISOString().split('T')[0]);
    
    loadStatistiques();
  }, []);

  const loadStatistiques = async () => {
    setLoading(true);
    try {
      const [agents, affectations] = await Promise.all([
        TransportApiService.getAgents(),
        TransportApiService.getAffectations()
      ]);

      const stats = calculerStatistiques(agents, affectations);
      setStatistiques(stats);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
      alert('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const calculerStatistiques = (agents: Agent[], affectations: Affectation[]): Statistiques => {
    const agentsAvecVoiture = agents.filter(a => a.voiturePersonnelle).length;
    const affectationsPayees = affectations.filter(a => a.statutPaiement === 'Payé').length;
    const totalMontant = affectations.reduce((sum, a) => sum + (a.prixCourse || 0), 0);

    const repartitionSocietes: { [societe: string]: number } = {};
    agents.forEach(agent => {
      repartitionSocietes[agent.societe] = (repartitionSocietes[agent.societe] || 0) + 1;
    });

    const repartitionChauffeurs: { [chauffeur: string]: number } = {};
    affectations.forEach(affectation => {
      repartitionChauffeurs[affectation.chauffeur] = (repartitionChauffeurs[affectation.chauffeur] || 0) + 1;
    });

    return {
      totalAgents: agents.length,
      agentsAvecVoiture,
      agentsSansVoiture: agents.length - agentsAvecVoiture,
      totalAffectations: affectations.length,
      affectationsPayees,
      affectationsNonPayees: affectations.length - affectationsPayees,
      totalMontant,
      repartitionSocietes,
      repartitionChauffeurs
    };
  };

  const genererRapportPDF = () => {
    // Simulation de génération de PDF
    alert('Fonctionnalité PDF en cours de développement');
  };

  const exporterExcel = () => {
    // Simulation d'export Excel
    alert('Fonctionnalité Excel en cours de développement');
  };

  if (loading) {
    return <div className="loading">Chargement des statistiques...</div>;
  }

  if (!statistiques) {
    return <div className="no-data">Aucune donnée disponible</div>;
  }

  return (
    <div className="rapports">
      <div className="rapports-header">
        <h1>📈 Rapports et Statistiques</h1>
        <div className="rapports-actions">
          <button className="btn-secondary" onClick={exporterExcel}>
            📊 Exporter Excel
          </button>
          <button className="btn-primary" onClick={genererRapportPDF}>
            📄 Générer PDF
          </button>
        </div>
      </div>

      <div className="filtres">
        <div className="filtre-group">
          <label>Période:</label>
          <select 
            value={periode} 
            onChange={(e) => setPeriode(e.target.value as 'mois' | 'trimestre' | 'annee')}
          >
            <option value="mois">Mois en cours</option>
            <option value="trimestre">Trimestre</option>
            <option value="annee">Année</option>
          </select>
        </div>
        
        <div className="filtre-group">
          <label>Du:</label>
          <input 
            type="date" 
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
        </div>
        
        <div className="filtre-group">
          <label>Au:</label>
          <input 
            type="date" 
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
        </div>
        
        <button className="btn-primary" onClick={loadStatistiques}>
          🔄 Actualiser
        </button>
      </div>

      <div className="stats-grid">
        {/* Cartes de statistiques principales */}
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Agents</h3>
            <div className="stat-number">{statistiques.totalAgents}</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">🚗</div>
          <div className="stat-content">
            <h3>Avec voiture</h3>
            <div className="stat-number">{statistiques.agentsAvecVoiture}</div>
            <div className="stat-percentage">
              {((statistiques.agentsAvecVoiture / statistiques.totalAgents) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">🚶</div>
          <div className="stat-content">
            <h3>Sans voiture</h3>
            <div className="stat-number">{statistiques.agentsSansVoiture}</div>
            <div className="stat-percentage">
              {((statistiques.agentsSansVoiture / statistiques.totalAgents) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>Affectations</h3>
            <div className="stat-number">{statistiques.totalAffectations}</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <h3>Payées</h3>
            <div className="stat-number">{statistiques.affectationsPayees}</div>
            <div className="stat-percentage">
              {((statistiques.affectationsPayees / statistiques.totalAffectations) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>En attente</h3>
            <div className="stat-number">{statistiques.affectationsNonPayees}</div>
            <div className="stat-percentage">
              {((statistiques.affectationsNonPayees / statistiques.totalAffectations) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="stat-card financial">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total à payer</h3>
            <div className="stat-number">{statistiques.totalMontant.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Répartition par société */}
        <div className="chart-card">
          <h3>🏢 Répartition par Société</h3>
          <div className="chart-content">
            {Object.entries(statistiques.repartitionSocietes)
              .sort(([,a], [,b]) => b - a)
              .map(([societe, count]) => (
                <div key={societe} className="chart-item">
                  <div className="chart-label">
                    <span>{societe}</span>
                    <span>{count} agents</span>
                  </div>
                  <div className="chart-bar">
                    <div 
                      className="chart-bar-fill"
                      style={{
                        width: `${(count / statistiques.totalAgents) * 100}%`,
                        backgroundColor: getColorForIndex(Object.keys(statistiques.repartitionSocietes).indexOf(societe))
                      }}
                    ></div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Répartition par chauffeur */}
        <div className="chart-card">
          <h3>🚗 Top Chauffeurs</h3>
          <div className="chart-content">
            {Object.entries(statistiques.repartitionChauffeurs)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([chauffeur, count]) => (
                <div key={chauffeur} className="chart-item">
                  <div className="chart-label">
                    <span>{chauffeur}</span>
                    <span>{count} courses</span>
                  </div>
                  <div className="chart-bar">
                    <div 
                      className="chart-bar-fill"
                      style={{
                        width: `${(count / statistiques.totalAffectations) * 100}%`,
                        backgroundColor: '#667eea'
                      }}
                    ></div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      <div className="summary-card">
        <h3>📋 Résumé Exécutif</h3>
        <div className="summary-content">
          <p>
            <strong>Période analysée:</strong> {new Date(dateDebut).toLocaleDateString('fr-FR')} au {new Date(dateFin).toLocaleDateString('fr-FR')}
          </p>
          <p>
            <strong>Performance globale:</strong> {statistiques.totalAffectations} courses réalisées pour un total de {statistiques.totalMontant.toFixed(2)} €
          </p>
          <p>
            <strong>Taux de paiement:</strong> {((statistiques.affectationsPayees / statistiques.totalAffectations) * 100).toFixed(1)}% des courses payées
          </p>
          <p>
            <strong>Répartition transport:</strong> {statistiques.agentsAvecVoiture} agents autonomes ({((statistiques.agentsAvecVoiture / statistiques.totalAgents) * 100).toFixed(1)}%) 
            vs {statistiques.agentsSansVoiture} agents dépendants du service
          </p>
        </div>
      </div>
    </div>
  );
};

// Fonction utilitaire pour générer des couleurs
const getColorForIndex = (index: number): string => {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
    '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#a8edea'
  ];
  return colors[index % colors.length];
};