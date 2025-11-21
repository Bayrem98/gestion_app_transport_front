import React, { useState, useEffect, useMemo } from 'react';
import { TransportApiService } from '../services/api';
import { Affectation, AgentAffectation } from '../@types/shared';
import './RapportFinancier.css';

interface RapportJournalier {
  date: string;
  totalAffectations: number;
  ramassages: number;
  departs: number;
  prixTotal: number;
  societes: {
    [societe: string]: {
      nombreAgents: number;
      prixTotal: number;
      affectations: number;
    }
  };
}

interface StatistiquesGenerales {
  totalAffectations: number;
  totalRamassages: number;
  totalDeparts: number;
  prixTotalGeneral: number;
  prixMoyenParCourse: number;
  societes: {
    societe: string;
    totalAgents: number;
    totalPrix: number;
    nombreAffectations: number;
    prixMoyenParAgent: number;
  }[];
  meilleursDates: RapportJournalier[];
}

export const RapportFinancier: React.FC = () => {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [societeFiltre, setSocieteFiltre] = useState<string>('');
  const [typeTransportFiltre, setTypeTransportFiltre] = useState<string>('');

  useEffect(() => {
    loadAffectations();
  }, []);

  const loadAffectations = async () => {
    try {
      const affectationsData = await TransportApiService.getAffectations();
      setAffectations(affectationsData);
    } catch (error) {
      console.error('Erreur chargement affectations:', error);
      alert('Erreur lors du chargement des affectations');
    } finally {
      setLoading(false);
    }
  };

  // Calcul des rapports journaliers
  const rapportsJournaliers = useMemo((): RapportJournalier[] => {
    const affectationsFiltrees = affectations.filter(aff => {
      const dateAffectation = new Date(aff.dateReelle.split('/').reverse().join('-'));
      const filtreDateDebut = dateDebut ? new Date(dateDebut) <= dateAffectation : true;
      const filtreDateFin = dateFin ? new Date(dateFin) >= dateAffectation : true;
      const filtreSociete = societeFiltre ? 
        aff.agents?.some(agent => agent.societe === societeFiltre) : true;
      const filtreTypeTransport = typeTransportFiltre ? 
        aff.typeTransport === typeTransportFiltre : true;

      return filtreDateDebut && filtreDateFin && filtreSociete && filtreTypeTransport;
    });

    const parDate = affectationsFiltrees.reduce((acc, aff) => {
      const date = aff.dateReelle;
      if (!acc[date]) {
        acc[date] = {
          date,
          totalAffectations: 0,
          ramassages: 0,
          departs: 0,
          prixTotal: 0,
          societes: {}
        };
      }

      acc[date].totalAffectations++;
      acc[date].prixTotal += aff.prixCourse;

      if (aff.typeTransport === 'Ramassage') {
        acc[date].ramassages++;
      } else {
        acc[date].departs++;
      }

      // Calcul par société
      const societesDansAffectation = new Set<string>();
      aff.agents?.forEach(agent => {
        const societe = agent.societe;
        societesDansAffectation.add(societe);

        if (!acc[date].societes[societe]) {
          acc[date].societes[societe] = {
            nombreAgents: 0,
            prixTotal: 0,
            affectations: 0
          };
        }

        acc[date].societes[societe].nombreAgents++;
      });

      // Répartition du prix par société
      const prixParSociete = aff.prixCourse / societesDansAffectation.size;
      societesDansAffectation.forEach(societe => {
        acc[date].societes[societe].prixTotal += prixParSociete;
        acc[date].societes[societe].affectations++;
      });

      return acc;
    }, {} as { [date: string]: RapportJournalier });

    return Object.values(parDate).sort((a, b) => 
      new Date(b.date.split('/').reverse().join('-')).getTime() - 
      new Date(a.date.split('/').reverse().join('-')).getTime()
    );
  }, [affectations, dateDebut, dateFin, societeFiltre, typeTransportFiltre]);

  // Calcul des statistiques générales
  const statistiquesGenerales = useMemo((): StatistiquesGenerales => {
    const totalAffectations = rapportsJournaliers.reduce((sum, jour) => sum + jour.totalAffectations, 0);
    const totalRamassages = rapportsJournaliers.reduce((sum, jour) => sum + jour.ramassages, 0);
    const totalDeparts = rapportsJournaliers.reduce((sum, jour) => sum + jour.departs, 0);
    const prixTotalGeneral = rapportsJournaliers.reduce((sum, jour) => sum + jour.prixTotal, 0);
    const prixMoyenParCourse = totalAffectations > 0 ? prixTotalGeneral / totalAffectations : 0;

    // Calcul par société (agrégation sur toutes les dates)
    const societesAggregees: { [societe: string]: { totalAgents: number; totalPrix: number; nombreAffectations: number } } = {};

    rapportsJournaliers.forEach(jour => {
      Object.entries(jour.societes).forEach(([societe, data]) => {
        if (!societesAggregees[societe]) {
          societesAggregees[societe] = {
            totalAgents: 0,
            totalPrix: 0,
            nombreAffectations: 0
          };
        }
        societesAggregees[societe].totalAgents += data.nombreAgents;
        societesAggregees[societe].totalPrix += data.prixTotal;
        societesAggregees[societe].nombreAffectations += data.affectations;
      });
    });

    const societes = Object.entries(societesAggregees).map(([societe, data]) => ({
      societe,
      totalAgents: data.totalAgents,
      totalPrix: data.totalPrix,
      nombreAffectations: data.nombreAffectations,
      prixMoyenParAgent: data.totalAgents > 0 ? data.totalPrix / data.totalAgents : 0
    })).sort((a, b) => b.totalPrix - a.totalPrix);

    // Top 5 des meilleures dates
    const meilleursDates = [...rapportsJournaliers]
      .sort((a, b) => b.prixTotal - a.prixTotal)
      .slice(0, 5);

    return {
      totalAffectations,
      totalRamassages,
      totalDeparts,
      prixTotalGeneral,
      prixMoyenParCourse,
      societes,
      meilleursDates
    };
  }, [rapportsJournaliers]);

  // Liste des sociétés uniques pour le filtre
  const societesUniques = useMemo(() => {
    const societes = new Set<string>();
    affectations.forEach(aff => {
      aff.agents?.forEach(agent => {
        societes.add(agent.societe);
      });
    });
    return Array.from(societes).sort();
  }, [affectations]);

  const resetFiltres = () => {
    setDateDebut('');
    setDateFin('');
    setSocieteFiltre('');
    setTypeTransportFiltre('');
  };

  const exporterCSV = () => {
    const headers = ['Date', 'Total Affectations', 'Ramassages', 'Départs', 'Prix Total', 'Sociétés'];
    const csvData = rapportsJournaliers.map(jour => [
      jour.date,
      jour.totalAffectations.toString(),
      jour.ramassages.toString(),
      jour.departs.toString(),
      jour.prixTotal.toFixed(2),
      Object.entries(jour.societes).map(([societe, data]) => 
        `${societe}: ${data.nombreAgents} agents, ${data.prixTotal.toFixed(2)} TND`
      ).join('; ')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_financier_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="rapport-financier">
      {/* En-tête */}
      <div className="rapport-header">
        <h1>📊 Rapport Financier</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={resetFiltres}>
            🔄 Réinitialiser
          </button>
          <button className="btn-primary" onClick={exporterCSV}>
            📁 Exporter CSV
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="filtres-section">
        <h3>🔍 Filtres</h3>
        <div className="filtres-grid">
          <div className="filtre-group">
            <label>Date de début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="filtre-input"
            />
          </div>
          <div className="filtre-group">
            <label>Date de fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="filtre-input"
            />
          </div>
          <div className="filtre-group">
            <label>Société</label>
            <select
              value={societeFiltre}
              onChange={(e) => setSocieteFiltre(e.target.value)}
              className="filtre-select"
            >
              <option value="">Toutes les sociétés</option>
              {societesUniques.map(societe => (
                <option key={societe} value={societe}>{societe}</option>
              ))}
            </select>
          </div>
          <div className="filtre-group">
            <label>Type de transport</label>
            <select
              value={typeTransportFiltre}
              onChange={(e) => setTypeTransportFiltre(e.target.value)}
              className="filtre-select"
            >
              <option value="">Tous les types</option>
              <option value="Ramassage">Ramassage</option>
              <option value="Départ">Départ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques générales */}
      <div className="stats-sectionr">
        <h3>📈 Statistiques Générales</h3>
        <div className="stats-grids">
          <div className="stat-cards total">
            <div className="stat-icons">📊</div>
            <div className="stat-contents">
              <div className="stat-values">{statistiquesGenerales.totalAffectations}</div>
              <div className="stat-labels">Total Affectations</div>
            </div>
          </div>
          <div className="stat-cards ramassage">
            <div className="stat-icons">🚗</div>
            <div className="stat-contents">
              <div className="stat-values">{statistiquesGenerales.totalRamassages}</div>
              <div className="stat-labels">Courses Ramassage</div>
            </div>
          </div>
          <div className="stat-cards depart">
            <div className="stat-icons">🏠</div>
            <div className="stat-contents">
              <div className="stat-values">{statistiquesGenerales.totalDeparts}</div>
              <div className="stat-labels">Courses Départ</div>
            </div>
          </div>
          <div className="stat-cards prix">
            <div className="stat-icons">💰</div>
            <div className="stat-contents">
              <div className="stat-values">{statistiquesGenerales.prixTotalGeneral.toFixed(2)} TND</div>
              <div className="stat-labels">Chiffre d'Affaires Total</div>
              <div className="stat-subtitles">
                Moyenne: {statistiquesGenerales.prixMoyenParCourse.toFixed(2)} TND/course
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Répartition par société */}
      {statistiquesGenerales.societes.length > 0 && (
        <div className="societes-section">
          <h3>🏢 Répartition par Société</h3>
          <div className="societes-grid">
            {statistiquesGenerales.societes.map(societe => (
              <div key={societe.societe} className="societe-card">
                <div className="societe-header">
                  <h4>{societe.societe}</h4>
                  <span className="societe-prix">{societe.totalPrix.toFixed(2)} TND</span>
                </div>
                <div className="societe-details">
                  <div className="societe-stat">
                    <span className="label">Agents transportés:</span>
                    <span className="value">{societe.totalAgents}</span>
                  </div>
                  <div className="societe-stat">
                    <span className="label">Nombre d'affectations:</span>
                    <span className="value">{societe.nombreAffectations}</span>
                  </div>
                  <div className="societe-stat">
                    <span className="label">Prix moyen par agent:</span>
                    <span className="value">{societe.prixMoyenParAgent.toFixed(2)} TND</span>
                  </div>
                </div>
                <div className="societe-progress">
                  <div 
                    className="progress-bar"
                    style={{
                      width: `${(societe.totalPrix / statistiquesGenerales.prixTotalGeneral) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meilleures dates */}
      {statistiquesGenerales.meilleursDates.length > 0 && (
        <div className="top-dates-section">
          <h3>🏆 Top 5 des Meilleures Dates</h3>
          <div className="top-dates-grid">
            {statistiquesGenerales.meilleursDates.map((date, index) => (
              <div key={date.date} className="top-date-card">
                <div className="rank">#{index + 1}</div>
                <div className="date-info">
                  <div className="date">{date.date}</div>
                  <div className="date-prix-rapports">{date.prixTotal.toFixed(2)} TND</div>
                </div>
                <div className="date-stats-rapports">
                  <span className="date-stat-rapports">📊 {date.totalAffectations} courses</span>
                  <span className="date-stat-rapports">🚗 {date.ramassages} ramass.</span>
                  <span className="date-stat-rapports">🏠 {date.departs} dép.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rapport détaillé par date */}
      <div className="rapport-detaille">
        <h3>📅 Rapport Détaillé par Date</h3>
        {rapportsJournaliers.length > 0 ? (
          <div className="table-container">
            <table className="rapport-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Courses</th>
                  <th>Ramassages</th>
                  <th>Départs</th>
                  <th>Prix Total</th>
                  <th>Sociétés</th>
                </tr>
              </thead>
              <tbody>
                {rapportsJournaliers.map(jour => (
                  <tr key={jour.date}>
                    <td className="date-cell">
                      <strong>{jour.date}</strong>
                    </td>
                    <td>{jour.totalAffectations}</td>
                    <td>
                      <span className="badge ramassage">{jour.ramassages}</span>
                    </td>
                    <td>
                      <span className="badge depart">{jour.departs}</span>
                    </td>
                    <td className="prix-cell">
                      <strong>{jour.prixTotal.toFixed(2)} TND</strong>
                    </td>
                    <td className="societes-cell">
                      <div className="societes-list">
                        {Object.entries(jour.societes).map(([societe, data]) => (
                          <div key={societe} className="societe-item">
                            <span className="societe-nom">{societe}:</span>
                            <span className="societe-detail">
                              {data.nombreAgents} agents - {data.prixTotal.toFixed(2)} TND
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">📭</div>
            <p>Aucune donnée trouvée pour les filtres sélectionnés</p>
          </div>
        )}
      </div>
    </div>
  );
};