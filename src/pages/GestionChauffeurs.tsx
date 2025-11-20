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
  
  const pattern = /(\d{1,2})h?\s*[-à]\s*(\d{1,2})h?/;
  const match = texte.match(pattern);

  if (match) {
    let heureDebut = parseInt(match[1]);
    let heureFin = parseInt(match[2]);

    if (heureFin < heureDebut && heureFin < 12) {
      heureFin += 24;
    }

    return { heureDebut, heureFin };
  }

  return null;
};

const normaliserHeureAffichage = (heure: number): number => {
  return heure >= 24 ? heure - 24 : heure;
};

const formaterHeure = (heure: number): string => {
  const heureNormalisee = normaliserHeureAffichage(heure);
  return `${heureNormalisee}H`;
};

// NOUVEAU COMPOSANT: Calendrier visuel
const CalendarPicker: React.FC<{
  selectedDate: string;
  onDateSelect: (date: string) => void;
  availableDates: string[];
}> = ({ selectedDate, onDateSelect, availableDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Obtenir le premier jour du mois
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startingDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  
  // Obtenir le nombre de jours dans le mois
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  // Générer les jours du mois
  const generateCalendarDays = () => {
    const daysArray = [];
    
    // Jours vides du mois précédent
    for (let i = 0; i < startingDay; i++) {
      daysArray.push(null);
    }
    
    // Jours du mois courant
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const dateString = date.toLocaleDateString('fr-FR');
      const hasAffectations = availableDates.includes(dateString);
      
      daysArray.push({
        day: i,
        date: dateString,
        hasAffectations,
        isCurrentMonth: true,
        isToday: isToday(date),
        isSelected: dateString === selectedDate
      });
    }
    
    return daysArray;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const calendarDays = generateCalendarDays();

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDateSelect = (date: string) => {
    onDateSelect(date);
    setShowCalendar(false);
  };

  const formatDateForDisplay = (date: string) => {
    if (!date) return 'Sélectionner une date';
    const [day, month, year] = date.split('/');
    return `${day}/${month}/${year}`;
  };

  // Fermer le calendrier quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.calendar-picker')) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

 return (
    <div className="calendar-picker">
      <div className="calendar-input-container">
        <input
          type="text"
          value={formatDateForDisplay(selectedDate)}
          readOnly
          onClick={() => setShowCalendar(!showCalendar)}
          className="calendar-input"
          placeholder="Sélectionner une date"
        />
        <span className="calendar-icon" onClick={() => setShowCalendar(!showCalendar)}>
          📅
        </span>
      </div>

      {showCalendar && (
        <div className="calendar-dropdown">
          <div className="calendar-header">
            <button onClick={goToPreviousMonth} className="calendar-nav-btn" title="Mois précédent">
              ◀
            </button>
            <span className="calendar-month">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button onClick={goToNextMonth} className="calendar-nav-btn" title="Mois suivant">
              ▶
            </button>
          </div>

          <div className="calendar-weekdays">
            {days.map(day => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`calendar-day ${
                  !day ? 'empty' : ''
                } ${
                  day && day.isToday ? 'today' : ''
                } ${
                  day && day.isSelected ? 'selected' : ''
                } ${
                  day && day.hasAffectations ? 'has-data' : ''
                }`}
                onClick={() => day && handleDateSelect(day.date)}
                title={day ? `${day.day} ${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}` : ''}
              >
                {day && (
                  <>
                    <span className="day-number">{day.day}</span>
                    {day.hasAffectations && (
                      <span className="data-indicator" title="Affectations présentes">•</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="calendar-footer">
            <button onClick={goToToday} className="today-btn">
              Aujourd'hui
            </button>
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot today"></span>
                <span>Aujourd'hui</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot has-data"></span>
                <span>Affectations</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant pour sélectionner les salariés avec cases à cocher
const AgentsSelection: React.FC<{
  agents: Agent[];
  planningData: PlanningData[];
  typeTransport: 'Ramassage' | 'Départ';
  jour: string;
  agentsSelectionnes: AgentAffectation[];
  onAgentsChange: (agents: AgentAffectation[]) => void;
}> = ({ agents, planningData, typeTransport, jour, agentsSelectionnes, onAgentsChange }) => {
  const [agentsDisponibles, setAgentsDisponibles] = useState<(Agent & { heure: number; heureAffichage: string; planning: string })[]>([]);
  const [agentsCoches, setAgentsCoches] = useState<{ [key: string]: boolean }>({});

  // Filtrer les salariés disponibles selon le planning
  useEffect(() => {
    console.log('🔍 Filtrage des salariés:', {
      agents: agents.length,
      planningData: planningData.length,
      typeTransport,
      jour,
      agentsSelectionnes: agentsSelectionnes.length
    });

    if (agents.length === 0 || planningData.length === 0) {
      console.log('❌ Données insuffisantes pour le filtrage');
      setAgentsDisponibles([]);
      return;
    }

    const filtrerAgents = () => {
      const agentsAvecHeure = agents
        .filter(agent => {
          // Vérifier si salarié n'est pas déjà sélectionné
          const estDejaSelectionne = agentsSelectionnes.find(a => a.agentNom === agent.nom);
          if (estDejaSelectionne) {
            console.log(`➡️ ${agent.nom} déjà sélectionné`);
            return false;
          }

          // Trouver le planning de ce salarié
          const planningAgent = planningData.find(p => p.Salarie === agent.nom);
          if (!planningAgent) {
            console.log(`❌ Aucun planning trouvé pour ${agent.nom}`);
            return false;
          }

          // Récupérer le planning du jour sélectionné
          const planningJour = planningAgent[jour as keyof PlanningData] as string;
          if (!planningJour) {
            console.log(`❌ Pas de planning pour ${jour} pour ${agent.nom}`);
            return false;
          }

          const heures = extraireHeuresPlanning(planningJour);
          if (!heures) {
            console.log(`❌ Pas d'heures valides pour ${agent.nom}`);
            return false;
          }

          let heureCalcul: number;
          let estDisponible = false;

          if (typeTransport === 'Ramassage') {
            heureCalcul = heures.heureDebut;
            estDisponible = [6, 7, 22, 23].includes(heureCalcul);
            console.log(`🚗 ${agent.nom} - Ramassage à ${heureCalcul}h -> ${estDisponible ? 'DISPONIBLE' : 'NON DISPONIBLE'}`);
          } else {
            heureCalcul = normaliserHeureAffichage(heures.heureFin);
            estDisponible = [22, 23, 0, 1, 2, 3].includes(heureCalcul);
            console.log(`✈️ ${agent.nom} - Départ à ${heureCalcul}h -> ${estDisponible ? 'DISPONIBLE' : 'NON DISPONIBLE'}`);
          }

          return estDisponible;
        })
        .map(agent => {
          const planningAgent = planningData.find(p => p.Salarie === agent.nom);
          const planningJour = planningAgent?.[jour as keyof PlanningData] as string;
          const heures = extraireHeuresPlanning(planningJour || '');
          
          let heureCalcul = 0;
          let heureAffichage = 'N/A';

          if (heures) {
            heureCalcul = typeTransport === 'Ramassage' 
              ? heures.heureDebut 
              : normaliserHeureAffichage(heures.heureFin);
            heureAffichage = formaterHeure(heureCalcul);
          }

          return {
            ...agent,
            heure: heureCalcul,
            heureAffichage: heureAffichage,
            planning: planningJour || ''
          };
        });

      // Trier les salariés par heure
      const agentsTries = agentsAvecHeure.sort((a, b) => {
        if (typeTransport === 'Ramassage') {
          const ordreRamassage = [22, 23, 6, 7];
          const indexA = ordreRamassage.indexOf(a.heure);
          const indexB = ordreRamassage.indexOf(b.heure);
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
        } else {
          const ordreDepart = [22, 23, 0, 1, 2, 3];
          const indexA = ordreDepart.indexOf(a.heure);
          const indexB = ordreDepart.indexOf(b.heure);
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
        }
        return parseInt(a.heure as unknown as string) - parseInt(b.heure as unknown as string);
      });

      console.log(`✅ ${agentsTries.length} salaries disponibles trouvés:`, 
        agentsTries.map(a => `${a.nom} (${a.heureAffichage})`)
      );

      setAgentsDisponibles(agentsTries);
      
      // Initialiser l'état des cases à cocher
      const cochesInitiales: { [key: string]: boolean } = {};
      agentsTries.forEach(agent => {
        cochesInitiales[agent.nom] = false;
      });
      setAgentsCoches(cochesInitiales);
    };

    filtrerAgents();
  }, [agents, planningData, typeTransport, jour, agentsSelectionnes]);

  const handleCocherAgent = (agentNom: string, estCoche: boolean) => {
    setAgentsCoches(prev => ({
      ...prev,
      [agentNom]: estCoche
    }));
  };

  const ajouterAgentsCoches = () => {
    const agentsAAjouter = agentsDisponibles.filter(agent => agentsCoches[agent.nom]);
    
    if (agentsAAjouter.length === 0) {
      alert('Veuillez sélectionner au moins un salarié');
      return;
    }

    const nouveauxAgents: AgentAffectation[] = agentsAAjouter.map(agent => ({
      agentNom: agent.nom,
      adresse: agent.adresse,
      telephone: agent.telephone,
      societe: agent.societe
    }));

    console.log(`➕ Ajout de ${agentsAAjouter.length} salariés:`, 
      agentsAAjouter.map(a => a.nom)
    );

    onAgentsChange([...agentsSelectionnes, ...nouveauxAgents]);
    
    // Réinitialiser les cases à cocher
    const cochesReset: { [key: string]: boolean } = {};
    agentsDisponibles.forEach(agent => {
      cochesReset[agent.nom] = false;
    });
    setAgentsCoches(cochesReset);
  };

  const supprimerAgent = (index: number) => {
    const agentASupprimer = agentsSelectionnes[index];
    console.log(`➖ Suppression de salarié:`, agentASupprimer.agentNom);
    
    const nouveauxAgents = agentsSelectionnes.filter((_, i) => i !== index);
    onAgentsChange(nouveauxAgents);
  };

  const selectionnerTous = () => {
    const tousCoches: { [key: string]: boolean } = {};
    agentsDisponibles.forEach(agent => {
      tousCoches[agent.nom] = true;
    });
    setAgentsCoches(tousCoches);
    console.log(`📋 Tous les salariés sélectionnés (${agentsDisponibles.length})`);
  };

  const deselectionnerTous = () => {
    const aucunCoche: { [key: string]: boolean } = {};
    agentsDisponibles.forEach(agent => {
      aucunCoche[agent.nom] = false;
    });
    setAgentsCoches(aucunCoche);
    console.log(`🗑️ Tous les salariés désélectionnés`);
  };

  const nombreAgentsCoches = Object.values(agentsCoches).filter(Boolean).length;

  return (
    <div className="agents-selection">
      <div className="selection-header">
        <label>Salariés à transporter *</label>
        <span className="agents-count">{agentsSelectionnes.length} salarié(s)</span>
      </div>

      {/* Liste des salariés sélectionnés */}
      {agentsSelectionnes.length > 0 && (
        <div className="agents-selectionnes">
          <h4>Salariés sélectionnés :</h4>
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
                  title="Retirer ce salarié"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sélection des salariés avec cases à cocher */}
      <div className="agents-disponibles">
        <div className="disponibles-header">
          <h4>
            Salariés disponibles 
            {agentsDisponibles.length > 0 && ` (${agentsDisponibles.length})`}
          </h4>
          <br />
          {agentsDisponibles.length > 0 && (
            <div className="actions-rapides">
              <button 
                type="button" 
                className="btn-action-rapide"
                onClick={selectionnerTous}
                style={{padding: 10, cursor: "pointer"}}
              >
                📋 Tout sélectionner
              </button>
              <button 
                type="button" 
                className="btn-action-rapide"
                onClick={deselectionnerTous}
                style={{padding: 10, cursor: "pointer", float: "right"}}
              >
                🗑️ Tout désélectionner
              </button>
            </div>
          )}
        </div>
        <br />
        {agentsDisponibles.length > 0 ? (
          <>
            <div className="liste-agents-coches">
              {agentsDisponibles.map(agent => (
                <div key={agent._id} className="agent-coche-item">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={agentsCoches[agent.nom] || false}
                      onChange={(e) => handleCocherAgent(agent.nom, e.target.checked)}
                      className="checkbox-agent"
                    />
                    <span className="checkmark"></span>
                    <div className="agent-info-coche">
                      <span className="agent-nom-coche">{agent.nom}</span>
                      <div className="agent-details">
                        <span className="agent-societe-coche">{agent.societe}-</span>
                        <span className="agent-heure">{agent.heureAffichage}</span>
                        <span className="agent-planning" title={agent.planning}>
                          📅
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <br />
            <div className="actions-ajout">
              <button
                type="button"
                className="btn-ajouter-multiple"
                onClick={ajouterAgentsCoches}
                disabled={nombreAgentsCoches === 0}
              >
                {nombreAgentsCoches === 0 ? (
                  "➡️ Sélectionnez des salariés à ajouter"
                ) : (
                  `➕ Confirmer les ${nombreAgentsCoches} salarié(s) sélectionné(s)`
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="aucun-agent-disponible">
          </div>
        )}
      </div>
      <br />
      <div className="filter-info">
        <span>
          {agentsDisponibles.length} salarié(s) disponible(s) pour {typeTransport.toLowerCase()} le {jour}
        </span>
      </div>
    </div>
  );
};

interface Chauffeur {
  _id?: string;
  nom: string;
  cin: string;
  telephone: string;
  societe: string;
  voiture: string;
  createdAt?: string;
}

// Composant AffectationForm avec design amélioré
const AffectationForm: React.FC<{ 
  agents: Agent[];
  planningData: PlanningData[];
  onSubmit: (data: Partial<Affectation>) => void;
  affectationExistante?: Affectation;
  chauffeurs: Chauffeur[];
}> = ({ agents, planningData, onSubmit, affectationExistante, chauffeurs }) => {
  const [formData, setFormData] = useState<Partial<Affectation>>({
    chauffeur: affectationExistante?.chauffeur || '',
    heure: affectationExistante?.heure || '6h',
    agents: affectationExistante?.agents || [],
    typeTransport: affectationExistante?.typeTransport || 'Ramassage',
    jour: affectationExistante?.jour || 'Lundi',
    prixCourse: affectationExistante?.prixCourse || 10,
    vehicule: affectationExistante?.vehicule || ''
  });

  const handleChauffeurChange = (chauffeurNom: string) => {
    const chauffeurSelectionne = chauffeurs.find(ch => ch.nom === chauffeurNom);
    
    setFormData(prev => ({
      ...prev,
      chauffeur: chauffeurNom,
      vehicule: chauffeurSelectionne?.voiture || ''
    }));
  };

  // Fonction pour calculer le prix par société
  const calculerPrixParSociete = (agents: AgentAffectation[], prixTotal: number): string => {
    if (!agents.length || !prixTotal) return '0 TND par société';
    
    const societesUniques = new Set(agents.map(agent => agent.societe));
    const nombreSocietes = societesUniques.size;
    const prixParSociete = prixTotal / nombreSocietes;
    
    return `${prixParSociete.toFixed(2)} TND par société (${nombreSocietes} société(s))`;
  };

  // Fonction pour obtenir la répartition détaillée par société
  const getRepartitionParSociete = (agents: AgentAffectation[], prixTotal: number): { societe: string; nombreAgents: number; prix: number }[] => {
    if (!agents.length || !prixTotal) return [];
    
    const agentsParSociete = agents.reduce((acc, agent) => {
      if (!acc[agent.societe]) {
        acc[agent.societe] = [];
      }
      acc[agent.societe].push(agent);
      return acc;
    }, {} as { [societe: string]: AgentAffectation[] });
    
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
    
    if (!formData.chauffeur || !formData.agents || formData.agents.length === 0) {
      alert('Veuillez remplir le chauffeur et sélectionner au moins un salarié');
      return;
    }

    onSubmit(formData);
    
    if (!affectationExistante) {
      setFormData({
        chauffeur: '',
        heure: formData.typeTransport === 'Ramassage' ? "6" : "22",
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

  const heuresRamassage = [22, 23, 6, 7];
  const heuresDepart = [22, 23, 0, 1, 2, 3];
   const getHeuresOptions = () => {
    return formData.typeTransport === 'Ramassage' ? heuresRamassage : heuresDepart;
  };

  const repartitionSocietes = getRepartitionParSociete(formData.agents || [], formData.prixCourse || 0);

  return (
    <form onSubmit={handleSubmit} className="affectation-form modern-form">
      <div className="form-section">
        <h3 className="section-title">👨‍✈️ Informations du chauffeur</h3>
        <div className="form-row">
          <div className="form-group modern">
            <label className="form-label">Nom du Chauffeur *</label>
            <div className="select-wrapper">
              <select
                value={formData.chauffeur || ''}
                onChange={(e) => handleChauffeurChange(e.target.value)}
                required
                className="modern-select"
              >
                <option value="">Sélectionner</option>
                {chauffeurs.map(chauffeur => (
                  <option key={chauffeur._id} value={chauffeur.nom}>
                    👨‍✈️ {chauffeur.nom}
                  </option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
            {formData.chauffeur && (
              <small className="field-info">
                Chauffeur sélectionné: {formData.chauffeur}
              </small>
            )}
          </div>

           <div className="form-group modern">
            <label className="form-label">Véhicule</label>
            <input
              type="text"
              value={formData.vehicule || ''}
              onChange={(e) => setFormData({ ...formData, vehicule: e.target.value })}
              placeholder="Véhicule"
              className="modern-input"
            />
            {formData.vehicule && (
              <small className="field-info">
                Véhicule: {formData.vehicule}
              </small>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">📅 Détails du transport</h3>
        <div className="form-row">
          <div className="form-group modern">
            <label className="form-label">Type de transport *</label>
            <div className="select-wrapper">
              <select
                value={formData.typeTransport}
                onChange={(e) => setFormData({ ...formData, typeTransport: e.target.value as 'Ramassage' | 'Départ' })}
                className="modern-select"
              >
                <option value="Ramassage">🚗 Ramassage</option>
                <option value="Départ">✈️ Départ</option>
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>

          <div className="form-group modern">
            <label className="form-label">Jour *</label>
            <div className="select-wrapper">
              <select
                value={formData.jour}
                onChange={(e) => setFormData({ ...formData, jour: e.target.value })}
                className="modern-select"
              >
                <option value="Lundi">📅 Lundi</option>
                <option value="Mardi">📅 Mardi</option>
                <option value="Mercredi">📅 Mercredi</option>
                <option value="Jeudi">📅 Jeudi</option>
                <option value="Vendredi">📅 Vendredi</option>
                <option value="Samedi">📅 Samedi</option>
                <option value="Dimanche">📅 Dimanche</option>
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>

          <div className="form-group modern">
            <label className="form-label">Heure *</label>
            <div className="select-wrapper">
               <select
                value={formData.heure} // ← Maintenant c'est une string
                onChange={(e) => setFormData({ ...formData, heure: e.target.value })} // ← Pas de parseInt
                className="modern-select"
              >
                {getHeuresOptions().map(heure => (
                  <option key={heure} value={heure}>
                    ⏰ {heure}
                  </option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sélection des agents avec cases à cocher */}
      <div className="form-section">
        <h3 className="section-title">👥 Sélection des salariés</h3>
        <AgentsSelection
          agents={agents}
          planningData={planningData}
          typeTransport={formData.typeTransport!}
          jour={formData.jour!}
          agentsSelectionnes={formData.agents || []}
          onAgentsChange={handleAgentsChange}
        />
      </div>

      <div className="form-section">
        <h3 className="section-title">💰 Tarification</h3>
        <div className="form-group modern prix-group">
          <label className="form-label">Prix total de la course (TND) *</label>
          <div className="prix-input-container">
            <input
              type="number"
              value={formData.prixCourse}
              onChange={(e) => setFormData({ ...formData, prixCourse: parseFloat(e.target.value) })}
              required
              min="0"
              step="0.5"
              className="modern-input prix-input"
            />
          </div>
          <small className="prix-info">
            Prix total pour {(formData.agents || []).length} salarié(s) - 
            {(formData.agents || []).length && formData.prixCourse ? 
              ` ${calculerPrixParSociete(formData.agents || [], formData.prixCourse)}` : 
              ' 0 TND par société'
            }
          </small>

          {repartitionSocietes.length > 0 && (
            <div className="repartition-societes">
              <strong>📊 Répartition par société :</strong>
              {repartitionSocietes.map((item, index) => (
                <div key={index} className="repartition-item">
                  <span className="societe-nom">{item.societe}</span>
                  <span className="societe-details">
                    ({item.nombreAgents} salarié(s)) : {item.prix.toFixed(2)} TND
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="submit-btn modern-btn">
        <span className="btn-icon">
          {affectationExistante ? '💾' : '✅'}
        </span>
        <span className="btn-text">
          {affectationExistante ? 'Mettre à jour' : 'Ajouter'} l'affectation
        </span>
      </button>
    </form>
  );
};

// COMPOSANT AffectationCard
const AffectationCard: React.FC<{
  affectation: Affectation;
  onDelete: (id: string) => void;
  onEdit: (affectation: Affectation) => void;
}> = ({ affectation, onDelete, onEdit }) => {
  const isTaxi = affectation.chauffeur.toLowerCase().includes('taxi');
  
  const getHeureAffichage = (heure: string) => {
    if (heure === '00') return '00';
    if (heure === '01') return '01';
    if (heure === '02') return '02';
    if (heure === '03') return '03';
    return `${heure}h`;
  };

  const agents = affectation.agents || [];

  return (
    <div className="affectation-card current">
      <div className="affectation-header">
        <div className="affectation-title">
          <span className={`chauffeur-badge `}>
             {affectation.chauffeur}
          </span>
          {affectation.vehicule && (
            <span className={`vehicule-info ${isTaxi ? 'taxi' : 'normal'}`}>({isTaxi ? '🚕' : '🚗'} {affectation.vehicule})</span>
          )}
        </div>
        <div className="affectation-meta">
          <span className={`type-badge ${affectation.typeTransport.toLowerCase()}`}>
            {affectation.typeTransport}
          </span>
          <span className="heure">{getHeureAffichage(affectation.heure)}</span>
        </div>
      </div>
      
      <div className="affectation-details">
        <div className="agents-count">
          👥 {agents.length} salarié(s) transporté(s)
        </div>
        
        <div className="detail-row">
          <span className="detail-label">💰 Prix total:</span>
          <span className="detail-value prix">{affectation.prixCourse} TND</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">📅 Date:</span>
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

// Composant pour l'affichage détaillé des affectations par date
const AffectationDetaillee: React.FC<{
  affectation: Affectation;
  onDelete: (id: string) => void;
  onEdit: (affectation: Affectation) => void;
}> = ({ affectation, onDelete, onEdit }) => {
  const isTaxi = affectation.vehicule.toLowerCase().includes('taxi');
  
  const getHeureAffichage = (heure: string) => {
    if (heure === '00') return '00';
    if (heure === '01') return '01';
    if (heure === '02') return '02';
    if (heure === '03') return '03';
    return `${heure}h`;
  };

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
    <div className="affectation-card detailed">
      <div className="affectation-header">
        <div className="affectation-title">
          <span className="chauffeur-badge">
             {affectation.chauffeur}
          </span>
          {affectation.vehicule && (
            <span className={`vehicule-info ${isTaxi ? 'taxi' : 'normal'}`}>({isTaxi ? '🚕' : '🚗'} {affectation.vehicule})</span>
          )}
          <span className="heure-detaillee">{getHeureAffichage(affectation.heure)}</span>
        </div>
        <div className="affectation-meta">
          <span className={`type-badge ${affectation.typeTransport.toLowerCase()}`}>
            {affectation.typeTransport}
          </span>
          <span className="statut-detaillee">{affectation.statutPaiement}</span>
        </div>
      </div>
      
      <div className="affectation-details">
        <div className="agents-transportes">
          <strong>👥 Salariés transportés ({agents.length}) :</strong>
          <br />
          <br />
          <div className="agents-list">
            {repartitionSocietes.map((item, index) => (
              <div key={index} className="societe-groupe">
                <div className="societe-header">
                  <span className="societe-nom" style={{fontWeight: "bold"}}>{item.societe}-</span>
                  <span className="societe-count" style={{fontWeight: "bold"}}>({item.nombreAgents} salarié)</span>
                </div>
                <div className="agents-societe">
                  {item.agents.map((agent, agentIndex) => (
                    <div key={agentIndex} className="agent-item">
                      <span className="agent-nom">{agent.agentNom}-/</span>
                      <span className="agent-adresse">{agent.adresse}</span>
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
          <span className="detail-label">📊 Répartition du prix:</span>
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
          <span className="detail-label">📅 Date d'ajout:</span>
          <span className="detail-value">{affectation.dateAjout}</span>
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

// NOUVEAU COMPOSANT: Carte récapitulative pour les statistiques
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
}> = ({ title, value, icon, color = 'blue', subtitle }) => {
  return (
    <div className={`stats-card stats-${color}`}>
      <div className="stats-icon">{icon}</div>
      <div className="stats-content">
        <div className="stats-value">{value}</div>
        <div className="stats-title">{title}</div>
        {subtitle && <div className="stats-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
};

// NOUVEAU COMPOSANT: Barre de recherche améliorée
const SearchBar: React.FC<{
  searchDate: string;
  searchType: string;
  onDateChange: (date: string) => void;
  onTypeChange: (type: string) => void;
  onClearSearch: () => void;
  availableDates: string[];
}> = ({ searchDate, searchType, onDateChange, onTypeChange, onClearSearch, availableDates }) => {
  return (
    <div className="search-bar-improved">
      <div className="search-header">
        <h3>🔍 Recherche avancée</h3>
        {(searchDate || searchType) && (
          <button onClick={onClearSearch} className="clear-search-btn">
            ❌ Effacer les filtres
          </button>
        )}
      </div>
      
      <div className="search-filters-grid">
        <div className="filter-group">
          <label className="filter-label">
            <span className="label-icon">📅</span>
            Sélectionner une date
          </label>
          <CalendarPicker
            selectedDate={searchDate}
            onDateSelect={onDateChange}
            availableDates={availableDates}
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label">
            <span className="label-icon">🚗</span>
            Type de transport
          </label>
          <select
            value={searchType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="search-select"
          >
            <option value="">Tous les types</option>
            <option value="Ramassage">🚗 Ramassage</option>
            <option value="Départ">✈️ Départ</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <span className="label-icon">⚡</span>
            Actions rapides
          </label>
          <div className="quick-actions">
            <button 
              onClick={() => onDateChange('')}
              className={`quick-action-btn ${!searchDate ? 'active' : ''}`}
            >
              Toutes les dates
            </button>
            <button 
              onClick={() => onTypeChange('')}
              className={`quick-action-btn ${!searchType ? 'active' : ''}`}
            >
              Tous les types
            </button>
          </div>
        </div>
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
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('');
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  
  const { planningData } = usePlanning();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [affectationsData, agentsData, chauffeursData] = await Promise.all([
        TransportApiService.getAffectations(),
        TransportApiService.getAgents(),
        TransportApiService.getChauffeurs()
      ]);
      setAffectations(affectationsData);
      setAgents(agentsData);
      setChauffeurs(chauffeursData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAffectation = async (affectationData: Partial<Affectation>) => {
    try {
      const affectationComplete: Partial<Affectation> = {
        ...affectationData,
        agents: affectationData.agents || [],
        dateAjout: new Date().toLocaleDateString('fr-FR'),
        dateReelle: new Date().toLocaleDateString('fr-FR'),
        statutPaiement: 'Non payé'
      };

      if (editingAffectation) {
        await TransportApiService.updateAffectation(editingAffectation._id!, affectationComplete);
        setEditingAffectation(null);
      } else {
        await TransportApiService.createAffectation(affectationComplete);
      }
      
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde affectation:', error);
      alert('Erreur lors de la sauvegarde de l\'affectation');
    }
  };

  const handleDeleteAffectation = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette affectation ?')) {
      try {
        await TransportApiService.deleteAffectation(id);
        await loadData();
      } catch (error) {
        console.error('Erreur suppression affectation:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEditAffectation = (affectation: Affectation) => {
    setEditingAffectation(affectation);
    setActiveTab('current');
  };

  const handleCancelEdit = () => {
    setEditingAffectation(null);
  };

  // Obtenir la date d'aujourd'hui
  const getTodayDate = () => {
    return new Date().toLocaleDateString('fr-FR');
  };

  // Filtrer les affectations en cours (aujourd'hui)
  const affectationsEnCours = affectations.filter(aff => 
    aff.dateReelle === getTodayDate()
  ).sort((a, b) => parseInt(a.heure as string) - parseInt(b.heure as string));

  // Grouper toutes les affectations par date
  const affectationsParDate = affectations.reduce((acc, affectation) => {
    const date = affectation.dateReelle;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(affectation);
    return acc;
  }, {} as { [date: string]: Affectation[] });

  // Obtenir toutes les dates disponibles
  const availableDates = Object.keys(affectationsParDate);

  // Filtrer les dates selon les critères de recherche
  const getDatesFiltrees = () => {
    let dates = availableDates;
    
    if (searchDate) {
      dates = dates.filter(date => date.includes(searchDate));
    }
    
    if (searchType) {
      dates = dates.filter(date => 
        affectationsParDate[date].some(aff => aff.typeTransport === searchType)
      );
    }
    
    // Trier les dates (plus récentes en premier)
    return dates.sort((a, b) => {
      const [jourA, moisA, anneeA] = a.split('/').map(Number);
      const [jourB, moisB, anneeB] = b.split('/').map(Number);
      const dateA = new Date(anneeA, moisA - 1, jourA);
      const dateB = new Date(anneeB, moisB - 1, jourB);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const datesFiltrees = getDatesFiltrees();

  // Calcul des statistiques globales
  const totalAffectations = affectations.length;
  const totalAgents = affectations.reduce((total, aff) => total + (aff.agents?.length || 0), 0);
  const totalRamassage = affectations.filter(a => a.typeTransport === 'Ramassage').length;
  const totalDepart = affectations.filter(a => a.typeTransport === 'Départ').length;
  const totalPrix = affectations.reduce((sum, a) => sum + a.prixCourse, 0);
  const prixMoyen = totalAffectations > 0 ? totalPrix / totalAffectations : 0;

  // Statistiques pour les résultats filtrés
  const affectationsFiltrees = datesFiltrees.flatMap(date => affectationsParDate[date]);
  const agentsFiltres = affectationsFiltrees.reduce((total, aff) => total + (aff.agents?.length || 0), 0);
  const prixFiltre = affectationsFiltrees.reduce((sum, a) => sum + a.prixCourse, 0);

  const handleClearSearch = () => {
    setSearchDate('');
    setSearchType('');
  };

  // NOUVELLE FONCTION: Gérer la sélection d'une date
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

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
            <span className="planning-missing">⚠️ Aucun planning chargé - Importez d'abord un planning</span>
          )}
          <div className="header-stats">
            <span className="stat-total">{totalAffectations} Affectations</span>
            <span className="stat-agents">{totalAgents} Salariés</span>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="tabs-navigation">
        <button 
          className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          📋 Affectations en cours
          {affectationsEnCours.length > 0 && (
            <span className="tab-badge">{affectationsEnCours.length}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('all');
            setSelectedDate(null);
            handleClearSearch();
          }}
        >
          📊 Récapitulatif des courses
          <span className="tab-badge">{totalAffectations}</span>
        </button>
      </div>

      <div className="chauffeurs-content">
        {activeTab === 'current' ? (
          <>
            {/* Formulaire d'ajout */}
            <div className="add-affectation-section">
              <h2>{editingAffectation ? '✏️ Modifier l\'affectation' : '➕ Ajouter une affectation'}</h2>
              <AffectationForm 
                agents={agents}
                planningData={planningData}
                chauffeurs={chauffeurs}
                onSubmit={handleAddAffectation}
                affectationExistante={editingAffectation || undefined}
              />
              {editingAffectation && (
                <div className="edit-actions">
                  <button 
                    onClick={handleCancelEdit}
                    className="modern-btn cancel-btn"
                  >
                    ❌ Annuler la modification
                  </button>
                </div>
              )}
            </div>

            {/* Affectations en cours */}
            <div className="affectations-content">
              <div className="affectations-courantes">
                <div className="section-header">
                  <h2>📋 Affectations du jour ({getTodayDate()})</h2>
                  <div className="stats-courantes">
                    <span className="stat">
                     Ramassage: {affectationsEnCours.filter(a => a.typeTransport === 'Ramassage').length}
                    </span>
                    <span className="stat">
                     Départ: {affectationsEnCours.filter(a => a.typeTransport === 'Départ').length}
                    </span>
                    <span className="stat">
                     Salariés: {affectationsEnCours.reduce((total, aff) => total + (aff.agents?.length || 0), 0)}
                    </span>
                  </div>
                </div>

                {affectationsEnCours.length > 0 ? (
                  <div className="affectations-grid current">
                    {affectationsEnCours.map(affectation => (
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
                    <div className="no-data-icon">📭</div>
                    <p>Aucune affectation pour aujourd'hui</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // NOUVELLE VUE RÉCAPITULATIVE AMÉLIORÉE
          <div className="recap-view-container">
            {!selectedDate ? (
              // Vue liste des dates
              <>
                {/* Barre de recherche améliorée */}
                <SearchBar
                  searchDate={searchDate}
                  searchType={searchType}
                  onDateChange={setSearchDate}
                  onTypeChange={setSearchType}
                  onClearSearch={handleClearSearch}
                  availableDates={availableDates}
                />

                {/* Cartes de statistiques */}
                <div className="stats-grid">
                  <StatsCard
                    title="Total Affectations"
                    value={searchDate || searchType ? affectationsFiltrees.length : totalAffectations}
                    icon="📊"
                    color="blue"
                    subtitle={searchDate || searchType ? "Filtrées" : "Global"}
                  />
                  <StatsCard
                    title="Salariés Transportés"
                    value={searchDate || searchType ? agentsFiltres : totalAgents}
                    icon="👥"
                    color="green"
                    subtitle={searchDate || searchType ? "Filtrés" : "Total"}
                  />
                  <StatsCard
                    title="Courses Ramassage"
                    value={searchDate || searchType ? 
                      affectationsFiltrees.filter(a => a.typeTransport === 'Ramassage').length : 
                      totalRamassage
                    }
                    icon="🚗"
                    color="orange"
                    subtitle={searchDate || searchType ? "Filtrées" : "Total"}
                  />
                  <StatsCard
                    title="Courses Départ"
                    value={searchDate || searchType ? 
                      affectationsFiltrees.filter(a => a.typeTransport === 'Départ').length : 
                      totalDepart
                    }
                    icon="✈️"
                    color="purple"
                    subtitle={searchDate || searchType ? "Filtrées" : "Total"}
                  />
                  <StatsCard
                    title="Prix"
                    value={`${(searchDate || searchType ? prixFiltre : totalPrix).toFixed(2)} TND`}
                    icon="💰"
                    color="red"
                    subtitle={`Moyenne: ${prixMoyen.toFixed(2)} TND/course`}
                  />
                </div>

                {/* Résultats de recherche */}
                <div className="search-results-section">
                  <div className="results-header">
                    <h3>
                      {searchDate || searchType ? '🔍 Résultats de la recherche' : '📅 Toutes les affectations'}
                    </h3>
                    <div className="results-info">
                      <span>
                        {datesFiltrees.length} date(s) - {affectationsFiltrees.length} affectation(s)
                      </span>
                      {(searchDate || searchType) && (
                        <button onClick={handleClearSearch} className="modern-btn secondary">
                          🔄 Afficher tout
                        </button>
                      )}
                    </div>
                  </div>

                  {datesFiltrees.length > 0 ? (
                    <div className="dates-timeline">
                      {datesFiltrees.map(date => (
                        <div key={date} className="date-group">
                          <div className="date-header-improved">
                            <div className="date-title">
                              <span className="date-icon">📅</span>
                              <span className="date-text">{date}</span>
                              <span className="date-day">
                                {new Date(date.split('/').reverse().join('-')).toLocaleDateString('fr-FR', { weekday: 'long' })}
                              </span>
                            </div>
                            <div className="date-stats">
                              <span className="date-stat">
                                🚗 {affectationsParDate[date].filter(a => a.typeTransport === 'Ramassage').length}
                              </span>
                              <span className="date-stat">
                                ✈️ {affectationsParDate[date].filter(a => a.typeTransport === 'Départ').length}
                              </span>
                              <span className="date-stat">
                                👥 {affectationsParDate[date].reduce((sum, a) => sum + (a.agents?.length || 0), 0)}
                              </span>
                              <span className="date-stat">
                                💰 {affectationsParDate[date].reduce((sum, a) => sum + a.prixCourse, 0)} TND
                              </span>
                            </div>
                            <button 
                              onClick={() => handleDateSelect(date)}
                              className="view-details-btn"
                            >
                              📋 Voir le détail
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">
                      <div className="no-data-icon">🔍</div>
                      <p>Aucune affectation trouvée</p>
                      <p className="no-data-subtitle">
                        {searchDate || searchType ? 
                          'Aucun résultat pour vos critères de recherche' : 
                          'Aucune affectation enregistrée'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Vue détaillée d'une date sélectionnée
              <div className="date-detail-container">
                <div className="date-detail-header">
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="back-button"
                    style={{padding: 8, cursor: "pointer"}}
                  >
                    ← Retour à la liste
                  </button>
                  <br />
                  <br />
                  <h2>📅 Détail des affectations du {selectedDate}</h2>
                  <br />
                  <div className="date-detail-stats">
                    <span className="stat" style={{padding: 10}}>
                      🚗 {affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Ramassage').length || 0} Ramassages
                    </span>
                    <span className="stat" style={{padding: 10}}>
                      ✈️ {affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Départ').length || 0} Départs
                    </span>
                    <span className="stat" style={{padding: 10}}>
                      👥 {affectationsParDate[selectedDate]?.reduce((sum, a) => sum + (a.agents?.length || 0), 0) || 0} Salariés
                    </span>
                    <span className="stat" style={{padding: 10}}>
                      💰 {affectationsParDate[selectedDate]?.reduce((sum, a) => sum + a.prixCourse, 0) || 0} TND
                    </span>
                  </div>
                </div>
                <br />
                <div className="date-detail-content">
                  {/* Ramassages */}
                  {affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Ramassage').length > 0 && (
                    <div className="transport-section">
                      <h3 className="section-title ramassage">
                        🚗 Courses de Ramassage ({affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Ramassage').length})
                      </h3>
                      <div className="affectations-list-detailed">
                        {affectationsParDate[selectedDate]
                          ?.filter(a => a.typeTransport === 'Ramassage')
                          .sort((a, b) => parseInt(a.heure as string) - parseInt(b.heure as string))
                          .map(affectation => (
                            <AffectationDetaillee
                              key={affectation._id}
                              affectation={affectation}
                              onDelete={handleDeleteAffectation}
                              onEdit={handleEditAffectation}
                            />
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {/* Départs */}
                  {affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Départ').length > 0 && (
                    <div className="transport-section">
                      <h3 className="section-title depart">
                        ✈️ Courses de Départ ({affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Départ').length})
                      </h3>
                      <div className="affectations-list-detailed">
                        {affectationsParDate[selectedDate]
                          ?.filter(a => a.typeTransport === 'Départ')
                          .sort((a, b) => parseInt(a.heure as string) - parseInt(b.heure as string))
                          .map(affectation => (
                            <AffectationDetaillee
                              key={affectation._id}
                              affectation={affectation}
                              onDelete={handleDeleteAffectation}
                              onEdit={handleEditAffectation}
                            />
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {(!affectationsParDate[selectedDate] || affectationsParDate[selectedDate].length === 0) && (
                    <div className="no-data">
                      <div className="no-data-icon">📭</div>
                      <p>Aucune affectation pour cette date</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};