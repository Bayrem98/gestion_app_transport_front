// src/components/AgentsList.tsx - Version avec SelectSociete
import React, { useState, useEffect } from 'react';
import { Agent, Societe } from '../@types/shared';
import './AgentsList.css';
import { SelectSociete } from '../pages/societes/SelectSociete';

interface AgentsListProps {
  agentsManquants: string[];
  onAgentAdded: (agentData: Partial<Agent>) => void;
}

export const AgentsList: React.FC<AgentsListProps> = ({ 
  agentsManquants, 
  onAgentAdded 
}) => {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [selectedSocieteId, setSelectedSocieteId] = useState<string>('');
  const [societes, setSocietes] = useState<Societe[]>([]);

  useEffect(() => {
    loadSocietes();
  }, []);

  const loadSocietes = () => {
    const saved = localStorage.getItem('societes_locales');
    setSocietes(saved ? JSON.parse(saved) : []);
  };

  const handleNewSociete = (societe: Societe) => {
    const newSocietes = [...societes, societe];
    setSocietes(newSocietes);
    localStorage.setItem('societes_locales', JSON.stringify(newSocietes));
  };

  const handleSubmit = (agentNom: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // Vérifier les champs requis
    if (!selectedSocieteId) {
      alert('❌ Veuillez sélectionner une société');
      return;
    }

    const agentData: Partial<Agent> = {
      nom: agentNom,
      adresse: formData.get('adresse') as string,
      telephone: formData.get('telephone') as string,
      societe: selectedSocieteId,
      voiturePersonnelle: formData.get('voiturePersonnelle') === 'on',
    };

    onAgentAdded(agentData);
    setExpandedAgent(null);
    setSelectedSocieteId('');
  };

  if (agentsManquants.length === 0) {
    return null;
  }

  return (
    <div className="agents-list">
      <h3>👥 Agents à compléter ({agentsManquants.length})</h3>
      <div className="agents-grid">
        {agentsManquants.map((agent, index) => (
          <div key={`${agent}-${index}`} className="agent-card">
            <div 
              className="agent-header"
              onClick={() => setExpandedAgent(expandedAgent === agent ? null : agent)}
            >
              <span>{agent}</span>
              <button className="expand-btn">
                {expandedAgent === agent ? '−' : '+'}
              </button>
            </div>
            
            {expandedAgent === agent && (
              <form 
                className="agent-form"
                onSubmit={(e) => handleSubmit(agent, e)}
              >
                <div className="form-group">
                  <label>Adresse *</label>
                  <input 
                    type="text" 
                    name="adresse" 
                    required 
                    placeholder="Adresse complète"
                  />
                </div>
                
                <div className="form-group">
                  <label>Téléphone *</label>
                  <input 
                    type="tel" 
                    name="telephone" 
                    required 
                    placeholder="Numéro de téléphone"
                  />
                </div>
                
                <div className="form-group">
                  <label>Société *</label>
                  <SelectSociete
                    value={selectedSocieteId}
                    onChange={setSelectedSocieteId}
                    required
                    placeholder="Sélectionnez ou créez une société"
                    societes={societes}
                  />
                </div>
                
                <div className="form-group checkbox">
                  <label>
                    <input type="checkbox" name="voiturePersonnelle" />
                    A une voiture personnelle
                  </label>
                </div>
                
                <button type="submit" className="submit-btn">
                  ✅ Enregistrer
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};