import React, { useState, useEffect } from 'react';
import { TransportApiService } from '../services/api';
import { Affectation, Agent } from '../@types/shared';
import './GestionChauffeurs.css';

// Composants enfants temporaires
const AffectationForm: React.FC<{ 
  agents: Agent[]; 
  onSubmit: (data: Partial<Affectation>) => void;
}> = ({ agents, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<Affectation>>({
    chauffeur: '',
    heure: 6,
    agentNom: '',
    typeTransport: 'Ramassage',
    jour: 'Lundi',
    prixCourse: 10
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      chauffeur: '',
      heure: 6,
      agentNom: '',
      typeTransport: 'Ramassage',
      jour: 'Lundi',
      prixCourse: 10
    });
  };

  return (
    <form onSubmit={handleSubmit} className="affectation-form">
      <div className="form-group">
        <label>Chauffeur *</label>
        <input
          type="text"
          value={formData.chauffeur}
          onChange={(e) => setFormData({...formData, chauffeur: e.target.value})}
          required
          placeholder="Nom du chauffeur"
        />
      </div>

      <div className="form-group">
        <label>Type de transport *</label>
        <select
          value={formData.typeTransport}
          onChange={(e) => setFormData({...formData, typeTransport: e.target.value as 'Ramassage' | 'Départ'})}
        >
          <option value="Ramassage">Ramassage</option>
          <option value="Départ">Départ</option>
        </select>
      </div>

      <div className="form-group">
        <label>Heure *</label>
        <select
          value={formData.heure}
          onChange={(e) => setFormData({...formData, heure: parseInt(e.target.value)})}
        >
          <option value={6}>6h</option>
          <option value={7}>7h</option>
          <option value={8}>8h</option>
          <option value={22}>22h</option>
          <option value={23}>23h</option>
        </select>
      </div>

      <div className="form-group">
        <label>Jour *</label>
        <select
          value={formData.jour}
          onChange={(e) => setFormData({...formData, jour: e.target.value})}
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
        <label>Agent *</label>
        <select
          value={formData.agentNom}
          onChange={(e) => setFormData({...formData, agentNom: e.target.value})}
          required
        >
          <option value="">Sélectionner un agent</option>
          {agents.map(agent => (
            <option key={agent._id} value={agent.nom}>
              {agent.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Prix de la course (€) *</label>
        <input
          type="number"
          value={formData.prixCourse}
          onChange={(e) => setFormData({...formData, prixCourse: parseFloat(e.target.value)})}
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

const AffectationCard: React.FC<{
  affectation: Affectation;
  onDelete: (id: string) => void;
}> = ({ affectation, onDelete }) => {
  const isTaxi = affectation.chauffeur.toLowerCase().includes('taxi');
  
  return (
    <div className="affectation-card">
      <div className="affectation-header">
        <span className={`chauffeur-badge ${isTaxi ? 'taxi' : 'normal'}`}>
          {isTaxi ? '🚕' : '🚗'} {affectation.chauffeur}
        </span>
        <span className="heure">{affectation.heure}h</span>
        <span className="type">{affectation.typeTransport}</span>
        <span className="jour">{affectation.jour}</span>
      </div>
      
      <div className="affectation-details">
        <p><strong>👤 Agent:</strong> {affectation.agentNom}</p>
        <p><strong>📍 Adresse:</strong> {affectation.adresse}</p>
        <p><strong>📞 Téléphone:</strong> {affectation.telephone}</p>
        <p><strong>🏢 Société:</strong> {affectation.societe}</p>
        <p><strong>💰 Prix:</strong> {affectation.prixCourse} €</p>
        <p><strong>📅 Date réelle:</strong> {affectation.dateReelle}</p>
        <p><strong>📊 Statut:</strong> {affectation.statutPaiement}</p>
      </div>

      <div className="affectation-actions">
        <button 
          onClick={() => affectation._id && onDelete(affectation._id)}
          className="delete-btn"
        >
          🗑️ Supprimer
        </button>
      </div>
    </div>
  );
};

export const GestionChauffeurs: React.FC = () => {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [affectationsData, agentsData] = await Promise.all([
        TransportApiService.getAffectations(),
        TransportApiService.getAgents()
      ]);
      setAffectations(affectationsData);
      setAgents(agentsData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
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
        vehicule: 'Non renseigné',
        dateAjout: new Date().toLocaleDateString('fr-FR'),
        dateReelle: new Date().toLocaleDateString('fr-FR'), // À améliorer avec la logique de dates
        statutPaiement: 'Non payé'
      };

      await TransportApiService.createAffectation(affectationComplete);
      await loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur ajout affectation:', error);
      alert('Erreur lors de l\'ajout de l\'affectation');
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

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="gestion-chauffeurs">
      <h1>👨‍✈️ Gestion des Chauffeurs</h1>
      
      <div className="chauffeurs-grid">
        <div className="add-affectation-section">
          <h2>➕ Ajouter une affectation</h2>
          <AffectationForm 
            agents={agents}
            onSubmit={handleAddAffectation}
          />
        </div>
        
        <div className="affectations-list">
          <h2>📋 Affectations en cours ({affectations.length})</h2>
          {affectations.length > 0 ? (
            affectations.map(affectation => (
              <AffectationCard
                key={affectation._id}
                affectation={affectation}
                onDelete={handleDeleteAffectation}
              />
            ))
          ) : (
            <p className="no-data">Aucune affectation enregistrée</p>
          )}
        </div>
      </div>
    </div>
  );
};