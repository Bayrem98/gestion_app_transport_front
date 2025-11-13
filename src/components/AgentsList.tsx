import React, { useState } from 'react';
import { Agent } from '../@types/shared';
import './AgentsList.css';

interface AgentsListProps {
  agentsManquants: string[];
  onAgentAdded: (agentData: Partial<Agent>) => void;
}

export const AgentsList: React.FC<AgentsListProps> = ({ 
  agentsManquants, 
  onAgentAdded 
}) => {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const handleSubmit = (agentNom: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const agentData: Partial<Agent> = {
      nom: agentNom,
      adresse: formData.get('adresse') as string,
      telephone: formData.get('telephone') as string,
      societe: formData.get('societe') as string,
      voiturePersonnelle: formData.get('voiturePersonnelle') === 'on',
    };

    onAgentAdded(agentData);
    setExpandedAgent(null);
  };

  if (agentsManquants.length === 0) {
    return null;
  }

  return (
    <div className="agents-list">
      <h3>👥 Agents à compléter ({agentsManquants.length})</h3>
      <div className="agents-grid">
        {agentsManquants.map((agent, index) => (
          <div key={agent} className="agent-card">
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
                  <input 
                    type="text" 
                    name="societe" 
                    required 
                    placeholder="Nom de la société"
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