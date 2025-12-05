import React, { useState, useEffect } from 'react';
import './AffectationFormPage.css';
import 'react-datepicker/dist/react-datepicker.css';
import { Affectation, Agent, AgentAffectation, PlanningData } from '../../@types/shared';
import { TransportApiService } from '../../services/api';
import { usePlanning } from '../PlanningContext';

// Fonctions utilitaires (gardées de votre code original)
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

// Fonction pour formater la date au format DD/MM/YYYY
const formaterDateFrancais = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Fonction pour parser une date du format DD/MM/YYYY
const parserDateFrancais = (dateString: string): Date => {
  const [day, month, year] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day);
};

// Composant CalendarPicker pour le formulaire
const CalendarPickerForm: React.FC<{
  selectedDate: string;
  onDateSelect: (date: string) => void;
}> = ({ selectedDate, onDateSelect }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      const dateString = formaterDateFrancais(date);
      
      daysArray.push({
        day: i,
        date: dateString,
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
    onDateSelect(formaterDateFrancais(new Date()));
    setShowCalendar(false);
  };

  const handleDateSelect = (date: string) => {
    onDateSelect(date);
    setShowCalendar(false);
  };

  const formatDateForDisplay = (date: string) => {
    if (!date) return 'Sélectionner une date';
    return date;
  };

  // Fermer le calendrier quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.calendar-picker-form')) {
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
    <div className="calendar-picker-form">
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
                }`}
                onClick={() => day && handleDateSelect(day.date)}
                title={day ? `${day.day} ${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}` : ''}
              >
                {day && (
                  <>
                    <span className="day-number">{day.day}</span>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="calendar-footer">
            <button onClick={goToToday} className="today-btn">
              Aujourd'hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant AgentsSelection (identique à votre code original)
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
          const estDejaSelectionne = agentsSelectionnes.find(a => a.agentNom === agent.nom);
          if (estDejaSelectionne) {
            console.log(`➡️ ${agent.nom} déjà sélectionné`);
            return false;
          }

          const planningAgent = planningData.find(p => p.Salarie === agent.nom);
          if (!planningAgent) {
            console.log(`❌ Aucun planning trouvé pour ${agent.nom}`);
            return false;
          }

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
          } else {
            heureCalcul = normaliserHeureAffichage(heures.heureFin);
            estDisponible = [22, 23, 0, 1, 2, 3].includes(heureCalcul);
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

      setAgentsDisponibles(agentsTries);
      
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

    onAgentsChange([...agentsSelectionnes, ...nouveauxAgents]);
    
    const cochesReset: { [key: string]: boolean } = {};
    agentsDisponibles.forEach(agent => {
      cochesReset[agent.nom] = false;
    });
    setAgentsCoches(cochesReset);
  };

  const supprimerAgent = (index: number) => {
    const nouveauxAgents = agentsSelectionnes.filter((_, i) => i !== index);
    onAgentsChange(nouveauxAgents);
  };

  const selectionnerTous = () => {
    const tousCoches: { [key: string]: boolean } = {};
    agentsDisponibles.forEach(agent => {
      tousCoches[agent.nom] = true;
    });
    setAgentsCoches(tousCoches);
  };

  const deselectionnerTous = () => {
    const aucunCoche: { [key: string]: boolean } = {};
    agentsDisponibles.forEach(agent => {
      aucunCoche[agent.nom] = false;
    });
    setAgentsCoches(aucunCoche);
  };

  const nombreAgentsCoches = Object.values(agentsCoches).filter(Boolean).length;

  return (
    <div className="agents-selection">
      <div className="selection-header">
        <label>Salariés à transporter *</label>
        <span className="agents-count" style={{color: "white"}}>{agentsSelectionnes.length} salarié(s)</span>
      </div>

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
              >
                📋 Tout sélectionner
              </button>
              <button 
                type="button" 
                className="btn-action-rapide"
                onClick={deselectionnerTous}
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

interface AffectationFormPageProps {
  onAffectationAdded: () => void;
  onNavigateToValidation: () => void;
}

export const AffectationFormPage: React.FC<AffectationFormPageProps> = ({ 
  onAffectationAdded, 
  onNavigateToValidation 
}) => {
  // Formater la date actuelle au format DD/MM/YYYY
  const getTodayFrenchFormat = (): string => {
    return formaterDateFrancais(new Date());
  };

  const [formData, setFormData] = useState<Partial<Affectation>>({
    chauffeur: '',
    heure: "6",
    agents: [],
    typeTransport: 'Ramassage',
    jour: 'Lundi',
    prixCourse: 10,
    vehicule: '',
    dateReelle: getTodayFrenchFormat(), // Utiliser le format français
  });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const { planningData } = usePlanning();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsData, chauffeursData] = await Promise.all([
        TransportApiService.getAgents(),
        TransportApiService.getChauffeurs()
      ]);
      setAgents(agentsData);
      setChauffeurs(chauffeursData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleChauffeurChange = (chauffeurNom: string) => {
    const chauffeurSelectionne = chauffeurs.find(ch => ch.nom === chauffeurNom);
    
    setFormData(prev => ({
      ...prev,
      chauffeur: chauffeurNom,
      vehicule: chauffeurSelectionne?.voiture || ''
    }));
  };

   const handleDateSelect = (date: string) => {
    console.log('📅 Date sélectionnée dans le formulaire:', date);
    setFormData(prev => ({
      ...prev,
      dateReelle: date
    }));
  };


  const calculerPrixParSociete = (agents: AgentAffectation[], prixTotal: number): string => {
    if (!agents.length || !prixTotal) return '0 TND par société';
    
    const societesUniques = new Set(agents.map(agent => agent.societe));
    const nombreSocietes = societesUniques.size;
    const prixParSociete = prixTotal / nombreSocietes;
    
    return `${prixParSociete.toFixed(2)} TND par société (${nombreSocietes} société(s))`;
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chauffeur || !formData.agents || formData.agents.length === 0) {
      alert('Veuillez remplir le chauffeur et sélectionner au moins un salarié');
      return;
    }

    try {
      const affectationComplete: Partial<Affectation> = {
        ...formData,
        dateAjout: getTodayFrenchFormat(), // Utiliser le format français
        dateReelle: formData.dateReelle || getTodayFrenchFormat(),
        statutPaiement: 'Non payé',
      };

      console.log('📤 Envoi de l\'affectation:', affectationComplete);

      await TransportApiService.createAffectation(affectationComplete);
      
      setSubmitSuccess(true);
      onAffectationAdded();
      
      // Réinitialiser le formulaire
      setFormData({
        chauffeur: '',
        heure: formData.typeTransport === 'Ramassage' ? "6" : "22",
        agents: [],
        typeTransport: formData.typeTransport || 'Ramassage',
        jour: formData.jour || 'Lundi',
        prixCourse: 10,
        vehicule: '',
        dateReelle: formData.dateReelle,
      });

      setTimeout(() => setSubmitSuccess(false), 3000);
      
      // Rediriger directement vers le récap
      onNavigateToValidation();
      
    } catch (error) {
      console.error('Erreur sauvegarde affectation:', error);
      alert('Erreur lors de la sauvegarde de l\'affectation');
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="affectation-form-page">
      <div className="page-header">
        <h1>➕ Ajouter une Affectation</h1>
        <div className="header-actions">
        </div>
      </div>

      <div className="form-container">
        {submitSuccess && (
          <div className="success-message">
            ✅ Affectation ajoutée avec succès ! Redirection vers la base de données...
          </div>
        )}

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
                    <option value="Départ">🏠 Départ</option>
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
                <label className="form-label">Date réelle *</label>
                <CalendarPickerForm
                  selectedDate={formData.dateReelle || getTodayFrenchFormat()}
                  onDateSelect={handleDateSelect}
                />
                {formData.dateReelle && (
                  <small className="field-info">
                    Date sélectionnée: {formData.dateReelle}
                  </small>
                )}
              </div>

              <div className="form-group modern">
                <label className="form-label">Heure *</label>
                <div className="select-wrapper">
                  <select
                    value={formData.heure}
                    onChange={(e) => setFormData({ ...formData, heure: e.target.value })}
                    className="modern-select"
                  >
                    {getHeuresOptions().map(heure => (
                      <option key={heure} value={heure}>
                        ⏰ {heure}H
                      </option>
                    ))}
                  </select>
                  <div className="select-arrow">▼</div>
                </div>
              </div>
            </div>
          </div>

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

          <div className="form-actions">
            <button type="submit" className="submit-btn modern-btn">
              <span className="btn-icon">✅</span>
              <span className="btn-text">Ajouter l'affectation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};