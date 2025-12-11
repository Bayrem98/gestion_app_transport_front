import React, { useState, useEffect, useMemo } from 'react';
import { TransportApiService } from '../services/api';
import { Affectation } from '../@types/shared';
import './RapportFinancier.css';
import * as XLSX from 'xlsx';

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
      
      // Si un filtre société est appliqué, ne traiter que cette société
      if (societeFiltre && societe !== societeFiltre) {
        return; // Ignorer les autres sociétés
      }
      
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

    // Filtrer les résultats pour ne garder que la société sélectionnée
  const resultats = Object.values(parDate).map(jour => {
    if (societeFiltre) {
      // Garder seulement la société filtrée
      const societeFiltree = jour.societes[societeFiltre];
      return {
        ...jour,
        societes: societeFiltree ? { [societeFiltre]: societeFiltree } : {}
      };
    }
    return jour;
  });

  return resultats.sort((a, b) => 
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

  // NOUVELLE FONCTION: Calcul des statistiques par société et type de chauffeur
  const statistiquesParSocieteChauffeur = useMemo(() => {
    const stats: {
      [societe: string]: {
        totalAffectations: number;
        chauffeurs: {
          [chauffeur: string]: {
            affectations: number;
            prixTotal: number;
            type: string; // 'taxi' ou 'autre'
          }
        }
      }
    } = {};

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

    affectationsFiltrees.forEach(aff => {
      const typeChauffeur = estTaxi(aff) ? 'taxi' : 'autre';
      const nomChauffeur = aff.chauffeur || 'Chauffeur inconnu';
      
      // Pour chaque société concernée par l'affectation
      const societesDansAffectation = new Set<string>();
      aff.agents?.forEach(agent => {
        societesDansAffectation.add(agent.societe);
      });

      societesDansAffectation.forEach(societe => {
        if (!stats[societe]) {
          stats[societe] = {
            totalAffectations: 0,
            chauffeurs: {}
          };
        }

        if (!stats[societe].chauffeurs[nomChauffeur]) {
          stats[societe].chauffeurs[nomChauffeur] = {
            affectations: 0,
            prixTotal: 0,
            type: typeChauffeur
          };
        }

        // Répartition équitable du prix entre les sociétés
        const prixParSociete = aff.prixCourse / societesDansAffectation.size;
        
        stats[societe].totalAffectations++;
        stats[societe].chauffeurs[nomChauffeur].affectations++;
        stats[societe].chauffeurs[nomChauffeur].prixTotal += prixParSociete;
      });
    });

    return stats;
  }, [affectations, dateDebut, dateFin, societeFiltre, typeTransportFiltre, typeChauffeurFiltre]);

  const resetFiltres = () => {
    setDateDebut('');
    setDateFin('');
    setSocieteFiltre('');
    setTypeTransportFiltre('');
    setTypeChauffeurFiltre('');
  };

  const exporterExcelXLSX = () => {
  // Créer un nouveau workbook
  const wb = XLSX.utils.book_new();
  
  // ========== FEUILLE 1: DÉTAILS COMPLETS PAR AGENT ==========
  const detailsData = [];
  
  // En-têtes
  detailsData.push([
    'Date',
    'Société',
    'Agent',
    'Adresse',
    'Type Transport',
    'Heure',
    'Chauffeur',
    'Prix Course (TND)',
  ]);
  
  // Parcourir toutes les affectations filtrées pour obtenir TOUTES les données
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
  
  // Grouper les affectations par date, puis par société
  const groupedByDateSociete: {
    [date: string]: {
      [societe: string]: Array<{
        agent: any;
        affectation: Affectation;
        prixParAgent: number;
        estTaxi: boolean;
      }>
    }
  } = {};
  
  affectationsFiltrees.forEach(affectation => {
    const date = affectation.dateReelle;
    const estTaxiAffectation = estTaxi(affectation);
    const prixParAgent = affectation.prixCourse / (affectation.agents?.length || 1);
    
    affectation.agents?.forEach(agent => {
      const societe = agent.societe;
      
      // Si un filtre société est appliqué, ne garder que cette société
      if (societeFiltre && societe !== societeFiltre) {
        return; // Ignorer les agents des autres sociétés
      }
      
      if (!groupedByDateSociete[date]) {
        groupedByDateSociete[date] = {};
      }
      
      if (!groupedByDateSociete[date][societe]) {
        groupedByDateSociete[date][societe] = [];
      }
      
      groupedByDateSociete[date][societe].push({
        agent,
        affectation,
        prixParAgent,
        estTaxi: estTaxiAffectation
      });
    });
  });
  
  // Trier les dates du plus récent au plus ancien
  const sortedDates = Object.keys(groupedByDateSociete).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });
  
  // Ajouter les données au tableau avec formatage comme dans votre exemple
  sortedDates.forEach((date, dateIndex) => {
    const societes = Object.keys(groupedByDateSociete[date]);
    
    societes.forEach((societe, societeIndex) => {
      const agents = groupedByDateSociete[date][societe];
      
      agents.forEach((item, agentIndex) => {
        const row = [];
        
        // Date - seulement pour le premier agent de la première société de la date
        if (societeIndex === 0 && agentIndex === 0) {
          row.push(date);
        } else {
          row.push(''); // Cellule vide pour éviter la répétition
        }
        
        // Société - seulement pour le premier agent de chaque société
        if (agentIndex === 0) {
          row.push(societe);
        } else {
          row.push(''); // Cellule vide pour éviter la répétition
        }
        
        // Agent
        row.push(item.agent.agentNom);
        
        // Adresse
        row.push(item.agent.adresse);
        
        // Type Transport
        row.push(item.affectation.typeTransport);
        
        // Heure
        row.push(item.affectation.heure ? `${item.affectation.heure}H` : 'N/A');
        
        // Chauffeur (type)
        row.push(item.estTaxi ? 'Taxi' : 'Samir');
        
        // Prix Course
        row.push(item.prixParAgent.toFixed(2));
        
        detailsData.push(row);
      });
    });
  });
  
  const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
  
  // ========== FEUILLE 2: PAR DATE ET SOCIÉTÉ ==========
  const dateSocieteData = [];

