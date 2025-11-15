import React, { useState, useEffect } from 'react';
import { TransportApiService } from '../services/api';
import { Affectation, Agent, PlanningData, AgentAffectation } from '../@types/shared';
import { usePlanning } from './PlanningContext';
import './GestionChauffeurs.css';

// Fonction utilitaire pour extraire les heures du planning
const extraireHeuresPlanning = (planningStr: string): { heureDebut: number; heureFin: number } | null => {
  if (!planningStr) return null;
  
  const joursRepos = ['REPOS', 'ABSENCE', 'OFF', 'MALADIE', 'CONGÉ PAYÉ', 'CONGÉ MATERNITÉ'];
  if (joursRepos.includes(planningStr.toUpperCase())) {
    return null;
  }

  const texte = planningStr.toString().trim();
  
  // Pattern pour "8h-16h", "8h-17h", "13h-22h", etc.
  const pattern = /(\d{1,2})h?\s*[-à]\s*(\d{1,2})h?/;
  const match = texte.match(pattern);

  if (match) {
    let heureDebut = parseInt(match[1]);
    let heureFin = parseInt(match[2]);

    // Ajuster les heures de fin après minuit (ex: 23h-2h)
    if (heureFin < heureDebut && heureFin < 12) {
      heureFin += 24;
    }

    return { heureDebut, heureFin };
  }

  return null;
};

