import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TransportApiService } from '../services/api';
import { Agent } from '../@types/shared';
import './GestionAgents.css';

export const GestionAgents: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    // Vérifier si on doit ouvrir le formulaire d'édition depuis l'URL
    const urlParams = new URLSearchParams(location.search);
    const editAgentId = urlParams.get('edit');
    const returnTo = urlParams.get('returnTo');
    
    if (editAgentId && agents.length > 0) {
      // Trouver l'agent à éditer
      const agentToEdit = agents.find(agent => agent._id === editAgentId);
      if (agentToEdit) {
        setEditingAgent(agentToEdit);
        setShowForm(true);
        
        // Faire défiler jusqu'au formulaire
        setTimeout(() => {
          const formElement = document.querySelector('.agent-form-container');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [location.search, agents]);

  const loadAgents = async () => {
    try {
      const agentsData = await TransportApiService.getAgents();
      setAgents(agentsData);
    } catch (error) {
      console.error('Erreur chargement agents:', error);
      alert('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const agentData: Partial<Agent> = {
      nom: formData.get('nom') as string,
      adresse: formData.get('adresse') as string,
      telephone: formData.get('telephone') as string,
      societe: formData.get('societe') as string,
      voiturePersonnelle: formData.get('voiturePersonnelle') === 'on',
      chauffeurNom: formData.get('chauffeurNom') as string,
      vehiculeChauffeur: formData.get('vehiculeChauffeur') as string,
    };

    try {
      if (editingAgent) {
        await TransportApiService.updateAgent(editingAgent._id!, agentData);
        alert('✅ Agent mis à jour avec succès !');
      } else {
        await TransportApiService.createAgent(agentData);
        alert('✅ Agent créé avec succès !');
      }
      await loadAgents();
      setShowForm(false);
      setEditingAgent(null);
      
      // Vérifier si on doit retourner à la page d'import
      const urlParams = new URLSearchParams(location.search);
      const returnTo = urlParams.get('returnTo');
      
      if (returnTo === 'import') {
        // Retourner à la page d'import
        navigate('/import-agents');
      } else {
        // Nettoyer l'URL après sauvegarde réussie
        navigate('/agents', { replace: true });
      }
      
      // Reset form
      e.currentTarget.reset();
    } catch (error) {
      console.error('Erreur sauvegarde agent:', error);
      alert('❌ Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setShowForm(true);
    // Mettre à jour l'URL pour refléter l'édition
    navigate(`/agents?edit=${agent._id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
      try {
        await TransportApiService.deleteAgent(id);
        await loadAgents();
        alert('✅ Agent supprimé avec succès !');
      } catch (error) {
        console.error('Erreur suppression agent:', error);
        alert('❌ Erreur lors de la suppression');
      }
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingAgent(null);
    
    // Vérifier si on doit retourner à la page d'import
    const urlParams = new URLSearchParams(location.search);
    const returnTo = urlParams.get('returnTo');
    
    if (returnTo === 'import') {
      // Retourner à la page d'import
      navigate('/import-agents');
    } else {
      // Nettoyer l'URL lors de l'annulation
      navigate('/agents', { replace: true });
    }
  };

  // Bouton pour retourner à l'import
  const handleReturnToImport = () => {
    navigate('/import-agents');
  };

  const filteredAgents = agents.filter(agent =>
    agent.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.societe.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.adresse.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Chargement des agents...</div>;
  }

  return (
    <div className="gestion-agents">
      <div className="agents-header">
        <h1>👤 Gestion des Agents</h1>
        <div className="header-actions">
          {location.search.includes('returnTo=import') && (
            <button 
              className="btn-secondary"
              onClick={handleReturnToImport}
            >
              ↩️ Retour à l'import
            </button>
          )}
          <button 
            className="btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingAgent(null);
              if (showForm) {
                navigate('/agents', { replace: true });
              }
            }}
          >
            {showForm ? '❌ Annuler' : '➕ Ajouter un agent'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="agent-form-container">
          <h2>{editingAgent ? '✏️ Modifier l\'agent' : '➕ Nouvel agent'}</h2>
          <form onSubmit={handleSubmit} className="agent-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nom complet *</label>
                <input
                  type="text"
                  name="nom"
                  defaultValue={editingAgent?.nom}
                  required
                  placeholder="Nom et prénom"
                />
              </div>
              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="tel"
                  name="telephone"
                  defaultValue={editingAgent?.telephone}
                  required
                  placeholder="Numéro de téléphone"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Adresse complète *</label>
              <textarea
                name="adresse"
                defaultValue={editingAgent?.adresse}
                required
                placeholder="Adresse complète avec code postal"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Société *</label>
                <input
                  type="text"
                  name="societe"
                  defaultValue={editingAgent?.societe}
                  required
                  placeholder="Nom de la société"
                />
              </div>
              <div className="form-group">
                <label>Chauffeur attitré</label>
                <input
                  type="text"
                  name="chauffeurNom"
                  defaultValue={editingAgent?.chauffeurNom}
                  placeholder="Nom du chauffeur"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Véhicule du chauffeur</label>
                <input
                  type="text"
                  name="vehiculeChauffeur"
                  defaultValue={editingAgent?.vehiculeChauffeur}
                  placeholder="Modèle du véhicule"
                />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="voiturePersonnelle"
                    defaultChecked={editingAgent?.voiturePersonnelle}
                  />
                  <span className="checkmark"></span>
                  A une voiture personnelle
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingAgent ? '💾 Mettre à jour' : '✅ Enregistrer'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleCancelEdit}
              >
                ❌ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="agents-content">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Rechercher un agent par nom, société ou adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="agents-count">
            {filteredAgents.length} agent(s) trouvé(s)
          </span>
        </div>

        <div className="agents-grid">
          {filteredAgents.length > 0 ? (
            filteredAgents.map(agent => (
              <div key={agent._id} className="agent-card">
                <div className="agent-card-header">
                  <h3>{agent.nom}</h3>
                  <div className="agent-actions">
                    <button 
                      onClick={() => handleEdit(agent)}
                      className="btn-edit"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => agent._id && handleDelete(agent._id)}
                      className="btn-delete"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="agent-details">
                  <p><strong>📞 Téléphone:</strong> {agent.telephone}</p>
                  <p><strong>📍 Adresse:</strong> {agent.adresse}</p>
                  <p><strong>🏢 Société:</strong> {agent.societe}</p>
                  
                  {agent.chauffeurNom && (
                    <p><strong>🚗 Chauffeur:</strong> {agent.chauffeurNom}</p>
                  )}
                  
                  {agent.vehiculeChauffeur && (
                    <p><strong>🚙 Véhicule:</strong> {agent.vehiculeChauffeur}</p>
                  )}
                  
                  <p>
                    <strong>🚘 Voiture perso:</strong> 
                    <span className={agent.voiturePersonnelle ? 'status-yes' : 'status-no'}>
                      {agent.voiturePersonnelle ? 'Oui' : 'Non'}
                    </span>
                  </p>

                  {agent.createdAt && (
                    <p className="creation-date">
                      <strong>📅 Créé le:</strong> {new Date(agent.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">
              {searchTerm ? 'Aucun agent trouvé pour votre recherche' : 'Aucun agent enregistré'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};