dateSocieteData.push([
  'Date',
  'Société',
  'Nombre Agents',
  'Total Prix (TND)',
  'Taxi (TND)',
  'Samir (TND)',
  'Nombre Courses'
]);

let lastDate = '';

rapportsJournaliers.forEach(jour => {
    // Ne traiter que si des sociétés existent (après filtrage)
    if (Object.keys(jour.societes).length > 0) {
      Object.entries(jour.societes).forEach(([societe, data]) => {
        // Si un filtre société est appliqué, vérifier qu'on a la bonne société
        if (societeFiltre && societe !== societeFiltre) {
          return; // Ignorer les autres sociétés
        }
        
        const row = [];
        
        // Date - seulement pour la première société de la date
        if (lastDate !== jour.date) {
          row.push(jour.date);
          lastDate = jour.date;
        } else {
          row.push(''); // Cellule vide
        }
        
        // Société
        row.push(societe);
        
        // Autres données
        row.push(
          data.nombreAgents,
          data.prixTotal.toFixed(2),
          data.prixTaxi.toFixed(2),
          data.prixAutres.toFixed(2),
          data.affectations
        );
        
        dateSocieteData.push(row);
      });
    }
  });

const wsDateSociete = XLSX.utils.aoa_to_sheet(dateSocieteData);
  
  // ========== AJOUTER TOUTES LES FEUILLES AU WORKBOOK ==========
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Détails Agents');
  XLSX.utils.book_append_sheet(wb, wsDateSociete, 'Par Date Société');
  
  // ========== APPLIQUER DES STYLES (largeurs de colonnes) ==========
  const colWidths: { [key: string]: Array<{ wch: number }> } = {
    'Détails Agents': [
      { wch: 12 }, // Date
      { wch: 20 }, // Société
      { wch: 30 }, // Agent
      { wch: 35 }, // Adresse
      { wch: 15 }, // Type Transport
      { wch: 10 }, // Heure
      { wch: 12 }, // Chauffeur
      { wch: 15 }, // Prix
    ],
    'Par Date Société': [
      { wch: 12 }, // Date
      { wch: 25 }, // Société
      { wch: 15 }, // Nombre Agents
      { wch: 15 }, // Total Prix
      { wch: 15 }, // Taxi
      { wch: 15 }, // Samir
      { wch: 15 }  // Nombre Courses
    ],
  };
  
  // Appliquer les largeurs de colonnes
  Object.keys(colWidths).forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (ws) {
      ws['!cols'] = colWidths[sheetName];
    }
  });
  
  // ========== STYLE DE FUSION POUR LA FEUILLE DÉTAILS ==========
  // Pour fusionner les cellules de date et société (optionnel)
  const ws = wb.Sheets['Détails Agents'];
  
  if (ws) {
    // Chercher les cellules à fusionner
    const mergeRanges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
    let currentDateStart = 2; // Row 2 (après l'en-tête)
    let currentSocieteStart = 2;
    
    sortedDates.forEach(date => {
      const societes = Object.keys(groupedByDateSociete[date]);
      let dateRowCount = 0;
      
      societes.forEach(societe => {
        const agentsCount = groupedByDateSociete[date][societe].length;
        
        // Fusion pour la société (si plus d'un agent)
        if (agentsCount > 1) {
          const societeEnd = currentSocieteStart + agentsCount - 1;
          mergeRanges.push({
            s: { r: currentSocieteStart - 1, c: 1 }, // Société colonne B (index 1)
            e: { r: societeEnd - 1, c: 1 }
          });
        }
        
        currentSocieteStart += agentsCount;
        dateRowCount += agentsCount;
      });
      
      // Fusion pour la date (si plusieurs sociétés)
      if (societes.length > 0 && dateRowCount > 1) {
        const dateEnd = currentDateStart + dateRowCount - 1;
        mergeRanges.push({
          s: { r: currentDateStart - 1, c: 0 }, // Date colonne A (index 0)
          e: { r: dateEnd - 1, c: 0 }
        });
      }
      
      currentDateStart += dateRowCount;
    });
    
    if (mergeRanges.length > 0) {
      ws['!merges'] = mergeRanges;
    }
  }
  
  // ========== GÉNÉRER LE NOM DU FICHIER ==========
  let fileName = `Rapport_Transport`;
  if (dateDebut && dateFin) fileName += `_${dateDebut}_au_${dateFin}`;
  if (societeFiltre) fileName += `_${societeFiltre.replace(/\s+/g, '_')}`;
  fileName += `_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // ========== TÉLÉCHARGER LE FICHIER ==========
  XLSX.writeFile(wb, fileName);
  
  // ========== NOTIFICATION ==========
  const totalAgents = detailsData.length - 1; // -1 pour l'en-tête
  const totalDates = sortedDates.length;
  
  let message = `✅ Exportation Excel réussie !

