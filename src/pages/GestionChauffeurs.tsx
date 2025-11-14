import React, { useState, useEffect } from 'react';
import { TransportApiService } from '../services/api';
import { Affectation, Agent, PlanningData } from '../@types/shared';
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
  
  // Pattern pour "8h-16h", "8h-17h", "13h-22h", etc. (corrigé l'échappement inutile)
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

// Composant AffectationForm avec filtrage automatique
const AffectationForm: React.FC<{ 
  agents: Agent[];
  planningData: PlanningData[];
  onSubmit: (data: Partial<Affectation>) => void;
}> = ({ agents, planningData, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<Affectation>>({
    chauffeur: '',
    heure: 6,
    agentNom: '',
    typeTransport: 'Ramassage' as 'Ramassage' | 'Départ',
    jour: 'Lundi',
    prixCourse: 10
  });

  const [agentsFiltres, setAgentsFiltres] = useState<Agent[]>([]);

  // Filtrer les agents selon le planning
  useEffect(() => {
    if (agents.length === 0 || planningData.length === 0) {
      setAgentsFiltres(agents);
      return;
    }

    const filtrerAgents = () => {
      const agentsAvecPlanning = agents.filter(agent => {
        // Trouver le planning de cet agent
        const planningAgent = planningData.find(p => p.Salarie === agent.nom);
        if (!planningAgent) return false;

        // Récupérer le planning du jour sélectionné
        const planningJour = planningAgent[formData.jour as keyof PlanningData] as string;
        const heures = extraireHeuresPlanning(planningJour);
        
        if (!heures) return false;

        if (formData.typeTransport === 'Ramassage') {
          // Ramassage: début à 6h, 7h ou 8h
          return [6, 7, 8].includes(heures.heureDebut);
        } else {
          // Départ: fin à 22h, 23h, 0h, 1h, 2h, 3h
          const heureFinNormalisee = heures.heureFin >= 24 ? heures.heureFin - 24 : heures.heureFin;
          return [22, 23, 0, 1, 2, 3].includes(heureFinNormalisee);
        }
      });

      setAgentsFiltres(agentsAvecPlanning);
      
      // Réinitialiser la sélection si l'agent actuel n'est pas dans la liste filtrée
      if (formData.agentNom && !agentsAvecPlanning.find(a => a.nom === formData.agentNom)) {
        setFormData(prev => ({ ...prev, agentNom: '' }));
      }
    };

    filtrerAgents();
  }, [formData.jour, formData.typeTransport, agents, planningData, formData.agentNom]);

  // Mettre à jour les heures disponibles selon le type de transport
  useEffect(() => {
    if (formData.typeTransport === 'Ramassage') {
      setFormData(prev => ({ ...prev, heure: 6 }));
    } else {
      setFormData(prev => ({ ...prev, heure: 22 }));
    }
  }, [formData.typeTransport]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.chauffeur || !formData.agentNom) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    onSubmit(formData);
    
    // Réinitialiser le formulaire (sauf type et jour)
    setFormData({
      chauffeur: '',
      heure: formData.typeTransport === 'Ramassage' ? 6 : 22,
      agentNom: '',
      typeTransport: formData.typeTransport,
      jour: formData.jour,
      prixCourse: 10
    });
  };

  const heuresRamassage = [6, 7, 8];
  const heuresDepart = [22, 23, 0, 1, 2, 3];

  // Utiliser des valeurs par défaut pour éviter les undefined
  const typeTransport = formData.typeTransport || 'Ramassage';

  return (
    <form onSubmit={handleSubmit} className="affectation-form">
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

      <div className="form-row">
        <div className="form-group">
          <label>Type de transport *</label>
          <select
            value={typeTransport}
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
      </div>

      <div className="form-group">
        <label>Heure *</label>
        <select
          value={formData.heure}
          onChange={(e) => setFormData({ ...formData, heure: parseInt(e.target.value) })}
        >
          {typeTransport === 'Ramassage' ? (
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

      <div className="form-group">
        <label>Agent *</label>
        <select
          value={formData.agentNom || ''}
          onChange={(e) => setFormData({ ...formData, agentNom: e.target.value })}
          required
        >
          <option value="">Sélectionner un agent</option>
          {agentsFiltres.map(agent => (
            <option key={agent._id} value={agent.nom}>
              {agent.nom}
            </option>
          ))}
        </select>
        <div className="filter-info">
          <span>
            {agentsFiltres.length} agent(s) disponible(s) pour {typeTransport.toLowerCase()} 
            {typeTransport === 'Ramassage' ? ' (début 6h-8h)' : ' (fin 22h-3h)'}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label>Prix de la course (TND) *</label>
        <input
          type="number"
          value={formData.prixCourse}
          onChange={(e) => setFormData({ ...formData, prixCourse: parseFloat(e.target.value) })}
          required
          min="0"
          step="0.5"
        />
      </div>

      <button type="submit" className="submit-btn">
        ✅ Ajouter l'affectation
      </button>
    </form>
  );
};

// Composant AffectationCard (inchangé)
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

  return (
    <div className="affectation-card">
      <div className="affectation-header">
        <div className="affectation-title">
          <span className={`chauffeur-badge ${isTaxi ? 'taxi' : 'normal'}`}>
            {isTaxi ? '🚕' : '🚗'} {affectation.chauffeur}
          </span>
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
        <div className="detail-row">
          <span className="detail-label">👤 Agent:</span>
          <span className="detail-value">{affectation.agentNom}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">📍 Adresse:</span>
          <span className="detail-value">{affectation.adresse}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">📞 Téléphone:</span>
          <span className="detail-value">{affectation.telephone}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">🏢 Société:</span>
          <span className="detail-value">{affectation.societe}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">💰 Prix:</span>
          <span className="detail-value prix">{affectation.prixCourse} TND</span>
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
      // Récupérer les informations de l'agent sélectionné
      const agent = agents.find(a => a.nom === affectationData.agentNom);
      if (!agent) {
        alert('Agent non trouvé');
        return;
      }

      const affectationComplete: Partial<Affectation> = {
        ...affectationData,
        adresse: agent.adresse,
        telephone: agent.telephone,
        societe: agent.societe,
        vehicule: agent.vehiculeChauffeur || 'Non renseigné',
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

  const affectationsFiltrees = affectations.sort((a, b) => {
    const joursOrdre = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const ordreA = joursOrdre.indexOf(a.jour);
    const ordreB = joursOrdre.indexOf(b.jour);
    
    if (ordreA !== ordreB) {
      return ordreA - ordreB;
    }
    return a.heure - b.heure;
  });

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
                Ramassage: {affectationsFiltrees.filter(a => a.typeTransport === 'Ramassage').length}
              </span>
              <span className="stat">
                Départ: {affectationsFiltrees.filter(a => a.typeTransport === 'Départ').length}
              </span>
            </div>
          </div>
          
          {affectationsFiltrees.length > 0 ? (
            <div className="affectations-grid">
              {affectationsFiltrees.map(affectation => (
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