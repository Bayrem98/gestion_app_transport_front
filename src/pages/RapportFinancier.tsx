import React, { useState, useEffect, useMemo } from 'react';
import { TransportApiService } from '../services/api';
import { Affectation } from '../@types/shared';
import './RapportFinancier.css';

interface RapportJournalier {
  date: string;
  totalAffectations: number;
  ramassages: number;
  departs: number;
  prixTotal: number;
  prixTaxi: number;
  prixAutres: number;
  societes: {
    [societe: string]: {
      agents: { 
        nom: string;
        societe: string;
        adresse: string;
      }[];
      nombreAgents: number;
      prixTotal: number;
      prixTaxi: number;
      prixAutres: number;
      affectations: number;
    }
  };
}

interface StatistiquesGenerales {
  totalAffectations: number;
  totalRamassages: number;
  totalDeparts: number;
  prixTotalGeneral: number;
  prixTaxiTotal: number;
  prixAutresTotal: number;
  prixMoyenParCourse: number;
  societes: {
    societe: string;
    totalAgents: number;
    totalPrix: number;
    prixTaxi: number;
    prixAutres: number;
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
  const [typeChauffeurFiltre, setTypeChauffeurFiltre] = useState<string>('');

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

  // Fonction pour déterminer si c'est un taxi
  const estTaxi = (affectation: Affectation): boolean => {
    return affectation.chauffeur.toLowerCase().includes('taxi') || 
           affectation.vehicule.toLowerCase().includes('taxi');
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
      const filtreTypeChauffeur = typeChauffeurFiltre ? 
        (typeChauffeurFiltre === 'taxi' ? estTaxi(aff) : !estTaxi(aff)) : true;

      return filtreDateDebut && filtreDateFin && filtreSociete && filtreTypeTransport && filtreTypeChauffeur;
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
          prixTaxi: 0,
          prixAutres: 0,
          societes: {},
        };
      }

      const estUneCourseTaxi = estTaxi(aff);
      
      acc[date].totalAffectations++;
      acc[date].prixTotal += aff.prixCourse;

