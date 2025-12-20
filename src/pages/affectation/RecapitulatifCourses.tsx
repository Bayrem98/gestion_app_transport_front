import React, { useState, useEffect } from 'react';
import { TransportApiService } from '../../services/api';
import { Affectation, Agent, AgentAffectation } from '../../@types/shared';
import { usePlanning } from '../PlanningContext';
import './RecapitulatifCourses.css';

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
          <span className="statut-detaillee" style={{float: "right", backgroundColor: "gold", color: "black"}}>{affectation.statutPaiement}</span>
        </div>
      </div>

      <br />

      <div className="affectation-details">
        <div className="agents-transportes">
          <strong>👥 Salariés transportés ({agents.length}) :</strong>
          <br />
          <br />
          <div className="agents-list">
            {repartitionSocietes.map((item, index) => (
              <div key={index} className="societe-groupe">
                <div className="societe-header">
                  <span className="societe-nom" style={{fontWeight: "bold", color: "white"}}>{item.societe}</span>
                  <span className="societe-count" style={{fontWeight: "bold"}}>({item.nombreAgents} salarié)</span>
                </div>
                <div className="agents-societe">
                  {item.agents.map((agent, agentIndex) => (
                    <div key={agentIndex} className="agent-item">
                      <span className="agent-nom">{agent.agentNom}</span>
                      <span className="agent-adresse">{agent.adresse}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-row" style={{display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',}}>
          <span className="detail-label">💰 Prix total:</span>
          <span className="detail-value prix">{affectation.prixCourse} TND</span>
        </div>
         <br />
        <div className="detail-row" style={{display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',}}>
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
         <br />
        <div className="detail-row" style={{display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',}}>
          <span className="detail-label">📅 Date réelle:</span>
          <span className="detail-value">{affectation.dateReelle}</span>
        </div>

        <div className="detail-row" style={{display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',}}>
          <span className="detail-label">📅 Date d'ajout:</span>
          <span className="detail-value">{affectation.dateAjout}</span>
        </div>
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
            <option value="Départ">🏠 Départ</option>
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

// Composant principal RecapitulatifCourses
export const RecapitulatifCourses: React.FC = () => {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('');
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  
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
    // Rediriger vers la page d'affectation du jour avec l'affectation à modifier
    // Vous devrez implémenter cette logique selon votre routing
    console.log('Modifier affectation:', affectation);
  };

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

  // Gérer la sélection d'une date
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  if (loading) {
    return (
      <div className="loading-container" style={{height: "100vh"}}>
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="recapitulatif-courses">
      <div className="recap-content">
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
                icon="🏠"
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
                            🏠 {affectationsParDate[date].filter(a => a.typeTransport === 'Départ').length}
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
                  🏠 {affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Départ').length || 0} Départs
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
                    🏠 Courses de Départ ({affectationsParDate[selectedDate]?.filter(a => a.typeTransport === 'Départ').length})
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
    </div>
  );
};