📊 Fichier: ${fileName}
📅 Période: ${dateDebut || 'Début'} - ${dateFin || 'Fin'}
👥 Agents exportés: ${totalAgents}
📋 Dates couvertes: ${totalDates}`;

  if (societeFiltre) {
    message += `\n🏢 Société filtrée: ${societeFiltre}`;
  } else {
    message += `\n🏢 Toutes les sociétés`;
  }

  message += `\n\nLe fichier a été généré avec succès !`;

  alert(message);
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
          <button className="btn-primary" onClick={exporterExcelXLSX}>
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

      {/* Répartition par société 
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
      )} */}

     {/* Rapport détaillé par date */}
      <div className="rapport-detaille">
        <h3>📅 Rapport Détaillé par Société</h3>
        {rapportsJournaliers.length > 0 ? (
          <div className="rapport-par-societe">
            {rapportsJournaliers.map(jour => (
              <div key={jour.date} className="jour-section">
                <br />
                {Object.entries(jour.societes).map(([societe, data]) => (
                  <div key={`${jour.date}-${societe}`} className="societe-table-section">
                    <div className="societe-table-header">
                      <h5 className="societe-nom-tableau">🏢 {societe}</h5>
                    </div>
                    <br />
                    <div className="table-container">
                      <table className="rapport-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Agent</th>
                            <th>Adresse</th>
                            <th>Type Transport</th>
                            <th>Heure</th>
                            <th>Type Chauffeur</th>
                            <th>Prix Course (TND)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.agents.map((agent, index) => {
                            // Trouver l'affectation correspondante pour cet agent
                            const affectation = affectations.find(aff => 
                              aff.dateReelle === jour.date && aff.heure &&
                              aff.agents?.some(a => 
                                a.agentNom === agent.nom && 
                                a.societe === agent.societe
                              )
                            );
                            
                            const estTaxiAffectation = affectation ? estTaxi(affectation) : false;
                            const prixParAgent = affectation ? 
                              (affectation.prixCourse / (affectation.agents?.length || 1)) : 
                              0;
                            
                            return (
                              <tr key={`${jour.date}-${societe}-${agent.nom}-${index}`}>
                                <td className="adresse-cell">
                                  <div className="adresse-info">
                                    <span className="adresse-icon">📅</span>
                                    <span className="adresse-text" style={{fontSize: 18}}>{jour?.date}</span>
                                  </div>
                                </td>
                                <td className="agent-cell">
                                  <div className="agent-info-compact">
                                    <span className="agent-icon">👤</span>
                                    <span className="agent-nom-text">{agent.nom}</span>
                                  </div>
                                </td>
                                <td className="adresse-cell">
                                  <div className="adresse-info">
                                    <span className="adresse-icon">📍</span>
                                    <span className="adresse-text">{agent.adresse}</span>
                                  </div>
                                </td>
                                 <td className="type-transport-cell">
                                  <span className={`badge ${affectation?.typeTransport === 'Ramassage' ? 'ramassage' : 'depart'}`}>
                                    {affectation?.typeTransport || 'N/A'}
                                  </span>
                                </td>
                                <td className="heure-cell">
                                  <div className="heure-info">
                                    <span className="heure-icon">⏰</span>
                                    <span className="heure-text" style={{fontWeight: "bold"}}>{affectation?.heure}H</span>
                                  </div>
                                </td>
                                <td className="type-chauffeur-cell">
                                  <span className={`badge ${estTaxiAffectation ? 'taxi' : 'autre'}`}>
                                    {estTaxiAffectation ? '🚕 Taxi' : '👨‍✈️ Samir'}
                                  </span>
                                </td>
                                <td className="prix-cell">
                                  <strong>{prixParAgent.toFixed(2)} TND</strong>
                                </td>
                                
                              </tr>
                            );
                          })}
                          {/* Ligne de total pour cette société */}
                          <tr className="total-row">
                            <td colSpan={4} className="total-label">
                              <strong>Total {societe} :</strong>
                            </td>
                            <td className="total-prix">
                              <strong>{data.prixTotal.toFixed(2)} TND</strong>
                            </td>
                            <td colSpan={2} className="total-detail">
                              <small>
                                Taxi: {data.prixTaxi.toFixed(2)} TND | 
                                Samir: {data.prixAutres.toFixed(2)} TND
                              </small>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <br />
                  </div>
                ))}
              </div>
            ))}
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