      if (estUneCourseTaxi) {
        acc[date].prixTaxi += aff.prixCourse;
      } else {
        acc[date].prixAutres += aff.prixCourse;
      }

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
            agents: [],
            nombreAgents: 0,
            prixTotal: 0,
            prixTaxi: 0,
            prixAutres: 0,
            affectations: 0
          };
        }

        // Utilisez les propriétés correctes de l'agent
      acc[date].societes[societe].agents.push({
        nom: agent.agentNom, 
        societe: agent.societe,
        adresse: agent.adresse
     });

        acc[date].societes[societe].nombreAgents++;
      });

      // Répartition du prix par société
      const prixParSociete = aff.prixCourse / societesDansAffectation.size;
      societesDansAffectation.forEach(societe => {
        acc[date].societes[societe].prixTotal += prixParSociete;
        acc[date].societes[societe].affectations++;
        
        if (estUneCourseTaxi) {
          acc[date].societes[societe].prixTaxi += prixParSociete;
        } else {
          acc[date].societes[societe].prixAutres += prixParSociete;
        }
      });

      return acc;
    }, {} as { [date: string]: RapportJournalier });

    return Object.values(parDate).sort((a, b) => 
      new Date(b.date.split('/').reverse().join('-')).getTime() - 
      new Date(a.date.split('/').reverse().join('-')).getTime()
    );
  }, [affectations, dateDebut, dateFin, societeFiltre, typeTransportFiltre, typeChauffeurFiltre]);

  // Calcul des statistiques générales
  const statistiquesGenerales = useMemo((): StatistiquesGenerales => {
    const totalAffectations = rapportsJournaliers.reduce((sum, jour) => sum + jour.totalAffectations, 0);
    const totalRamassages = rapportsJournaliers.reduce((sum, jour) => sum + jour.ramassages, 0);
    const totalDeparts = rapportsJournaliers.reduce((sum, jour) => sum + jour.departs, 0);
    const prixTotalGeneral = rapportsJournaliers.reduce((sum, jour) => sum + jour.prixTotal, 0);
    const prixTaxiTotal = rapportsJournaliers.reduce((sum, jour) => sum + jour.prixTaxi, 0);
    const prixAutresTotal = rapportsJournaliers.reduce((sum, jour) => sum + jour.prixAutres, 0);
    const prixMoyenParCourse = totalAffectations > 0 ? prixTotalGeneral / totalAffectations : 0;

    // Calcul par société (agrégation sur toutes les dates)
    const societesAggregees: { 
      [societe: string]: { 
        totalAgents: number; 
        totalPrix: number; 
        prixTaxi: number;
        prixAutres: number;
        nombreAffectations: number; 
      } 
    } = {};

    rapportsJournaliers.forEach(jour => {
      Object.entries(jour.societes).forEach(([societe, data]) => {
        if (!societesAggregees[societe]) {
          societesAggregees[societe] = {
            totalAgents: 0,
            totalPrix: 0,
            prixTaxi: 0,
            prixAutres: 0,
            nombreAffectations: 0
          };
        }
        societesAggregees[societe].totalAgents += data.nombreAgents;
        societesAggregees[societe].totalPrix += data.prixTotal;
        societesAggregees[societe].prixTaxi += data.prixTaxi;
        societesAggregees[societe].prixAutres += data.prixAutres;
        societesAggregees[societe].nombreAffectations += data.affectations;
      });
    });

    const societes = Object.entries(societesAggregees).map(([societe, data]) => ({
      societe,
      totalAgents: data.totalAgents,
      totalPrix: data.totalPrix,
      prixTaxi: data.prixTaxi,
      prixAutres: data.prixAutres,
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
      prixTaxiTotal,
      prixAutresTotal,
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
    setTypeChauffeurFiltre('');
  };

  const exporterCSV = () => {
    const headers = ['Date', 'Total Courses', 'Ramassages', 'Départs', 'Prix Total', 'Prix Taxi', 'Prix Autres', 'Sociétés'];
    const csvData = rapportsJournaliers.map(jour => [
      jour.date,
      jour.totalAffectations.toString(),
      jour.ramassages.toString(),
      jour.departs.toString(),
      jour.prixTotal.toFixed(2),
      jour.prixTaxi.toFixed(2),
      jour.prixAutres.toFixed(2),
      Object.entries(jour.societes).map(([societe, data]) => 
        `${societe}: ${data.nombreAgents} agents, Total: ${data.prixTotal.toFixed(2)} TND (Taxi: ${data.prixTaxi.toFixed(2)} TND, Autres: ${data.prixAutres.toFixed(2)} TND)`
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
        <h1>📈 Rapport Financier</h1>
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
          <div className="filtre-group">
            <label>Type de chauffeur</label>
            <select
              value={typeChauffeurFiltre}
              onChange={(e) => setTypeChauffeurFiltre(e.target.value)}
              className="filtre-select"
            >
              <option value="">Tous les types</option>
              <option value="taxi">Taxi uniquement</option>
              <option value="autres">Autres chauffeurs</option>
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
          <div className="stat-cards prix-total">
            <div className="stat-icons">💰</div>
            <div className="stat-contents">
              <div className="stat-values">{statistiquesGenerales.prixTotalGeneral.toFixed(2)} TND</div>
              <div className="stat-labels">Chiffre d'Affaires Total</div>
              <div className="stat-subtitles">
                Moyenne: {statistiquesGenerales.prixMoyenParCourse.toFixed(2)} TND/course
              </div>
            </div>
          </div>
          <div className="stat-cards taxi">
            <div className="stat-icons">🚕</div>
            <div className="stat-contents">
              <div className="stat-values">{statistiquesGenerales.prixTaxiTotal.toFixed(2)} TND</div>
              <div className="stat-labels">Revenus Taxis</div>
              <div className="stat-subtitles">
                {statistiquesGenerales.prixTotalGeneral > 0 ? 
                  `${((statistiquesGenerales.prixTaxiTotal / statistiquesGenerales.prixTotalGeneral) * 100).toFixed(1)}% du total` 
                  : '0%'
                }
              </div>
            </div>
          </div>
          <div className="stat-cards autres">
            <div className="stat-icons">👨‍✈️</div>
            <div className="stat-contents">
              <div className="stat-values">{statistiquesGenerales.prixAutresTotal.toFixed(2)} TND</div>
              <div className="stat-labels">Revenus Autres Chauffeurs</div>
              <div className="stat-subtitles">
                {statistiquesGenerales.prixTotalGeneral > 0 ? 
                  `${((statistiquesGenerales.prixAutresTotal / statistiquesGenerales.prixTotalGeneral) * 100).toFixed(1)}% du total` 
                  : '0%'
                }
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
                    <span className="label">Prix Taxi:</span>
                    <span className="value taxi">{societe.prixTaxi.toFixed(2)} TND</span>
                  </div>
                  <div className="societe-stat">
                    <span className="label">Prix Autres:</span>
                    <span className="value autres">{societe.prixAutres.toFixed(2)} TND</span>
                  </div>
                  <div className="societe-stat">
                    <span className="label">Prix moyen par agent:</span>
                    <span className="value">{societe.prixMoyenParAgent.toFixed(2)} TND</span>
                  </div>
                </div>
                <div className="societe-progress">
                  <div 
                    className="progress-bar taxi"
                    style={{
                      width: `${societe.totalPrix > 0 ? (societe.prixTaxi / societe.totalPrix) * 100 : 0}%`
                    }}
                  ></div>
                  <div 
                    className="progress-bar autres"
                    style={{
                      width: `${societe.totalPrix > 0 ? (societe.prixAutres / societe.totalPrix) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <div className="societe-legend">
                  <div className="legend-item">
                    <span className="legend-color taxi"></span>
                    <span>Taxi ({(societe.totalPrix > 0 ? (societe.prixTaxi / societe.totalPrix) * 100 : 0).toFixed(1)}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color autres"></span>
                    <span>Autres ({(societe.totalPrix > 0 ? (societe.prixAutres / societe.totalPrix) * 100 : 0).toFixed(1)}%)</span>
                  </div>
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
            <th>Prix Taxi</th>
            <th>Prix Autres</th>
            <th>Sociétés et Agents</th>
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
              <td className="prix-taxi">
                {jour.prixTaxi.toFixed(2)} TND
              </td>
              <td className="prix-autres">
                {jour.prixAutres.toFixed(2)} TND
              </td>
              <td className="societes-cell">
                <div className="societes-list">
                  {Object.entries(jour.societes).map(([societe, data]) => (
                    <div key={societe} className="societe-item">
                      <div className="societe-header">
                        <span className="societe-nom" style={{color: "white"}}>{societe}</span>
                        <span className="societe-total">{data.prixTotal.toFixed(2)} TND</span>
                      </div>
                      
                      <div className="agents-list">
                        {data.agents.map((agent, index) => (
                          <div key={index} className="agent-item">
                            <div className="agent-info">
                              <span className="agent-nom">
                                {agent.nom}
                              </span>
                              <span className="agent-adresse">
                                {agent.adresse}
                              </span>
                            </div>
                            <div className="agent-repartition">
                              <small>
                                🚕 {((data.prixTaxi / data.nombreAgents) || 0).toFixed(2)} TND
                              </small>
                              <small>
                                👨‍✈️ {((data.prixAutres / data.nombreAgents) || 0).toFixed(2)} TND
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="societe-summary">
                        <small>
                          {data.nombreAgents} agent(s)
                        </small>
                      </div>
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