// Composant pour ajouter/sélectionner les agents
const AgentsSelection: React.FC<{
  agents: Agent[];
  planningData: PlanningData[];
  typeTransport: 'Ramassage' | 'Départ';
  jour: string;
  agentsSelectionnes: AgentAffectation[];
  onAgentsChange: (agents: AgentAffectation[]) => void;
}> = ({ agents, planningData, typeTransport, jour, agentsSelectionnes, onAgentsChange }) => {
  const [agentsFiltres, setAgentsFiltres] = useState<Agent[]>([]);
  const [agentEnCoursAjout, setAgentEnCoursAjout] = useState<string>('');

  // Filtrer les agents disponibles selon le planning
  useEffect(() => {
    if (agents.length === 0 || planningData.length === 0) {
      setAgentsFiltres(agents);
      return;
    }

    const filtrerAgents = () => {
      const agentsDisponibles = agents.filter(agent => {
        // Vérifier si l'agent n'est pas déjà sélectionné
        if (agentsSelectionnes.find(a => a.agentNom === agent.nom)) {
          return false;
        }

        // Trouver le planning de cet agent
        const planningAgent = planningData.find(p => p.Salarie === agent.nom);
        if (!planningAgent) return false;

        // Récupérer le planning du jour sélectionné
        const planningJour = planningAgent[jour as keyof PlanningData] as string;
        const heures = extraireHeuresPlanning(planningJour);
        
        if (!heures) return false;

        if (typeTransport === 'Ramassage') {
          // Ramassage: début à 6h, 7h ou 8h
          return [6, 7, 8].includes(heures.heureDebut);
        } else {
          // Départ: fin à 22h, 23h, 0h, 1h, 2h, 3h
          const heureFinNormalisee = heures.heureFin >= 24 ? heures.heureFin - 24 : heures.heureFin;
          return [22, 23, 0, 1, 2, 3].includes(heureFinNormalisee);
        }
      });

      setAgentsFiltres(agentsDisponibles);
    };

    filtrerAgents();
  }, [agents, planningData, typeTransport, jour, agentsSelectionnes]);

  const ajouterAgent = (agentNom: string) => {
    const agent = agents.find(a => a.nom === agentNom);
    if (agent) {
      const nouvelAgent: AgentAffectation = {
        agentNom: agent.nom,
        adresse: agent.adresse,
        telephone: agent.telephone,
        societe: agent.societe
      };
      onAgentsChange([...agentsSelectionnes, nouvelAgent]);
      setAgentEnCoursAjout('');
    }
  };

  const supprimerAgent = (index: number) => {
    const nouveauxAgents = agentsSelectionnes.filter((_, i) => i !== index);
    onAgentsChange(nouveauxAgents);
  };

  return (
    <div className="agents-selection">
      <div className="selection-header">
        <label>Agents à transporter *</label>
        <span className="agents-count">{agentsSelectionnes.length} agent(s) sélectionné(s)</span>
      </div>

      {/* Liste des agents sélectionnés */}
      {agentsSelectionnes.length > 0 && (
        <div className="agents-selectionnes">
          <h4>Agents sélectionnés :</h4>
          <div className="agents-list">
            {agentsSelectionnes.map((agent, index) => (
              <div key={index} className="agent-selectionne">
                <div className="agent-info">
                  <span className="agent-nom">{agent.agentNom}</span>
                  <span className="agent-societe">{agent.societe}</span>
                </div>
                <button
                  type="button"
                  className="btn-supprimer-agent"
                  onClick={() => supprimerAgent(index)}
                  title="Retirer cet agent"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sélection d'un nouvel agent */}
      <div className="ajout-agent">
        <select
          value={agentEnCoursAjout}
          onChange={(e) => setAgentEnCoursAjout(e.target.value)}
          className="select-agent"
        >
          <option value="">Sélectionner un agent à ajouter</option>
          {agentsFiltres.map(agent => (
            <option key={agent._id} value={agent.nom}>
              {agent.nom} - {agent.societe}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-ajouter-agent"
          onClick={() => agentEnCoursAjout && ajouterAgent(agentEnCoursAjout)}
          disabled={!agentEnCoursAjout}
        >
          ➕ Ajouter
        </button>
      </div>

      <div className="filter-info">
        <span>
          {agentsFiltres.length} agent(s) disponible(s) pour {typeTransport.toLowerCase()}
          {typeTransport === 'Ramassage' ? ' (début 6h-8h)' : ' (fin 22h-3h)'}
        </span>
      </div>
    </div>
  );
};

// Composant AffectationForm avec multi-agents
const AffectationForm: React.FC<{ 
  agents: Agent[];
  planningData: PlanningData[];
  onSubmit: (data: Partial<Affectation>) => void;
  affectationExistante?: Affectation;
}> = ({ agents, planningData, onSubmit, affectationExistante }) => {
  const [formData, setFormData] = useState<Partial<Affectation>>({
    chauffeur: affectationExistante?.chauffeur || '',
    heure: affectationExistante?.heure || 6,
    agents: affectationExistante?.agents || [],
    typeTransport: affectationExistante?.typeTransport || 'Ramassage',
    jour: affectationExistante?.jour || 'Lundi',
    prixCourse: affectationExistante?.prixCourse || 10,
    vehicule: affectationExistante?.vehicule || ''
  });

  // Fonction pour calculer le prix par société
  const calculerPrixParSociete = (agents: AgentAffectation[], prixTotal: number): string => {
    if (!agents.length || !prixTotal) return '0 TND par société';
    
    // Compter le nombre de sociétés uniques
    const societesUniques = new Set(agents.map(agent => agent.societe));
    const nombreSocietes = societesUniques.size;
    
    // Calculer le prix par société
    const prixParSociete = prixTotal / nombreSocietes;
    
    return `${prixParSociete.toFixed(2)} TND par société (${nombreSocietes} société(s))`;
  };

  // Fonction pour obtenir la répartition détaillée par société
  const getRepartitionParSociete = (agents: AgentAffectation[], prixTotal: number): { societe: string; nombreAgents: number; prix: number }[] => {
    if (!agents.length || !prixTotal) return [];
    
    // Grouper les agents par société
    const agentsParSociete = agents.reduce((acc, agent) => {
      if (!acc[agent.societe]) {
        acc[agent.societe] = [];
      }
      acc[agent.societe].push(agent);
      return acc;
    }, {} as { [societe: string]: AgentAffectation[] });
    
    // Calculer le prix par société (répartition égale)
    const nombreSocietes = Object.keys(agentsParSociete).length;
    const prixParSociete = prixTotal / nombreSocietes;
    
    return Object.entries(agentsParSociete).map(([societe, agents]) => ({
      societe,
      nombreAgents: agents.length,
      prix: prixParSociete
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.chauffeur || !formData.agents || formData.agents.length === 0) {
      alert('Veuillez remplir le chauffeur et sélectionner au moins un agent');
      return;
    }

    onSubmit(formData);
    
    // Réinitialiser le formulaire
    if (!affectationExistante) {
      setFormData({
        chauffeur: '',
        heure: formData.typeTransport === 'Ramassage' ? 6 : 22,
        agents: [],
        typeTransport: formData.typeTransport || 'Ramassage',
        jour: formData.jour || 'Lundi',
        prixCourse: 10,
        vehicule: ''
      });
    }
  };

  const handleAgentsChange = (agents: AgentAffectation[]) => {
    setFormData({ ...formData, agents });
  };

  const heuresRamassage = [6, 7, 8];
  const heuresDepart = [22, 23, 0, 1, 2, 3];

  // Calculer la répartition pour l'affichage détaillé
  const repartitionSocietes = getRepartitionParSociete(formData.agents || [], formData.prixCourse || 0);

  return (
    <form onSubmit={handleSubmit} className="affectation-form">
      <div className="form-row">
        <div className="form-group">
          <label>Chauffeur *</label>
          <input
            type="text"
            value={formData.chauffeur || ''}
            onChange={(e) => setFormData({ ...formData, chauffeur: e.target.value })}
            required
            placeholder="Nom du chauffeur"
          />
        </div>

        <div className="form-group">
          <label>Véhicule</label>
          <input
            type="text"
            value={formData.vehicule || ''}
            onChange={(e) => setFormData({ ...formData, vehicule: e.target.value })}
            placeholder="Modèle du véhicule"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Type de transport *</label>
          <select
            value={formData.typeTransport}
            onChange={(e) => setFormData({ ...formData, typeTransport: e.target.value as 'Ramassage' | 'Départ' })}
          >
            <option value="Ramassage">Ramassage</option>
            <option value="Départ">Départ</option>
          </select>
        </div>

        <div className="form-group">
          <label>Jour *</label>
          <select
            value={formData.jour}
            onChange={(e) => setFormData({ ...formData, jour: e.target.value })}
          >
            <option value="Lundi">Lundi</option>
            <option value="Mardi">Mardi</option>
            <option value="Mercredi">Mercredi</option>
            <option value="Jeudi">Jeudi</option>
            <option value="Vendredi">Vendredi</option>
            <option value="Samedi">Samedi</option>
            <option value="Dimanche">Dimanche</option>
          </select>
        </div>

        <div className="form-group">
          <label>Heure *</label>
          <select
            value={formData.heure}
            onChange={(e) => setFormData({ ...formData, heure: parseInt(e.target.value) })}
          >
            {formData.typeTransport === 'Ramassage' ? (
              heuresRamassage.map(heure => (
                <option key={heure} value={heure}>{heure}h</option>
              ))
            ) : (
              heuresDepart.map(heure => (
                <option key={heure} value={heure}>
                  {heure === 0 ? '00h' : `${heure}h`}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Sélection des agents */}
      <AgentsSelection
        agents={agents}
        planningData={planningData}
        typeTransport={formData.typeTransport!}
        jour={formData.jour!}
        agentsSelectionnes={formData.agents || []}
        onAgentsChange={handleAgentsChange}
      />

      <div className="form-group">
        <label>Prix total de la course (TND) *</label>
        <input
          type="number"
          value={formData.prixCourse}
          onChange={(e) => setFormData({ ...formData, prixCourse: parseFloat(e.target.value) })}
          required
          min="0"
          step="0.5"
        />
        <small className="prix-info">
          Prix total pour {(formData.agents || []).length} agent(s) - 
          {(formData.agents || []).length && formData.prixCourse ? 
            ` ${calculerPrixParSociete(formData.agents || [], formData.prixCourse)}` : 
            ' 0 TND par société'
          }
        </small>

        {/* Affichage détaillé de la répartition par société */}
        {repartitionSocietes.length > 0 && (
          <div className="repartition-societes">
            <strong>📊 Répartition par société :</strong>
            {repartitionSocietes.map((item, index) => (
              <div key={index} className="repartition-item">
                <span className="societe-nom">{item.societe}</span>
                <span className="societe-details">
                  ({item.nombreAgents} agent(s)) : {item.prix.toFixed(2)} TND
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="submit-btn">
        {affectationExistante ? '💾 Mettre à jour' : '✅ Ajouter'} l'affectation
      </button>
    </form>
  );
};

// Composant AffectationCard avec multi-agents
const AffectationCard: React.FC<{
  affectation: Affectation;
  onDelete: (id: string) => void;
  onEdit: (affectation: Affectation) => void;
}> = ({ affectation, onDelete, onEdit }) => {
  const isTaxi = affectation.chauffeur.toLowerCase().includes('taxi');
  
  const getHeureAffichage = (heure: number) => {
    if (heure === 0) return '00h';
    if (heure === 1) return '01h';
    if (heure === 2) return '02h';
    if (heure === 3) return '03h';
    return `${heure}h`;
  };

  // S'assurer que agents existe et est un tableau
  const agents = affectation.agents || [];

  // Fonction pour calculer la répartition par société
  const getRepartitionParSociete = (agents: AgentAffectation[]) => {
    const societes = agents.reduce((acc, agent) => {
      if (!acc[agent.societe]) {
        acc[agent.societe] = [];
      }
      acc[agent.societe].push(agent);
      return acc;
    }, {} as { [societe: string]: AgentAffectation[] });

    return Object.entries(societes).map(([societe, agents]) => ({
      societe,
      nombreAgents: agents.length,
      agents: agents
    }));
  };

  const repartitionSocietes = getRepartitionParSociete(agents);

  return (
    <div className="affectation-card">
      <div className="affectation-header">
        <div className="affectation-title">
          <span className={`chauffeur-badge ${isTaxi ? 'taxi' : 'normal'}`}>
            {isTaxi ? '🚕' : '🚗'} {affectation.chauffeur}
          </span>
          {affectation.vehicule && (
            <span className="vehicule-info">({affectation.vehicule})</span>
          )}
          <span className="heure">{getHeureAffichage(affectation.heure)}</span>
        </div>
        <div className="affectation-meta">
          <span className={`type-badge ${affectation.typeTransport.toLowerCase()}`}>
            {affectation.typeTransport}
          </span>
          <span className="jour">{affectation.jour}</span>
        </div>
      </div>
      
      <div className="affectation-details">
        <div className="agents-transportes">
          <strong>👥 Agents transportés ({agents.length}) :</strong>
          <div className="agents-list">
            {repartitionSocietes.map((item, index) => (
              <div key={index} className="societe-groupe">
                <div className="societe-header">
                  <span className="societe-nom">{item.societe}</span>
                  <span className="societe-count">({item.nombreAgents} agent(s))</span>
                </div>
                <div className="agents-societe">
                  {item.agents.map((agent, agentIndex) => (
                    <div key={agentIndex} className="agent-item">
                      <span className="agent-nom">{agent.agentNom}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-row">
          <span className="detail-label">💰 Prix total:</span>
          <span className="detail-value prix">{affectation.prixCourse} TND</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">📊 Répartition:</span>
          <div className="repartition-details">
            {repartitionSocietes.map((item, index) => {
              const prixParSociete = affectation.prixCourse / repartitionSocietes.length;
              return (
                <div key={index} className="repartition-item">
                  <span>{item.societe}: {prixParSociete.toFixed(2)} TND</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="detail-row">
          <span className="detail-label">📅 Date réelle:</span>
          <span className="detail-value">{affectation.dateReelle}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">📊 Statut:</span>
          <span className={`statut ${affectation.statutPaiement.toLowerCase().replace(' ', '-')}`}>
            {affectation.statutPaiement}
          </span>
        </div>
      </div>

      <div className="affectation-actions">
        <button 
          onClick={() => onEdit(affectation)}
          className="btn-edit"
          title="Modifier"
        >
          ✏️ Modifier
        </button>
        <button 
          onClick={() => affectation._id && onDelete(affectation._id)}
          className="btn-delete"
          title="Supprimer"
        >
          🗑️ Supprimer
        </button>
      </div>
    </div>
  );
};

// Composant principal GestionChauffeurs
export const GestionChauffeurs: React.FC = () => {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAffectation, setEditingAffectation] = useState<Affectation | null>(null);
  const [showForm, setShowForm] = useState(true);
  
  const { planningData } = usePlanning();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [affectationsData, agentsData] = await Promise.all([
        TransportApiService.getAffectations(),
        TransportApiService.getAgents()
      ]);
      setAffectations(affectationsData);
      setAgents(agentsData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAffectation = async (affectationData: Partial<Affectation>) => {
    try {
      // S'assurer que agents est défini
      const affectationComplete: Partial<Affectation> = {
        ...affectationData,
        agents: affectationData.agents || [], // Garantir que agents existe
        dateAjout: new Date().toLocaleDateString('fr-FR'),
        dateReelle: new Date().toLocaleDateString('fr-FR'),
        statutPaiement: 'Non payé'
      };

      if (editingAffectation) {
        // Mise à jour d'une affectation existante
        await TransportApiService.updateAffectation(editingAffectation._id!, affectationComplete);
        setEditingAffectation(null);
      } else {
        // Création d'une nouvelle affectation
        await TransportApiService.createAffectation(affectationComplete);
      }
      
      await loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur sauvegarde affectation:', error);
      alert('Erreur lors de la sauvegarde de l\'affectation');
    }
  };

  const handleDeleteAffectation = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette affectation ?')) {
      try {
        await TransportApiService.deleteAffectation(id);
        await loadData(); // Recharger les données
      } catch (error) {
        console.error('Erreur suppression affectation:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEditAffectation = (affectation: Affectation) => {
    setEditingAffectation(affectation);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingAffectation(null);
  };

  const affectationsFiltrees = (affectations || []).sort((a, b) => {
    const joursOrdre = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const ordreA = joursOrdre.indexOf(a.jour);
    const ordreB = joursOrdre.indexOf(b.jour);
    
    if (ordreA !== ordreB) {
      return ordreA - ordreB;
    }
    return a.heure - b.heure;
  });

  // Calcul sécurisé du total des agents
  const totalAgents = (affectationsFiltrees || []).reduce((total, aff) => {
    return total + (aff.agents ? aff.agents.length : 0);
  }, 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="gestion-chauffeurs">
      <div className="chauffeurs-header">
        <h1>👨‍✈️ Gestion des Chauffeurs</h1>
        <div className="header-info">
          {planningData.length > 0 ? (
            <span className="planning-loaded">📅 Planning chargé ({planningData.length} agents)</span>
          ) : (
            <span className="planning-missing">⚠️ Aucun planning chargé - Le filtrage ne fonctionnera pas</span>
          )}
          <button 
            className="btn-toggle-form"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '📋 Afficher les affectations' : '➕ Ajouter une affectation'}
          </button>
        </div>
      </div>
      
      <div className="chauffeurs-grid">
        {showForm && (
          <div className="add-affectation-section">
            <h2>{editingAffectation ? '✏️ Modifier l\'affectation' : '➕ Ajouter une affectation'}</h2>
            <AffectationForm 
              agents={agents}
              planningData={planningData}
              onSubmit={handleAddAffectation}
              affectationExistante={editingAffectation || undefined}
            />
            {editingAffectation && (
              <div className="edit-actions">
                <button 
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  ❌ Annuler la modification
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="affectations-list">
          <div className="affectations-header">
            <h2>📋 Affectations en cours ({affectationsFiltrees.length})</h2>
            <div className="affectations-stats">
              <span className="stat">
                Ramassage: {(affectationsFiltrees || []).filter(a => a.typeTransport === 'Ramassage').length}
              </span>
              <span className="stat">
                Départ: {(affectationsFiltrees || []).filter(a => a.typeTransport === 'Départ').length}
              </span>
              <span className="stat total-agents">
                Total agents: {totalAgents}
              </span>
            </div>
          </div>
          
          {(affectationsFiltrees || []).length > 0 ? (
            <div className="affectations-grid">
              {(affectationsFiltrees || []).map(affectation => (
                <AffectationCard
                  key={affectation._id}
                  affectation={affectation}
                  onDelete={handleDeleteAffectation}
                  onEdit={handleEditAffectation}
                />
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>📭 Aucune affectation enregistrée</p>
              <p className="no-data-subtitle">
                Utilisez le formulaire pour ajouter votre première affectation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};