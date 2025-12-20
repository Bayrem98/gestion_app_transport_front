import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransportApiService } from '../services/api';
import { Agent, PlanningData, Societe } from '../@types/shared'; // Ajout de Societe
import { FileUpload } from '../components/FileUpload';
import { usePlanning } from './PlanningContext';
import './ImportAgents.css';

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

interface AgentFiltre {
  _id?: string;
  nom: string;
  adresse: string;
  telephone: string;
  societe: string; // Toujours le nom de la société pour l'affichage
  voiturePersonnelle: boolean;
  heure: number;
  heureAffichage: string;
  planning: string;
  chauffeurNom?: string;
  vehiculeChauffeur?: string;
  createdAt?: string;
  societeId?: string; // Ajout de l'ID de société pour la sauvegarde
}

export const ImportAgents: React.FC = () => {
  const navigate = useNavigate();
  const [agentsData, setAgentsData] = useState<AgentFiltre[]>([]);
  const [planningData, setPlanningData] = useState<PlanningData[]>(() => {
    const savedData = localStorage.getItem('importedPlanningData');
    return savedData ? JSON.parse(savedData) : [];
  });
  const [agentsExistants, setAgentsExistants] = useState<Agent[]>([]);
  const [societes, setSocietes] = useState<Societe[]>([]); // Ajout des sociétés
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(() => {
    const savedImported = localStorage.getItem('importedStatus');
    return savedImported ? JSON.parse(savedImported) : false;
  });
  const [filtres, setFiltres] = useState(() => {
    const savedFiltres = localStorage.getItem('importFilters');
    return savedFiltres ? JSON.parse(savedFiltres) : {
      typeTransport: 'Ramassage' as 'Ramassage' | 'Départ',
      jour: 'Lundi'
    };
  });
  const [forceUpdate, setForceUpdate] = useState(0);

  const { setPlanningData: setGlobalPlanningData } = usePlanning();

  useEffect(() => {
    chargerAgentsExistants();
    chargerSocietes();
  }, []);

  // Charger les sociétés
  const chargerSocietes = async () => {
    try {
      const societesData = await TransportApiService.getSocietes();
      setSocietes(societesData);
    } catch (error) {
      console.error('Erreur chargement sociétés:', error);
    }
  };

  // Sauvegarder les données dans le localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('importedPlanningData', JSON.stringify(planningData));
  }, [planningData]);

  useEffect(() => {
    localStorage.setItem('importedStatus', JSON.stringify(imported));
  }, [imported]);

  useEffect(() => {
    localStorage.setItem('importFilters', JSON.stringify(filtres));
  }, [filtres]);

  const clearLocalStorage = () => {
    localStorage.removeItem('importedPlanningData');
    localStorage.removeItem('importedStatus');
    localStorage.removeItem('importFilters');
  };

  const chargerAgentsExistants = async () => {
    try {
      const agents = await TransportApiService.getAgents();
      setAgentsExistants(agents);
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Erreur chargement Salariés existants:', error);
    }
  };

  // Fonction pour obtenir le nom de société d'un agent
  const getSocieteNom = (agent: Agent): string => {
    if (!agent.societe) return 'Non';
    
    if (typeof agent.societe === 'object') {
      return agent.societe.nom || 'Non';
    }
    
    // Si c'est un ID string
    if (typeof agent.societe === 'string') {
      if (agent.societe.match(/^[0-9a-fA-F]{24}$/)) {
        // C'est un ObjectId, chercher le nom dans la liste des sociétés
        const societe = societes.find(s => s._id === agent.societe);
        return societe ? societe.nom : agent.societe;
      } else {
        // C'est déjà un nom de société
        return agent.societe;
      }
    }
    
    return 'Non';
  };

  // Fonction pour obtenir l'ID de société à partir du nom
  const getSocieteId = (societeNom: string): string => {
    if (!societeNom || societeNom === 'Non') return '';
    
    // Chercher dans les sociétés existantes
    const societeExistante = societes.find(s => s.nom === societeNom);
    return societeExistante ? societeExistante._id! : '';
  };

  const trouverAgentComplet = (nom: string): Agent | undefined => {
    return agentsExistants.find(agent => agent.nom === nom);
  };

  // Fonction pour vérifier les données manquantes
  const verifierDonneesManquantes = (agent: AgentFiltre): boolean => {
    const adresseManquante = !agent.adresse || 
                            agent.adresse === 'Non' || 
                            agent.adresse.trim() === '';
    
    const telephoneManquant = !agent.telephone || 
                             agent.telephone === 'Non' || 
                             agent.telephone.trim() === '';
    
    const societeManquante = !agent.societe || 
                            agent.societe === 'Non' || 
                            agent.societe.trim() === '';
    
    const resultat = adresseManquante || telephoneManquant || societeManquante;
    
    if (resultat) {
      console.log(`🔍 ${agent.nom} - À compléter:`, {
        adresse: `"${agent.adresse}" -> ${adresseManquante ? 'MANQUANTE' : 'OK'}`,
        telephone: `"${agent.telephone}" -> ${telephoneManquant ? 'MANQUANT' : 'OK'}`,
        societe: `"${agent.societe}" -> ${societeManquante ? 'MANQUANTE' : 'OK'}`
      });
    }
    
    return resultat;
  };

  // Déclarer extraireAgentsDuPlanning au niveau racine avec useCallback
  const extraireAgentsDuPlanning = useCallback((planningData: PlanningData[]): AgentFiltre[] => {
    return planningData.map(planning => {
      const agentComplet = trouverAgentComplet(planning.Salarie);
      const societeNom = agentComplet ? getSocieteNom(agentComplet) : 'Non';
      
      return {
        _id: agentComplet?._id,
        nom: planning.Salarie,
        adresse: agentComplet?.adresse || 'Non',
        telephone: agentComplet?.telephone || 'Non',
        societe: societeNom,
        societeId: agentComplet?.societe ? (typeof agentComplet.societe === 'object' ? agentComplet.societe._id : agentComplet.societe) : '',
        voiturePersonnelle: agentComplet?.voiturePersonnelle || false,
        chauffeurNom: agentComplet?.chauffeurNom,
        vehiculeChauffeur: agentComplet?.vehiculeChauffeur,
        heure: 0,
        heureAffichage: '0H',
        planning: '',
        createdAt: agentComplet?.createdAt
      };
    });
  }, [trouverAgentComplet, societes]);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const data = await TransportApiService.uploadPlanning(file);
      setPlanningData(data);
      setGlobalPlanningData(data);
      
      const agentsFromPlanning = extraireAgentsDuPlanning(data);
      setAgentsData(agentsFromPlanning);
      setImported(true);
      
      alert(`✅ Fichier importé avec succès !\n${data.length} plannings chargés\n${agentsFromPlanning.length} Salariés extraits`);
    } catch (error) {
      console.error('Erreur lors de l\'import du fichier:', error);
      alert('❌ Erreur lors de l\'import du fichier');
    } finally {
      setLoading(false);
    }
  }, [setGlobalPlanningData, extraireAgentsDuPlanning]);

  // Fonction de tri personnalisée pour les heures
  const trierParHeure = (a: AgentFiltre, b: AgentFiltre): number => {
    if (filtres.typeTransport === 'Ramassage') {
      const ordreRamassage = [22, 23, 6, 7];
      const indexA = ordreRamassage.indexOf(a.heure);
      const indexB = ordreRamassage.indexOf(b.heure);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    
    if (filtres.typeTransport === 'Départ') {
      const ordreDepart = [22, 23, 0, 1, 2, 3];
      const indexA = ordreDepart.indexOf(a.heure);
      const indexB = ordreDepart.indexOf(b.heure);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    
    return a.heure - b.heure;
  };

  // Déclarer filtrerAgents comme useCallback
  const filtrerAgents = useCallback((): AgentFiltre[] => {
    if (!planningData.length) return [];

    const agentsFiltres = planningData
      .filter(planning => {
        const planningJour = planning[filtres.jour as keyof PlanningData] as string;
        const heures = extraireHeuresPlanning(planningJour);
        
        if (!heures) return false;

        if (filtres.typeTransport === 'Ramassage') {
          return [6, 7, 22, 23].includes(heures.heureDebut);
        } else {
          const heureFinNormalisee = normaliserHeureAffichage(heures.heureFin);
          return [22, 23, 0, 1, 2, 3].includes(heureFinNormalisee);
        }
      })
      .map(planning => {
        const planningJour = planning[filtres.jour as keyof PlanningData] as string;
        const heures = extraireHeuresPlanning(planningJour);
        
        const agentComplet = trouverAgentComplet(planning.Salarie);
        
        let heureCalcul: number;
        if (filtres.typeTransport === 'Ramassage') {
          heureCalcul = heures?.heureDebut || 0;
        } else {
          heureCalcul = heures?.heureFin ? normaliserHeureAffichage(heures.heureFin) : 0;
        }

        const societeNom = agentComplet ? getSocieteNom(agentComplet) : 'Non';
        const societeId = agentComplet?.societe ? 
          (typeof agentComplet.societe === 'object' ? agentComplet.societe._id : agentComplet.societe) : '';
        
        return {
          _id: agentComplet?._id,
          nom: planning.Salarie,
          adresse: agentComplet?.adresse || 'Non',
          telephone: agentComplet?.telephone || 'Non',
          societe: societeNom,
          societeId: societeId,
          voiturePersonnelle: agentComplet?.voiturePersonnelle || false,
          chauffeurNom: agentComplet?.chauffeurNom || '',
          vehiculeChauffeur: agentComplet?.vehiculeChauffeur || '',
          heure: heureCalcul,
          heureAffichage: formaterHeure(heureCalcul),
          planning: planningJour,
          createdAt: agentComplet?.createdAt
        };
      });

    return agentsFiltres.sort(trierParHeure);
  }, [planningData, filtres, trouverAgentComplet, societes]);

  // Utiliser useMemo pour optimiser le recalcul
  const agentsFiltres = useMemo(() => {
    return filtrerAgents();
  }, [filtrerAgents, forceUpdate]);

  // Debug useEffect pour voir l'état après sauvegarde
  useEffect(() => {
    if (agentsFiltres.length > 0) {
      console.log('=== État actuel des Salariés ===');
      agentsFiltres.forEach(agent => {
        const statut = verifierDonneesManquantes(agent) ? 'À COMPLÉTER' : 'COMPLET';
        console.log(`${agent.nom}: ${statut}`, {
          adresse: `"${agent.adresse}"`,
          telephone: `"${agent.telephone}"`,
          societe: `"${agent.societe}" (ID: ${agent.societeId})`,
          _id: agent._id
        });
      });
    }
  }, [agentsFiltres]);

  const getStatsFiltrage = () => {
    const totalAgents = planningData.length;
    const agentsFiltresCount = agentsFiltres.length;
    const agentsAvecInfos = agentsFiltres.filter(agent => !verifierDonneesManquantes(agent)).length;
    
    return {
      totalAgents,
      agentsFiltres: agentsFiltresCount,
      agentsAvecInfos,
      agentsSansInfos: agentsFiltresCount - agentsAvecInfos,
      pourcentage: totalAgents > 0 ? Math.round((agentsFiltresCount / totalAgents) * 100) : 0
    };
  };

  const stats = getStatsFiltrage();

  const handlePrint = () => {
    const printContent = document.querySelector('.table-section') as HTMLElement;
    const printWindow = window.open('', '_blank');
    
    if (printWindow && printContent) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filtres.typeTransport} ${filtres.jour}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
              .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .print-header h1 { margin: 0; font-size: 24px; }
              .print-header .subtitle { margin: 5px 0 0 0; font-size: 16px; color: #666; }
              .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .print-table th, .print-table td { border: 1px solid #000; padding: 8px 12px; text-align: left; font-size: 12px; }
              .print-table th { background-color: #f0f0f0; font-weight: bold; }
              .print-table tr:nth-child(even) { background-color: #f9f9f9; }
              .heure-badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; text-align: center; display: inline-block; min-width: 50px; }
              .statut-complet { color: green; }
              .statut-incomplet { color: orange; }
              .print-footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
              @media print { body { margin: 0; } .print-table { break-inside: avoid; } }
            </style>
          </head>
          <body>
            <div class="print-header">
              <h1>${filtres.typeTransport}</h1>
              <p class="subtitle">Jour: ${filtres.jour} | Total: ${agentsFiltres.length} salariés</p>
            </div>
            <table class="print-table">
              <thead>
                <tr>
                  <th>Salarié</th>
                  <th>Heure ${filtres.typeTransport === 'Ramassage' ? 'Début' : 'Fin'}</th>
                  <th>Adresse</th>
                  <th>Société</th>
                  <th>Téléphone</th>
                </tr>
              </thead>
              <tbody>
                ${agentsFiltres.map(agent => `
                  <tr>
                    <td>${agent.nom}</td>
                    <td>
                      <span class="heure-badge" style="background-color: ${filtres.typeTransport === 'Ramassage' ? '#ffeaa7' : '#a29bfe'};">
                        ${agent.heureAffichage}
                      </span>
                    </td>
                    <td>${agent.adresse}</td>
                    <td>${agent.societe}</td>
                    <td>${agent.telephone}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="print-footer">
              Généré le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      window.print();
    }
  };

  const trouverOuCreerSociete = useCallback(async (nomSociete: string): Promise<string> => {
    try {
      // Chercher d'abord la société par nom
      const societes = await TransportApiService.searchSocietes(nomSociete);
      if (societes.length > 0) {
        return societes[0]._id!;
      }
      
      // Si non trouvée, créer une nouvelle société
      const nouvelleSociete = await TransportApiService.createSociete({
        nom: nomSociete
      });
      
      return nouvelleSociete._id!;
    } catch (error) {
      console.error('Erreur gestion société:', error);
      throw error;
    }
  }, []);

  const handleSaveToDatabase = async () => {
    try {
      const agentsASauvegarder = agentsFiltres.filter(agent => !agent._id);

      if (agentsASauvegarder.length === 0) {
        alert('✅ Tous les salariés sont déjà dans la base de données !');
        return;
      }

      let sauvegardes = 0;
      let erreurs = 0;
      
      for (const agent of agentsASauvegarder) {
        try {
          // Déterminer l'ID de la société
          let societeId = '';
          if (agent.societe !== 'Non') {
            // Chercher d'abord l'ID existant
            if (agent.societeId && agent.societeId.match(/^[0-9a-fA-F]{24}$/)) {
              societeId = agent.societeId;
            } else {
              // Sinon, chercher ou créer la société
              societeId = await trouverOuCreerSociete(agent.societe);
            }
          }
          
          const agentToSave: Partial<Agent> = {
            nom: agent.nom.trim(),
            adresse: agent.adresse && agent.adresse !== 'Non' ? agent.adresse.trim() : 'Non',
            telephone: agent.telephone && agent.telephone !== 'Non' ? agent.telephone.trim() : 'Non',
            voiturePersonnelle: agent.voiturePersonnelle || false,
            chauffeurNom: agent.chauffeurNom?.trim() || '',
            vehiculeChauffeur: agent.vehiculeChauffeur?.trim() || ''
          };

          // Ajouter la société seulement si elle existe
          if (societeId) {
            agentToSave.societe = societeId;
          } else if (agent.societe !== 'Non') {
            // Si pas d'ID mais un nom de société, utiliser le nom comme string
            agentToSave.societe = agent.societe;
          }

          if (!agentToSave.nom || agentToSave.nom.trim() === '') {
            console.warn(`Nom du salarié vide pour: ${agent.nom}`);
            continue;
          }

          console.log('Envoi des données corrigées:', agentToSave);
          
          await TransportApiService.createAgent(agentToSave);
          sauvegardes++;
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          erreurs++;
          console.error(`Erreur détaillée sauvegarde agent ${agent.nom}:`, error);
          
          if (error.response) {
            console.error('Réponse erreur:', error.response.data);
            console.error('Status:', error.response.status);
          }
          
          if (error.response?.status === 400 || error.response?.status === 409) {
            console.warn(`Salarié ${agent.nom} existe peut-être déjà`);
          }
        }
      }
      
      await chargerAgentsExistants();
      await chargerSocietes(); // Recharger les sociétés
      
      if (erreurs > 0) {
        alert(`✅ ${sauvegardes} Salarié sauvegardés, ❌ ${erreurs} erreurs.\nVérifiez la console pour les détails.`);
      } else {
        alert(`✅ ${sauvegardes} Salarié sauvegardés avec succès !\nLes salariés avec des données manquantes restent "À compléter".`);
      }
      
    } catch (error) {
      console.error('Erreur générale sauvegarde salariés:', error);
      alert('❌ Erreur lors de la sauvegarde des salariés. Vérifiez la console.');
    }
  };

  // CORRECTION: Déclarer handleEditAgent comme useCallback au niveau racine
  const handleEditAgent = useCallback(async (agent: AgentFiltre) => {
    if (agent._id) {
      navigate(`/agents?edit=${agent._id}&returnTo=import`);
    } else {
      try {
        // Déterminer l'ID de la société
        let societeId = '';
        if (agent.societe !== 'Non') {
          if (agent.societeId && agent.societeId.match(/^[0-9a-fA-F]{24}$/)) {
            societeId = agent.societeId;
          } else {
            societeId = await trouverOuCreerSociete(agent.societe);
          }
        }
        
        const agentToSave: Partial<Agent> = {
          nom: agent.nom,
          adresse: agent.adresse !== 'Non' ? agent.adresse : '',
          telephone: agent.telephone !== 'Non' ? agent.telephone : '',
          voiturePersonnelle: agent.voiturePersonnelle,
          chauffeurNom: agent.chauffeurNom,
          vehiculeChauffeur: agent.vehiculeChauffeur
        };

        // Ajouter la société seulement si elle existe
        if (societeId) {
          agentToSave.societe = societeId;
        } else if (agent.societe !== 'Non') {
          agentToSave.societe = agent.societe;
        }
        
        const nouveauAgent = await TransportApiService.createAgent(agentToSave);
        await chargerAgentsExistants();
        await chargerSocietes(); // Recharger les sociétés
        navigate(`/agents?edit=${nouveauAgent._id}&returnTo=import`);
      } catch (error) {
        console.error('Erreur sauvegarde agent:', error);
        alert('❌ Erreur lors de la sauvegarde de l\'agent');
      }
    }
  }, [navigate, trouverOuCreerSociete, chargerAgentsExistants]);

  const handleResetImport = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser l\'import ? Toutes les données seront perdues.')) {
      setPlanningData([]);
      setImported(false);
      setAgentsData([]);
      clearLocalStorage();
      alert('✅ Import réinitialisé !');
    }
  };

  const exportToExcel = () => {
    const csvContent = convertToCSV(agentsFiltres);
    downloadCSV(csvContent, `agents_${filtres.typeTransport}_${filtres.jour}.csv`);
  };

  const convertToCSV = (data: AgentFiltre[]): string => {
    const headers = ['Nom', 'Heure', 'Adresse', 'Telephone', 'Societe'];
    const csvRows = [headers.join(';')];
    
    data.forEach(agent => {
      const row = [
        agent.nom,
        agent.heureAffichage,
        `"${agent.adresse}"`,
        agent.telephone,
        agent.societe,
      ];
      csvRows.push(row.join(';'));
    });
    
    return csvRows.join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="import-agents">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Gestion des Feuilles</h1>
          <p className="hero-subtitle">
           Filtrez les plannings pour optimiser vos Départ et Ramassage
          </p>
          <br />
          {imported && (
            <div className="import-status">
              <button 
                onClick={handleResetImport}
                className="btn-reset"
                style={{padding: 10, cursor: "pointer", borderRadius: 10}}
              >
                🗑️ Réinitialiser l'import
              </button>
            </div>
          )}
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-number">{planningData.length}</span>
              <span className="stat-label" style={{color: "black"}}>Plannings chargés</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-number">{agentsExistants.length}</span>
              <span className="stat-label" style={{color: "black"}}>Agents en base</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {!imported && (
          <div className="upload-section">
            <div className="modern-card">
              <div className="card-header">
                <div className="card-icon">📁</div>
                <div className="card-title">
                  <h2>Import du Planning</h2>
                </div>
              </div>
              
              <div className="card-content">
                <div className="requirements-box">
                  <h4>📋 Format requis</h4>
                  <div className="requirements-grid">
                    <div className="requirement-item">
                      <span className="requirement-icon">✅</span>
                      <span>Nom du Salarié</span>
                    </div>
                    <div className="requirement-item">
                      <span className="requirement-icon">✅</span>
                      <span>Jours de la semaine</span>
                    </div>
                    <div className="requirement-item">
                      <span className="requirement-icon">✅</span>
                      <span>Heure (Départ ou Ramassage)</span>
                    </div>
                    <div className="requirement-item">
                      <span className="requirement-icon">✅</span>
                      <span>Société</span>
                    </div>
                  </div>
                </div>
                
                <div className="upload-area">
                  <FileUpload 
                    onFileUpload={handleFileUpload} 
                    loading={loading}
                  />
                </div>

                {loading && (
                  <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Analyse du fichier en cours...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {imported && planningData.length > 0 && (
          <div className="filters-section">
            <div className="modern-card">
              <div className="card-header">
                <div className="card-icon">🎯</div>
                <div className="card-title">
                  <h2>Filtres des planning salariés</h2>
                </div>
              </div>
              
              <div className="card-content">
                <div className="filters-grid">
                  <div className="filter-group modern">
                    <label className="filter-label">
                      <span className="label-icon">🚙</span>
                      Type de transport
                    </label>
                    <div className="select-wrapper">
                      <select
                        value={filtres.typeTransport}
                        onChange={(e) => setFiltres({...filtres, typeTransport: e.target.value as 'Ramassage' | 'Départ'})}
                        className="modern-select"
                      >
                        <option value="Ramassage">Ramassage (22H-23H-6H-7H)</option>
                        <option value="Départ">Départ (22H-23H-0H-1H-2H-3H)</option>
                      </select>
                      <div className="select-arrow">▼</div>
                    </div>
                  </div>

                  <div className="filter-group modern">
                    <label className="filter-label">
                      <span className="label-icon">📅</span>
                      Jour de la semaine
                    </label>
                    <div className="select-wrapper">
                      <select
                        value={filtres.jour}
                        onChange={(e) => setFiltres({...filtres, jour: e.target.value})}
                        className="modern-select"
                      >
                        <option value="Lundi">Lundi</option>
                        <option value="Mardi">Mardi</option>
                        <option value="Mercredi">Mercredi</option>
                        <option value="Jeudi">Jeudi</option>
                        <option value="Vendredi">Vendredi</option>
                        <option value="Samedi">Samedi</option>
                        <option value="Dimanche">Dimanche</option>
                      </select>
                      <div className="select-arrow">▼</div>
                    </div>
                  </div>

                  <div className="filter-stats">
                    <div className="stat-bubble primary">
                      <span className="stat-number" style={{color: "white"}}>{stats.agentsFiltres}</span>
                      <span className="stat-label" style={{color: "white"}}>Salariés Disponibles</span>
                    </div>
                  </div>
                </div>

                <div className="filter-info modern">
                  <div className="info-icon">ℹ️</div>
                  <div className="info-content">
                    <p>
                      <strong>Filtrage actif :</strong> 
                      {filtres.typeTransport === 'Ramassage' 
                        ? ' Salariés avec planning débutant à 22H-23H-6H-7H' 
                        : ' Salariés avec planning terminant à 22H-23H-0H-1H-2H-3H'
                      }
                    </p>
                    <div className="info-stats">
                      <span className="stat-tag success">{stats.agentsAvecInfos} complets</span>
                      <span className="stat-tag warning">{stats.agentsSansInfos} à compléter</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {imported && agentsFiltres.length > 0 && (
          <div className="actions-section">
            <div className="modern-card">
              <div className="card-header">
                <div className="card-icon">⚡</div>
                <div className="card-title">
                  <h2>Actions Rapides</h2>
                </div>
              </div>
              
              <div className="card-content">
                <div className="actions-grid">
                  <button 
                    className="action-btn primary"
                    onClick={handleSaveToDatabase}
                    disabled={stats.agentsSansInfos === 0}
                  >
                    <span className="btn-icon">💾</span>
                    <span className="btn-content">
                      <span className="btn-title">Sauvegarder</span>
                      <span className="btn-subtitle">{stats.agentsSansInfos} salariés info manquants</span>
                    </span>
                  </button>
                  
                  <button 
                    className="action-btn secondary"
                    onClick={exportToExcel}
                  >
                    <span className="btn-icon">📊</span>
                    <span className="btn-content">
                      <span className="btn-title">Exporter Excel</span>
                      <span className="btn-subtitle">Format CSV</span>
                    </span>
                  </button>
                  
                  <button 
                    className="action-btn tertiary print-btn"
                    onClick={handlePrint}
                  >
                    <span className="btn-icon">🖨️</span>
                    <span className="btn-content">
                      <span className="btn-title">Imprimer</span>
                      <span className="btn-subtitle">Tableau</span>
                    </span>
                  </button>
                </div>

                {stats.agentsSansInfos === 0 && (
                  <div className="success-message">
                    <span className="success-icon">✅</span>
                    Tous les salariés ont leurs informations complètes dans la base de données
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {agentsFiltres.length > 0 && (
          <div className="table-section" id="tableau-agents">
            <div className="modern-card">
              <div className="card-header">
                <div className="card-icon">📋</div>
                <div className="card-title">
                  <h2>Agents Disponibles</h2>
                  <p>
                    {filtres.typeTransport} - {filtres.jour} 
                    <span className="result-count"> ({agentsFiltres.length} Salariés)</span>
                  </p>
                </div>
              </div>
              
              <div className="card-content">
                <div className="table-container modern">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th className="col-nom">Nom</th>
                        <th className="col-heure">Heure {filtres.typeTransport === 'Ramassage' ? 'Début' : 'Fin'}</th>
                        <th className="col-adresse">Adresse</th>
                        <th className="col-societe">Société</th>
                        <th className="col-telephone">Téléphone</th>
                        <th className="col-statut">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentsFiltres.map((agent, index) => (
                        <tr key={agent._id || `agent-${index}`} className={!verifierDonneesManquantes(agent) ? 'row-complete' : 'row-incomplete'}>
                          <td className="col-nom">
                            <div className="agent-name">
                              <span className="name-text">{agent.nom}</span>
                            </div>
                          </td>
                          <td className="col-heure">
                            <div className={`time-badge ${filtres.typeTransport.toLowerCase()}`}>
                              {agent.heureAffichage}
                            </div>
                          </td>
                          <td className="col-adresse">
                            <div className="address-text">{agent.adresse}</div>
                          </td>
                          <td className="col-societe">
                            <div className="company-badge">{agent.societe}</div>
                          </td>
                          <td className="col-telephone">
                            <div className="phone-number">{agent.telephone}</div>
                          </td>
                          <td className="col-statut">
                            <div 
                              className={`status-badge ${!verifierDonneesManquantes(agent) ? 'complete' : 'incomplete'} ${!verifierDonneesManquantes(agent) ? '' : 'clickable'}`}
                              onClick={() => !verifierDonneesManquantes(agent) ? null : handleEditAgent(agent)}
                              style={{ cursor: verifierDonneesManquantes(agent) ? 'pointer' : 'default' }}
                            >
                              <span className="status-icon">
                                {!verifierDonneesManquantes(agent) ? '✅' : '⚠️'}
                              </span>
                              <span className="status-text">
                                {!verifierDonneesManquantes(agent) ? 'Complet' : 'À compléter'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {imported && agentsFiltres.length === 0 && planningData.length > 0 && (
          <div className="empty-state-section">
            <div className="modern-card">
              <div className="empty-state modern">
                <div className="empty-icon">🔍</div>
                <h3>Aucun agent disponible</h3>
                <p>
                  Aucun résultat pour le {filtres.typeTransport.toLowerCase()} le {filtres.jour}.
                  Modifiez les critères de recherche.
                </p>
                <div className="empty-stats">
                  <div className="empty-stat">
                    <strong>{stats.totalAgents}</strong> agents dans le planning
                  </div>
                  <div className="empty-stat">
                    Filtre : <strong>{filtres.typeTransport}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};