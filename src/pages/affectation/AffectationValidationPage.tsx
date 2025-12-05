import React, { useState, useEffect } from 'react';
import { TransportApiService } from '../../services/api';
import { Affectation, AgentAffectation } from '../../@types/shared';
import './AffectationValidationPage.css';

// Composant pour afficher une affectation en mode validation
const AffectationCardValidation: React.FC<{
  affectation: Affectation;
  onStatusChange: (id: string, newStatus: 'Non payé' | 'Payé') => void;
}> = ({ affectation, onStatusChange }) => {
  const isTaxi = affectation.vehicule.toLowerCase().includes('taxi');
  
  // Formater l'heure pour l'affichage
  const getHeureAffichage = (heure: string) => {
    const heureNum = parseInt(heure);
    if (heureNum < 10) return `0${heureNum}`;
    return heure;
  };

  // Calculer la répartition par société
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
      agents: agents,
      nombreAgents: agents.length,
      prixParSociete: affectation.prixCourse / Object.keys(societes).length
    }));
  };

  const repartitionSocietes = getRepartitionParSociete(affectation.agents || []);

  return (
    <div className={`affectation-card-validation ${affectation.statutPaiement === 'Payé' ? 'paye' : 'non-paye'}`}>
      <div className="validation-card-header">
        <div className="validation-card-title">
          <span className="validation-chauffeur">
            👨‍✈️ {affectation.chauffeur}
          </span>
          {affectation.vehicule && (
            <span className="validation-vehicule">
              ({isTaxi ? '🚕' : '🚗'} {affectation.vehicule})
            </span>
          )}
        </div>
        
        <div className="validation-card-meta">
          <span className={`validation-type ${affectation.typeTransport.toLowerCase()}`}>
            {affectation.typeTransport}
          </span>
          <span className="validation-heure">{getHeureAffichage(affectation.heure)}H</span>
          <span className="validation-date">{affectation.dateReelle}</span>
        </div>
      </div>

      <div className="validation-card-content">
        <div className="validation-agents-section">
          <div className="validation-agents-header">
            <strong>👥 Salariés ({affectation.agents?.length || 0}) :</strong>
            <span className="validation-agents-count">
              {affectation.agents?.length || 0} salarié(s)
            </span>
          </div>
          
          <div className="validation-agents-list">
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

        <div className="validation-prix-section">
          <div className="validation-prix-total">
            <span className="validation-prix-label">💰 Prix total :</span>
            <span className="validation-prix-value">{affectation.prixCourse} TND</span>
          </div>
          
          <div className="validation-repartition">
            <span className="validation-repartition-label">📊 Répartition :</span>
            <div className="validation-repartition-items">
              {repartitionSocietes.map((item, index) => (
                <div key={index} className="validation-repartition-item">
                  <span>{item.societe} : {item.prixParSociete.toFixed(2)} TND</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="validation-card-footer">
        <div className="statut-paiement-section">
          <span className="statut-label">Statut paiement :</span>
          <div className="statut-buttons">
            <button
              className={`statut-btn non-paye ${affectation.statutPaiement === 'Non payé' ? 'active' : ''}`}
              onClick={() => onStatusChange(affectation._id!, 'Non payé')}
            >
              ❌ Non payé
            </button>
            <button
              className={`statut-btn paye ${affectation.statutPaiement === 'Payé' ? 'active' : ''}`}
              onClick={() => onStatusChange(affectation._id!, 'Payé')}
            >
              ✅ Payé
            </button>
          </div>
        </div>
        
        <div className="validation-info">
          <span className="validation-date-ajout">
            Ajouté le : {affectation.dateAjout}
          </span>
          <span className={`validation-statut-indicator ${affectation.statutPaiement === 'Payé' ? 'paye-indicator' : 'non-paye-indicator'}`}>
            {affectation.statutPaiement === 'Payé' ? '✅ Validé' : '⏳ En attente'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Composant de filtre
const FilterBar: React.FC<{
  searchDate: string;
  searchType: string;
  searchStatus: string;
  onDateChange: (date: string) => void;
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onClearFilters: () => void;
  availableDates: string[];
}> = ({
  searchDate,
  searchType,
  searchStatus,
  onDateChange,
  onTypeChange,
  onStatusChange,
  onClearFilters,
  availableDates
}) => {
  // Fonction pour formater la date en français
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour parser la date depuis l'input
  const parseDateFromInput = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="validation-filter-bar">
      <div className="filter-header">
        <h3>🔍 Filtres de validation</h3>
        {(searchDate || searchType || searchStatus) && (
          <button onClick={onClearFilters} className="clear-filters-btn">
            ❌ Effacer tous les filtres
          </button>
        )}
      </div>

      <div className="filters-grid">
        <div className="filter-group">
          <label className="filter-label">
            <span className="label-icon">📅</span>
            Date
          </label>
          <input
            type="date"
            value={formatDateForInput(searchDate)}
            onChange={(e) => onDateChange(parseDateFromInput(e.target.value))}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <span className="label-icon">💰</span>
            Statut paiement
          </label>
          <select
            value={searchStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les statuts</option>
            <option value="Non payé">❌ Non payé</option>
            <option value="Payé">✅ Payé</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <span className="label-icon">⚡</span>
            Actions rapides
          </label>
          <div className="quick-filter-buttons">
            <button
              onClick={() => onStatusChange('Non payé')}
              className={`quick-filter-btn ${searchStatus === 'Non payé' ? 'active' : ''}`}
            >
              Non payés
            </button>
            <button
              onClick={() => onStatusChange('Payé')}
              className={`quick-filter-btn ${searchStatus === 'Payé' ? 'active' : ''}`}
            >
              Payés
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal de la page de validation
interface AffectationValidationPageProps {
  onNavigateToForm?: () => void;
}

export const AffectationValidationPage: React.FC<AffectationValidationPageProps> = ({
  onNavigateToForm
}) => {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchType, setSearchType] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadAffectations();
  }, []);

  const loadAffectations = async () => {
    try {
      setLoading(true);
      const affectationsData = await TransportApiService.getAffectations();
      // Trier par date réelle (plus récente en premier) et par statut (non payés d'abord)
      const sortedAffectations = affectationsData.sort((a, b) => {
        // D'abord par statut (non payés en premier)
        if (a.statutPaiement === 'Non payé' && b.statutPaiement === 'Payé') return -1;
        if (a.statutPaiement === 'Payé' && b.statutPaiement === 'Non payé') return 1;
        
        // Ensuite par date réelle (plus récente en premier)
        const [dayA, monthA, yearA] = a.dateReelle.split('/').map(Number);
        const [dayB, monthB, yearB] = b.dateReelle.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        
        return dateB.getTime() - dateA.getTime();
      });
      setAffectations(sortedAffectations);
    } catch (error) {
      console.error('Erreur chargement affectations:', error);
      alert('Erreur lors du chargement des affectations');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'Non payé' | 'Payé') => {
    try {
      setUpdatingId(id);
      
      // Trouver l'affectation à modifier
      const affectationToUpdate = affectations.find(a => a._id === id);
      if (!affectationToUpdate) return;

      // Créer l'objet mis à jour
      const updatedAffectation = {
        ...affectationToUpdate,
        statutPaiement: newStatus
      };

      // Mettre à jour dans l'API
      await TransportApiService.updateAffectation(id, updatedAffectation);
      
      // Mettre à jour l'état local
      setAffectations(prev => prev.map(aff => 
        aff._id === id ? { ...aff, statutPaiement: newStatus } : aff
      ));

      console.log(`✅ Statut de paiement mis à jour pour l'affectation ${id}: ${newStatus}`);
    } catch (error) {
      console.error('Erreur mise à jour statut paiement:', error);
      alert('Erreur lors de la mise à jour du statut de paiement');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtrer les affectations
  const filteredAffectations = affectations.filter(affectation => {
    // Filtre par date
    if (searchDate && affectation.dateReelle !== searchDate) {
      return false;
    }
    
    // Filtre par type
    if (searchType && affectation.typeTransport !== searchType) {
      return false;
    }
    
    // Filtre par statut
    if (searchStatus && affectation.statutPaiement !== searchStatus) {
      return false;
    }
    
    return true;
  });

  // Obtenir les dates disponibles
  const availableDates = Array.from(new Set(affectations.map(a => a.dateReelle))).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/').map(Number);
    const [dayB, monthB, yearB] = b.split('/').map(Number);
    const dateA = new Date(yearA, monthA - 1, dayA);
    const dateB = new Date(yearB, monthB - 1, dayB);
    return dateB.getTime() - dateA.getTime();
  });

  // Calculer les statistiques
  const totalAffectations = affectations.length;
  const totalNonPaye = affectations.filter(a => a.statutPaiement === 'Non payé').length;
  const totalPaye = affectations.filter(a => a.statutPaiement === 'Payé').length;
  const montantTotal = affectations.reduce((sum, a) => sum + a.prixCourse, 0);
  const montantPaye = affectations
    .filter(a => a.statutPaiement === 'Payé')
    .reduce((sum, a) => sum + a.prixCourse, 0);
  const montantNonPaye = affectations
    .filter(a => a.statutPaiement === 'Non payé')
    .reduce((sum, a) => sum + a.prixCourse, 0);

  const handleClearFilters = () => {
    setSearchDate('');
    setSearchType('');
    setSearchStatus('');
  };

  if (loading) {
    return (
      <div className="validation-loading-container">
        <div className="validation-loading">Chargement des affectations...</div>
      </div>
    );
  }

  return (
    <div className="affectation-validation-page">
      <div className="validation-header">
        <h1>💰 Validation des Paiements</h1>
        <div className="validation-subtitle">
          Gestion du statut de paiement des affectations
        </div>
      </div>

      {/* Statistiques */}
      <div className="validation-stats-grid">
        <div className="validation-stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{totalAffectations}</div>
            <div className="stat-label">Total affectations</div>
          </div>
        </div>

        <div className="validation-stat-card non-paye">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{totalNonPaye}</div>
            <div className="stat-label">En attente de paiement</div>
            <div className="stat-subtext">{montantNonPaye.toFixed(2)} TND</div>
          </div>
        </div>

        <div className="validation-stat-card paye">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{totalPaye}</div>
            <div className="stat-label">Paiements validés</div>
            <div className="stat-subtext">{montantPaye.toFixed(2)} TND</div>
          </div>
        </div>

        <div className="validation-stat-card montant">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{montantTotal.toFixed(2)} TND</div>
            <div className="stat-label">Montant total</div>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <FilterBar
        searchDate={searchDate}
        searchType={searchType}
        searchStatus={searchStatus}
        onDateChange={setSearchDate}
        onTypeChange={setSearchType}
        onStatusChange={setSearchStatus}
        onClearFilters={handleClearFilters}
        availableDates={availableDates}
      />

      {/* Résultats */}
      <div className="validation-results">
        <div className="results-header">
          <h3>
            {searchDate || searchType || searchStatus ? '🔍 Résultats filtrés' : '📋 Toutes les affectations'}
          </h3>
          <div className="results-info">
            <span>
              {filteredAffectations.length} affectation(s) trouvée(s)
            </span>
            {(searchDate || searchType || searchStatus) && (
              <button onClick={handleClearFilters} className="show-all-btn">
                🔄 Afficher tout
              </button>
            )}
          </div>
        </div>

        {filteredAffectations.length > 0 ? (
          <div className="affectations-list-validation">
            {filteredAffectations.map(affectation => (
              <AffectationCardValidation
                key={affectation._id}
                affectation={affectation}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="no-affectations">
            <div className="no-affectations-icon">📭</div>
            <p>Aucune affectation trouvée</p>
            <p className="no-affectations-subtitle">
              {searchDate || searchType || searchStatus ? 
                'Aucun résultat pour vos critères de recherche' : 
                'Aucune affectation enregistrée'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};