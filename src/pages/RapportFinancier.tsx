import React, { useState, useEffect, useMemo } from "react";
import { TransportApiService } from "../services/api";
import { Affectation, Societe } from "../@types/shared";
import "./RapportFinancier.css";
import * as XLSX from "xlsx";

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
        telephone: string;
        societeId: string;
        date: string;
        affectationId?: string;
        typeTransport?: string;
        heure?: string;
        estTaxi?: boolean;
        prixParAgent: number;
      }[];
      nombreAgents: number;
      prixTotal: number;
      prixTaxi: number;
      prixAutres: number;
      affectations: number;
    };
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
    societeInfo?: Societe;
    totalAgents: number;
    totalPrix: number;
    prixTaxi: number;
    prixAutres: number;
    nombreAffectations: number;
    prixMoyenParAgent: number;
    agents: Array<{
      nom: string;
      societe: string;
      adresse: string;
      telephone: string;
      date: string;
      typeTransport?: string;
      heure?: string;
      estTaxi?: boolean;
      prixParAgent: number;
    }>;
  }[];
  meilleursDates: RapportJournalier[];
}

export const RapportFinancier: React.FC = () => {
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState<string>("");
  const [dateFin, setDateFin] = useState<string>("");
  const [societeFiltre, setSocieteFiltre] = useState<string>("");
  const [typeTransportFiltre, setTypeTransportFiltre] = useState<string>("");
  const [typeChauffeurFiltre, setTypeChauffeurFiltre] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [affectationsData, societesData] = await Promise.all([
        TransportApiService.getAffectations(),
        TransportApiService.getSocietes(),
      ]);
      setAffectations(affectationsData);
      setSocietes(societesData);
    } catch (error) {
      console.error("Erreur chargement données:", error);
      alert("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour déterminer si c'est un taxi
  const estTaxi = (affectation: Affectation): boolean => {
    return (
      affectation.chauffeur.toLowerCase().includes("taxi") ||
      affectation.vehicule.toLowerCase().includes("taxi")
    );
  };

  // Fonction pour obtenir les informations d'une société
  const getSocieteInfo = (societeIdOrName: string): Societe | undefined => {
    if (!societeIdOrName) return undefined;

    // Chercher par ID
    const societeById = societes.find((s) => s._id === societeIdOrName);
    if (societeById) return societeById;

    // Chercher par nom
    const societeByName = societes.find((s) => s.nom === societeIdOrName);
    if (societeByName) return societeByName;

    return undefined;
  };

  // Fonction pour obtenir le nom d'une société
  const getSocieteNom = (societeIdOrName: string): string => {
    if (!societeIdOrName) return "Non spécifié";

    const societeInfo = getSocieteInfo(societeIdOrName);
    return societeInfo ? societeInfo.nom : societeIdOrName;
  };

  // Calcul des rapports journaliers
  const rapportsJournaliers = useMemo((): RapportJournalier[] => {
    const affectationsFiltrees = affectations.filter((aff) => {
      const dateAffectation = new Date(
        aff.dateReelle.split("/").reverse().join("-")
      );
      const filtreDateDebut = dateDebut
        ? new Date(dateDebut) <= dateAffectation
        : true;
      const filtreDateFin = dateFin
        ? new Date(dateFin) >= dateAffectation
        : true;
      const filtreSociete = societeFiltre
        ? aff.agents?.some(
            (agent) => getSocieteNom(agent.societe) === societeFiltre
          )
        : true;
      const filtreTypeTransport = typeTransportFiltre
        ? aff.typeTransport === typeTransportFiltre
        : true;
      const filtreTypeChauffeur = typeChauffeurFiltre
        ? typeChauffeurFiltre === "taxi"
          ? estTaxi(aff)
          : !estTaxi(aff)
        : true;

      return (
        filtreDateDebut &&
        filtreDateFin &&
        filtreSociete &&
        filtreTypeTransport &&
        filtreTypeChauffeur
      );
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

      if (aff.typeTransport === "Ramassage") {
        acc[date].ramassages++;
      } else {
        acc[date].departs++;
      }

      // Calcul par société
      const societesDansAffectation = new Set<string>();
      aff.agents?.forEach((agent) => {
        const societeNom = getSocieteNom(agent.societe);
        const societeId =
          typeof agent.societe === "object" &&
          agent.societe !== null &&
          "_id" in agent.societe
            ? (agent.societe as any)._id
            : agent.societe;

        // Si un filtre société est appliqué, ne traiter que cette société
        if (societeFiltre && societeNom !== societeFiltre) {
          return; // Ignorer les autres sociétés
        }

        societesDansAffectation.add(societeNom);

        if (!acc[date].societes[societeNom]) {
          acc[date].societes[societeNom] = {
            agents: [],
            nombreAgents: 0,
            prixTotal: 0,
            prixTaxi: 0,
            prixAutres: 0,
            affectations: 0,
          };
        }

        const prixParAgent = aff.prixCourse / (aff.agents?.length || 1);

        acc[date].societes[societeNom].agents.push({
          nom: agent.agentNom,
          societe: societeNom,
          adresse: agent.adresse,
          telephone: agent.telephone,
          societeId: societeId,
          date: date,
          affectationId: aff._id,
          typeTransport: aff.typeTransport,
          heure: aff.heure,
          estTaxi: estUneCourseTaxi,
          prixParAgent: prixParAgent,
        });

        acc[date].societes[societeNom].nombreAgents++;
      });

      // Répartition du prix par société
      const prixParSociete = aff.prixCourse / societesDansAffectation.size;
      societesDansAffectation.forEach((societeNom) => {
        acc[date].societes[societeNom].prixTotal += prixParSociete;
        acc[date].societes[societeNom].affectations++;

        if (estUneCourseTaxi) {
          acc[date].societes[societeNom].prixTaxi += prixParSociete;
        } else {
          acc[date].societes[societeNom].prixAutres += prixParSociete;
        }
      });

      return acc;
    }, {} as { [date: string]: RapportJournalier });

    // Filtrer les résultats pour ne garder que la société sélectionnée
    const resultats = Object.values(parDate).map((jour) => {
      if (societeFiltre) {
        // Garder seulement la société filtrée
        const societeFiltree = jour.societes[societeFiltre];
        return {
          ...jour,
          societes: societeFiltree ? { [societeFiltre]: societeFiltree } : {},
        };
      }
      return jour;
    });

    return resultats.sort(
      (a, b) =>
        new Date(b.date.split("/").reverse().join("-")).getTime() -
        new Date(a.date.split("/").reverse().join("-")).getTime()
    );
  }, [
    affectations,
    dateDebut,
    dateFin,
    societeFiltre,
    typeTransportFiltre,
    typeChauffeurFiltre,
    societes,
  ]);

  // Calcul des statistiques générales
  const statistiquesGenerales = useMemo((): StatistiquesGenerales => {
    const totalAffectations = rapportsJournaliers.reduce(
      (sum, jour) => sum + jour.totalAffectations,
      0
    );
    const totalRamassages = rapportsJournaliers.reduce(
      (sum, jour) => sum + jour.ramassages,
      0
    );
    const totalDeparts = rapportsJournaliers.reduce(
      (sum, jour) => sum + jour.departs,
      0
    );
    const prixTotalGeneral = rapportsJournaliers.reduce(
      (sum, jour) => sum + jour.prixTotal,
      0
    );
    const prixTaxiTotal = rapportsJournaliers.reduce(
      (sum, jour) => sum + jour.prixTaxi,
      0
    );
    const prixAutresTotal = rapportsJournaliers.reduce(
      (sum, jour) => sum + jour.prixAutres,
      0
    );
    const prixMoyenParCourse =
      totalAffectations > 0 ? prixTotalGeneral / totalAffectations : 0;

    // Calcul par société (agrégation sur toutes les dates)
    const societesAggregees: {
      [societe: string]: {
        societeInfo?: Societe;
        totalAgents: number;
        totalPrix: number;
        prixTaxi: number;
        prixAutres: number;
        nombreAffectations: number;
        agents: Array<{
          nom: string;
          societe: string;
          adresse: string;
          telephone: string;
          date: string;
          typeTransport?: string;
          heure?: string;
          estTaxi?: boolean;
          prixParAgent: number;
        }>;
      };
    } = {};

    rapportsJournaliers.forEach((jour) => {
      Object.entries(jour.societes).forEach(([societe, data]) => {
        if (!societesAggregees[societe]) {
          societesAggregees[societe] = {
            societeInfo: getSocieteInfo(data.agents[0]?.societeId || societe),
            totalAgents: 0,
            totalPrix: 0,
            prixTaxi: 0,
            prixAutres: 0,
            nombreAffectations: 0,
            agents: [],
          };
        }
        societesAggregees[societe].totalAgents += data.nombreAgents;
        societesAggregees[societe].totalPrix += data.prixTotal;
        societesAggregees[societe].prixTaxi += data.prixTaxi;
        societesAggregees[societe].prixAutres += data.prixAutres;
        societesAggregees[societe].nombreAffectations += data.affectations;
        societesAggregees[societe].agents.push(...data.agents);
      });
    });

    const societes = Object.entries(societesAggregees)
      .map(([societe, data]) => ({
        societe,
        societeInfo: data.societeInfo,
        totalAgents: data.totalAgents,
        totalPrix: data.totalPrix,
        prixTaxi: data.prixTaxi,
        prixAutres: data.prixAutres,
        nombreAffectations: data.nombreAffectations,
        prixMoyenParAgent:
          data.totalAgents > 0 ? data.totalPrix / data.totalAgents : 0,
        agents: data.agents.sort((a, b) => {
          const dateA = new Date(a.date.split("/").reverse().join("-"));
          const dateB = new Date(b.date.split("/").reverse().join("-"));
          return dateB.getTime() - dateA.getTime(); // Tri décroissant par date
        }),
      }))
      .sort((a, b) => b.totalPrix - a.totalPrix);

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
      meilleursDates,
    };
  }, [rapportsJournaliers, societes]);

  // Liste des sociétés uniques pour le filtre
  const societesUniques = useMemo(() => {
    const societesSet = new Set<string>();
    affectations.forEach((aff) => {
      aff.agents?.forEach((agent) => {
        societesSet.add(getSocieteNom(agent.societe));
      });
    });
    return Array.from(societesSet).sort();
  }, [affectations, societes]);

  const resetFiltres = () => {
    setDateDebut("");
    setDateFin("");
    setSocieteFiltre("");
    setTypeTransportFiltre("");
    setTypeChauffeurFiltre("");
  };

  const exporterExcelXLSX = () => {
    // Créer un nouveau workbook
    const wb = XLSX.utils.book_new();

    // ========== FEUILLE 1: DÉTAILS COMPLETS PAR AGENT ==========
    const detailsData = [];

    // En-têtes avec les nouvelles colonnes
    detailsData.push([
      "Date",
      "Nom Société",
      "Adresse Société",
      "Téléphone Société",
      "Matricule Fiscale",
      "Nom Salarié",
      "Adresse Salarié",
      "Téléphone Salarié",
      "Type Transport",
      "Heure",
      "Chauffeur",
      "Prix Course (TND)",
    ]);

    // Parcourir toutes les affectations filtrées pour obtenir TOUTES les données
    const affectationsFiltrees = affectations.filter((aff) => {
      const dateAffectation = new Date(
        aff.dateReelle.split("/").reverse().join("-")
      );
      const filtreDateDebut = dateDebut
        ? new Date(dateDebut) <= dateAffectation
        : true;
      const filtreDateFin = dateFin
        ? new Date(dateFin) >= dateAffectation
        : true;
      const filtreSociete = societeFiltre
        ? aff.agents?.some(
            (agent) => getSocieteNom(agent.societe) === societeFiltre
          )
        : true;
      const filtreTypeTransport = typeTransportFiltre
        ? aff.typeTransport === typeTransportFiltre
        : true;
      const filtreTypeChauffeur = typeChauffeurFiltre
        ? typeChauffeurFiltre === "taxi"
          ? estTaxi(aff)
          : !estTaxi(aff)
        : true;

      return (
        filtreDateDebut &&
        filtreDateFin &&
        filtreSociete &&
        filtreTypeTransport &&
        filtreTypeChauffeur
      );
    });

    // Grouper les affectations par date, puis par société
    const groupedByDateSociete: {
      [date: string]: {
        [societe: string]: Array<{
          agent: any;
          societeInfo?: Societe;
          affectation: Affectation;
          prixParAgent: number;
          estTaxi: boolean;
        }>;
      };
    } = {};

    affectationsFiltrees.forEach((affectation) => {
      const date = affectation.dateReelle;
      const estTaxiAffectation = estTaxi(affectation);
      const prixParAgent =
        affectation.prixCourse / (affectation.agents?.length || 1);

      affectation.agents?.forEach((agent) => {
        const societeNom = getSocieteNom(agent.societe);

        // Si un filtre société est appliqué, ne garder que cette société
        if (societeFiltre && societeNom !== societeFiltre) {
          return; // Ignorer les agents des autres sociétés
        }

        if (!groupedByDateSociete[date]) {
          groupedByDateSociete[date] = {};
        }

        if (!groupedByDateSociete[date][societeNom]) {
          groupedByDateSociete[date][societeNom] = [];
        }

        groupedByDateSociete[date][societeNom].push({
          agent,
          societeInfo: getSocieteInfo(agent.societe),
          affectation,
          prixParAgent,
          estTaxi: estTaxiAffectation,
        });
      });
    });

    // Trier les dates du plus récent au plus ancien
    const sortedDates = Object.keys(groupedByDateSociete).sort((a, b) => {
      const dateA = new Date(a.split("/").reverse().join("-"));
      const dateB = new Date(b.split("/").reverse().join("-"));
      return dateB.getTime() - dateA.getTime();
    });

    // Ajouter les données au tableau avec formatage comme dans votre exemple
    sortedDates.forEach((date, dateIndex) => {
      const societes = Object.keys(groupedByDateSociete[date]);

      societes.forEach((societeNom, societeIndex) => {
        const agents = groupedByDateSociete[date][societeNom];

        agents.forEach((item, agentIndex) => {
          const row = [];

          // Date - seulement pour le premier agent de la première société de la date
          if (societeIndex === 0 && agentIndex === 0) {
            row.push(date);
          } else {
            row.push(""); // Cellule vide pour éviter la répétition
          }

          // Informations sur la société - seulement pour le premier agent de chaque société
          if (agentIndex === 0) {
            // Nom société
            row.push(societeNom);

            // Adresse société
            const adresseSociete =
              item.societeInfo?.adresse || item.agent.adresse || "Non spécifié";
            row.push(adresseSociete);

            // Téléphone société
            const telephoneSociete =
              item.societeInfo?.telephone ||
              item.agent.telephone ||
              "Non spécifié";
            row.push(telephoneSociete);

            // Matricule fiscale
            const matriculeSociete =
              item.societeInfo?.matriculef || "Non spécifié";
            row.push(matriculeSociete);
          } else {
            // Cellules vides pour éviter la répétition
            row.push("");
            row.push("");
            row.push("");
            row.push("");
          }

          // Informations du salarié
          row.push(item.agent.agentNom); // Nom salarié

          // Adresse salarié
          row.push(item.agent.adresse);

          // Téléphone salarié
          row.push(item.agent.telephone);

          // Type Transport
          row.push(item.affectation.typeTransport);

          // Heure
          row.push(
            item.affectation.heure ? `${item.affectation.heure}H` : "N/A"
          );

          // Chauffeur (type)
          row.push(item.estTaxi ? "Taxi" : "Samir");

          // Prix Course
          row.push(item.prixParAgent.toFixed(2));

          detailsData.push(row);
        });
      });
    });

    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);

    // ========== FEUILLE 2: PAR SOCIÉTÉ (TOUTES LES DATES) ==========
    const societeData = [];

    societeData.push([
      "Nom Société",
      "Adresse Société",
      "Téléphone Société",
      "Matricule Fiscale",
      "Date",
      "Nom Salarié",
      "Adresse Salarié",
      "Téléphone Salarié",
      "Type Transport",
      "Heure",
      "Type Chauffeur",
      "Prix (TND)",
    ]);

    statistiquesGenerales.societes.forEach((societe) => {
      societe.agents.forEach((agent) => {
        societeData.push([
          societe.societe,
          societe.societeInfo?.adresse || "Non spécifié",
          societe.societeInfo?.telephone || "Non spécifié",
          societe.societeInfo?.matriculef || "Non spécifié",
          agent.date,
          agent.nom,
          agent.adresse,
          agent.telephone,
          agent.typeTransport || "N/A",
          agent.heure ? `${agent.heure}H` : "N/A",
          agent.estTaxi ? "Taxi" : "Samir",
          agent.prixParAgent.toFixed(2),
        ]);
      });

      // Ligne de total pour la société
      societeData.push([
        "",
        "",
        "",
        "",
        "TOTAL " + societe.societe,
        "",
        "",
        "",
        "",
        "",
        "",
        societe.totalPrix.toFixed(2),
      ]);

      // Ligne vide pour séparer les sociétés
      societeData.push([]);
    });

    const wsSociete = XLSX.utils.aoa_to_sheet(societeData);

    // ========== FEUILLE 3: RÉSUMÉ PAR SOCIÉTÉ ==========
    const resumeSocieteData = [];

    resumeSocieteData.push([
      "Nom Société",
      "Adresse",
      "Téléphone",
      "Matricule Fiscale",
      "Nombre Agents",
      "Nombre Affectations",
      "Total Prix (TND)",
      "Prix Taxi (TND)",
      "Prix Autres (TND)",
      "Prix Moyen par Agent (TND)",
    ]);

    statistiquesGenerales.societes.forEach((societe) => {
      const row = [
        societe.societe,
        societe.societeInfo?.adresse || "Non spécifié",
        societe.societeInfo?.telephone || "Non spécifié",
        societe.societeInfo?.matriculef || "Non spécifié",
        societe.totalAgents,
        societe.nombreAffectations,
        societe.totalPrix.toFixed(2),
        societe.prixTaxi.toFixed(2),
        societe.prixAutres.toFixed(2),
        societe.prixMoyenParAgent.toFixed(2),
      ];
      resumeSocieteData.push(row);
    });

    const wsResumeSociete = XLSX.utils.aoa_to_sheet(resumeSocieteData);

    // ========== AJOUTER TOUTES LES FEUILLES AU WORKBOOK ==========
    XLSX.utils.book_append_sheet(wb, wsDetails, "Détails Agents");
    XLSX.utils.book_append_sheet(wb, wsSociete, "Par Société");
    XLSX.utils.book_append_sheet(wb, wsResumeSociete, "Résumé Sociétés");

    // ========== APPLIQUER DES STYLES (largeurs de colonnes) ==========
    const colWidths: { [key: string]: Array<{ wch: number }> } = {
      "Détails Agents": [
        { wch: 12 }, // Date
        { wch: 20 }, // Nom Société
        { wch: 30 }, // Adresse Société
        { wch: 15 }, // Téléphone Société
        { wch: 15 }, // Matricule Fiscale
        { wch: 25 }, // Nom Salarié
        { wch: 30 }, // Adresse Salarié
        { wch: 15 }, // Téléphone Salarié
        { wch: 15 }, // Type Transport
        { wch: 10 }, // Heure
        { wch: 12 }, // Chauffeur
        { wch: 15 }, // Prix
      ],
      "Par Société": [
        { wch: 20 }, // Nom Société
        { wch: 30 }, // Adresse Société
        { wch: 15 }, // Téléphone Société
        { wch: 15 }, // Matricule Fiscale
        { wch: 12 }, // Date
        { wch: 25 }, // Nom Salarié
        { wch: 30 }, // Adresse Salarié
        { wch: 15 }, // Téléphone Salarié
        { wch: 15 }, // Type Transport
        { wch: 10 }, // Heure
        { wch: 12 }, // Type Chauffeur
        { wch: 15 }, // Prix
      ],
      "Résumé Sociétés": [
        { wch: 20 }, // Nom Société
        { wch: 25 }, // Adresse
        { wch: 15 }, // Téléphone
        { wch: 15 }, // Matricule Fiscale
        { wch: 12 }, // Nombre Agents
        { wch: 12 }, // Nombre Affectations
        { wch: 15 }, // Total Prix
        { wch: 12 }, // Prix Taxi
        { wch: 12 }, // Prix Autres
        { wch: 15 }, // Prix Moyen
      ],
    };

    // Appliquer les largeurs de colonnes
    Object.keys(colWidths).forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      if (ws) {
        ws["!cols"] = colWidths[sheetName];
      }
    });

    // ========== GÉNÉRER LE NOM DU FICHIER ==========
    let fileName = `Rapport_Transport`;
    if (dateDebut && dateFin) fileName += `_${dateDebut}_au_${dateFin}`;
    if (societeFiltre) fileName += `_${societeFiltre.replace(/\s+/g, "_")}`;
    fileName += `_${new Date().toISOString().split("T")[0]}.xlsx`;

    // ========== TÉLÉCHARGER LE FICHIER ==========
    XLSX.writeFile(wb, fileName);

    // ========== NOTIFICATION ==========
    const totalAgents = detailsData.length - 1; // -1 pour l'en-tête
    const totalSocietes = statistiquesGenerales.societes.length;

    let message = `✅ Exportation Excel réussie !

📊 Fichier: ${fileName}
📅 Période: ${dateDebut || "Début"} - ${dateFin || "Fin"}
👥 Agents exportés: ${totalAgents}
🏢 Sociétés: ${totalSocietes}
📄 Feuilles: 
  1. Détails Agents (par date)
  2. Par Société (toutes dates groupées)
  3. Résumé Sociétés`;

    if (societeFiltre) {
      message += `\n🏢 Société filtrée: ${societeFiltre}`;
    } else {
      message += `\n🏢 Toutes les sociétés`;
    }

    message += `\n\nLa feuille "Par Société" regroupe toutes les dates dans un seul tableau par société.`;

    alert(message);
  };

  const imprimerRapport = () => {
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up pour l'impression");
      return;
    }

    // Construire le HTML pour l'impression
    let printContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rapport Transport - Impression</title>
      <style>
        /* Styles d'impression */
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          
          .print-title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
          }
          
          .print-subtitle {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          
          .filtres-info {
            background: #f8f9fa;
            padding: 10px;
            margin: 15px 0;
            border-radius: 4px;
            font-size: 12px;
          }
          
          .societe-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          
          .societe-info-card {
            background: #e8f4f8;
            border: 1px solid #b3e5fc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
          }
          
          .societe-info-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #b3e5fc;
          }
          
          .societe-nom-print {
            font-size: 18px;
            font-weight: bold;
            color: #0277bd;
          }
          
          .societe-total {
            font-size: 16px;
            color: #2e7d32;
            font-weight: bold;
          }
          
          .societe-details-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 10px;
          }
          
          .societe-detail-item {
            font-size: 12px;
          }
          
          .societe-detail-label {
            font-weight: bold;
            color: #01579b;
          }
          
          .table-container {
            width: 100%;
            overflow-x: visible;
            margin: 15px 0;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          
          .print-table th {
            background-color: #2c3e50;
            color: white;
            padding: 8px;
            text-align: left;
            border: 1px solid #ddd;
          }
          
          .print-table td {
            padding: 6px;
            border: 1px solid #ddd;
            vertical-align: middle;
          }
          
          .print-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          
          .total-row {
            font-weight: bold;
            background-color: #e8f5e9;
            color: #2e7d32;
          }
          
          .date-group {
            background-color: #f5f5f5;
            font-weight: bold;
            color: #555;
          }
          
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
          }
          
          .badge.taxi {
            background-color: #e3f2fd;
            color: #1565c0;
          }
          
          .badge.autre {
            background-color: #f3e5f5;
            color: #7b1fa2;
          }
          
          .badge.ramassage {
            background-color: #e8f5e9;
            color: #2e7d32;
          }
          
          .badge.depart {
            background-color: #fff3e0;
            color: #f57c00;
          }
          
          .page-break {
            page-break-after: always;
          }
          
          .no-print {
            display: none;
          }
          
          .print-actions {
            display: none;
          }
        }
        
        /* Styles pour l'affichage avant impression */
        body {
          font-family: 'Arial', sans-serif;
          padding: 20px;
        }
        
        .print-actions {
          text-align: center;
          margin: 20px;
          padding: 20px;
          background: #f0f0f0;
          border-radius: 8px;
        }
        
        .print-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          margin: 0 10px;
        }
        
        .print-btn:hover {
          background: #0056b3;
        }
        
        .close-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
          margin: 0 10px;
        }
        
        .close-btn:hover {
          background: #545b62;
        }
        
        .print-logo {
          text-align: center;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="print-actions">
        <button class="print-btn" onclick="window.print()">🖨️ Imprimer le Rapport</button>
        <button class="close-btn" onclick="window.close()">✕ Fermer</button>
      </div>
      
      <div class="print-logo">
        <h1 style="color: #2c3e50;">RAPPORT DE TRANSPORT PAR SOCIÉTÉ</h1>
        <p style="color: #666;">Généré le ${new Date().toLocaleDateString(
          "fr-FR"
        )}</p>
      </div>
  `;

    // Informations sur les filtres
    const periode =
      dateDebut && dateFin ? `${dateDebut} au ${dateFin}` : "Toutes les dates";

    const societeInfo = societeFiltre ? societeFiltre : "Toutes les sociétés";

    printContent += `
    <div class="filtres-info">
      <strong>Période:</strong> ${periode}<br>
      <strong>Société:</strong> ${societeInfo}<br>
    </div>
  `;

    // Détails par société (toutes dates groupées)
    if (statistiquesGenerales.societes.length > 0) {
      statistiquesGenerales.societes.forEach((societe, societeIndex) => {
        printContent += `
        <div class="societe-section">
          <div class="societe-info-card">
            <div class="societe-info-header">
              <div class="societe-nom-print">🏢 ${societe.societe}</div>
              <div class="societe-total">${societe.totalPrix.toFixed(
                2
              )} TND</div>
            </div>
            <div class="societe-details-grid">
              <div class="societe-detail-item">
                <span class="societe-detail-label">Adresse:</span><br>
                ${societe.societeInfo?.adresse || "Non spécifié"}
              </div>
              <div class="societe-detail-item">
                <span class="societe-detail-label">Téléphone:</span><br>
                ${societe.societeInfo?.telephone || "Non spécifié"}
              </div>
              <div class="societe-detail-item">
                <span class="societe-detail-label">Matricule Fiscale:</span><br>
                ${societe.societeInfo?.matriculef || "Non spécifié"}
              </div>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
              <span>👥 Agents: ${societe.totalAgents}</span> | 
              <span>📋 Affectations: ${societe.nombreAffectations}</span> | 
              <span style="color: #1565c0;">🚕 Taxi: ${societe.prixTaxi.toFixed(
                2
              )} TND</span> | 
              <span style="color: #7b1fa2;">👨‍✈️ Autres: ${societe.prixAutres.toFixed(
                2
              )} TND</span>
            </div>
          </div>
          
          <div class="table-container">
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 10%">Date</th>
                  <th style="width: 15%">Agent</th>
                  <th style="width: 20%">Adresse Agent</th>
                  <th style="width: 12%">Téléphone Agent</th>
                  <th style="width: 10%">Type Transport</th>
                  <th style="width: 8%">Heure</th>
                  <th style="width: 10%">Type Chauffeur</th>
                  <th style="width: 10%">Prix (TND)</th>
                </tr>
              </thead>
              <tbody>
      `;

        // Grouper les agents par date pour faciliter la lecture
        const agentsParDate = societe.agents.reduce((acc, agent) => {
          if (!acc[agent.date]) {
            acc[agent.date] = [];
          }
          acc[agent.date].push(agent);
          return acc;
        }, {} as { [date: string]: typeof societe.agents });

        // Trier les dates par ordre décroissant
        const dates = Object.keys(agentsParDate).sort((a, b) => {
          const dateA = new Date(a.split("/").reverse().join("-"));
          const dateB = new Date(b.split("/").reverse().join("-"));
          return dateB.getTime() - dateA.getTime();
        });

        // Ajouter les lignes du tableau
        dates.forEach((date) => {
          const agentsDuJour = agentsParDate[date];

          // Ajouter une ligne de séparation pour chaque date
          printContent += `
          <tr class="date-group">
            <td colspan="8">
              <strong>📅 ${date} - ${agentsDuJour.length} agent(s)</strong>
            </td>
          </tr>
        `;

          agentsDuJour.forEach((agent, agentIndex) => {
            printContent += `
            <tr>
              <td>${agent.date}</td>
              <td>👤 ${agent.nom}</td>
              <td>📍 ${agent.adresse}</td>
              <td>📞 ${agent.telephone}</td>
              <td>
                <span class="badge ${
                  agent.typeTransport === "Ramassage" ? "ramassage" : "depart"
                }">
                  ${agent.typeTransport || "N/A"}
                </span>
              </td>
              <td>${agent.heure ? `${agent.heure}H` : "N/A"}</td>
              <td>
                <span class="badge ${agent.estTaxi ? "taxi" : "autre"}">
                  ${agent.estTaxi ? "🚕 Taxi" : "👨‍✈️ Samir"}
                </span>
              </td>
              <td><strong>${agent.prixParAgent.toFixed(2)}</strong></td>
            </tr>
          `;
          });
        });

        // Ligne de total pour la société
        printContent += `
                <tr class="total-row">
                  <td colspan="7"><strong>TOTAL ${
                    societe.societe
                  } :</strong></td>
                  <td><strong>${societe.totalPrix.toFixed(2)} TND</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

        // Ajouter un saut de page après chaque société (sauf la dernière)
        if (societeIndex < statistiquesGenerales.societes.length - 1) {
          printContent += `<div class="page-break"></div>`;
        }
      });
    } else {
      printContent += `
      <div style="text-align: center; padding: 40px;">
        <p style="color: #666; font-style: italic;">
          Aucune donnée trouvée pour les filtres sélectionnés
        </p>
      </div>
    `;
    }

    printContent += `
    </body>
    </html>
  `;

    // Écrire le contenu dans la nouvelle fenêtre
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="loading-container" style={{height: "100vh"}}>
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="rapport-financier">
      {/* En-tête */}
      <div className="rapport-header">
        <h1>📈 Rapport Financier par Société</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={resetFiltres}>
            🔄 Réinitialiser
          </button>
          <button className="btn-primary" onClick={imprimerRapport}>
            🖨️ Imprimer
          </button>
          <button className="btn-primary" onClick={exporterExcelXLSX}>
            📁 Exporter Excel
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
              {societesUniques.map((societe) => (
                <option key={societe} value={societe}>
                  {societe}
                </option>
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
              <div className="stat-values">
                {statistiquesGenerales.totalAffectations}
              </div>
              <div className="stat-labels">Total Affectations</div>
            </div>
          </div>
          <div className="stat-cards ramassage">
            <div className="stat-icons">🚗</div>
            <div className="stat-contents">
              <div className="stat-values">
                {statistiquesGenerales.totalRamassages}
              </div>
              <div className="stat-labels">Courses Ramassage</div>
            </div>
          </div>
          <div className="stat-cards depart">
            <div className="stat-icons">🏠</div>
            <div className="stat-contents">
              <div className="stat-values">
                {statistiquesGenerales.totalDeparts}
              </div>
              <div className="stat-labels">Courses Départ</div>
            </div>
          </div>
          <div className="stat-cards prix-total">
            <div className="stat-icons">💰</div>
            <div className="stat-contents">
              <div className="stat-values">
                {statistiquesGenerales.prixTotalGeneral.toFixed(2)} TND
              </div>
              <div className="stat-labels">Chiffre Total</div>
              <div className="stat-subtitles">
                Moyenne: {statistiquesGenerales.prixMoyenParCourse.toFixed(2)}{" "}
                TND/course
              </div>
            </div>
          </div>
          <div className="stat-cards taxi">
            <div className="stat-icons">🚕</div>
            <div className="stat-contents">
              <div className="stat-values">
                {statistiquesGenerales.prixTaxiTotal.toFixed(2)} TND
              </div>
              <div className="stat-labels">Revenus Taxis</div>
              <div className="stat-subtitles">
                {statistiquesGenerales.prixTotalGeneral > 0
                  ? `${(
                      (statistiquesGenerales.prixTaxiTotal /
                        statistiquesGenerales.prixTotalGeneral) *
                      100
                    ).toFixed(1)}% du total`
                  : "0%"}
              </div>
            </div>
          </div>
          <div className="stat-cards autres">
            <div className="stat-icons">👨‍✈️</div>
            <div className="stat-contents">
              <div className="stat-values">
                {statistiquesGenerales.prixAutresTotal.toFixed(2)} TND
              </div>
              <div className="stat-labels">Revenus Samir</div>
              <div className="stat-subtitles">
                {statistiquesGenerales.prixTotalGeneral > 0
                  ? `${(
                      (statistiquesGenerales.prixAutresTotal /
                        statistiquesGenerales.prixTotalGeneral) *
                      100
                    ).toFixed(1)}% du total`
                  : "0%"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rapport par société (TOUTES LES DATES DANS UN SEUL TABLEAU) */}
      <div className="rapport-detaille">
  <h3>🏢 Rapport par Société</h3>
  {statistiquesGenerales.societes.length > 0 ? (
    <div className="rapport-par-societe-unique">
      {statistiquesGenerales.societes.map((societe) => (
        <div key={societe.societe} className="societe-table-section-unique">
          <div className="societe-table-header-unique">
            <h5 className="societe-nom-tableau-unique">🏢 {societe.societe}</h5>
            <div className="societe-infos-tableau-unique">
              <small>
                📍 {societe.societeInfo?.adresse || "Non spécifié"} | 📞{" "}
                {societe.societeInfo?.telephone || "Non spécifié"} | 🏛️{" "}
                {societe.societeInfo?.matriculef || "Non spécifié"}
              </small>
            </div>
          </div>
          
          <div className="table-container">
            <table
              className="rapport-table-unique"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                margin: "15px 0",
                fontSize: "14px",
                backgroundColor: "white",
                border: "1px solid #ddd",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #3498db" }}>
                  <th
                    style={{
                      width: "10%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Agent
                  </th>
                  <th
                    style={{
                      width: "20%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Adresse Agent
                  </th>
                  <th
                    style={{
                      width: "12%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Téléphone Agent
                  </th>
                  <th
                    style={{
                      width: "10%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Type Transport
                  </th>
                  <th
                    style={{
                      width: "8%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Heure
                  </th>
                  <th
                    style={{
                      width: "10%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Type Chauffeur
                  </th>
                  <th
                    style={{
                      width: "10%",
                      padding: "10px 12px",
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    Prix Course (TND)
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let lastDate: string | null = null;
                  let rowIndex = 0;
                  
                  return societe.agents.map((agent, index) => {
                    const showDateHeader = lastDate !== agent.date;
                    lastDate = agent.date;
                    const agentsForThisDate = societe.agents.filter(a => a.date === agent.date);
                    const isFirstAgentForDate = agentsForThisDate[0]?.nom === agent.nom;
                    
                    return (
                      <React.Fragment key={`${societe.societe}-${agent.nom}-${index}`}>
                        {/* En-tête de date */}
                        {showDateHeader && (
                          <tr className="date-header">
                            <td 
                              colSpan={8} 
                              style={{ 
                                padding: "12px 15px", 
                                backgroundColor: "#e8f4f8",
                                borderTop: index > 0 ? "2px solid #3498db" : "none",
                                borderBottom: "1px solid #3498db",
                                fontWeight: "bold",
                                color: "#2c3e50",
                                fontSize: "14px"
                              }}
                            >
                              <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "10px",
                                justifyContent: "space-between"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ fontSize: "16px" }}>📅</span>
                                  <span>{agent.date}</span>
                                </div>
                                <span style={{ 
                                  fontSize: "13px", 
                                  color: "#7f8c8d",
                                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                                  padding: "4px 10px",
                                  borderRadius: "15px",
                                  border: "1px solid #bdc3c7"
                                }}>
                                  {agentsForThisDate.length} salarié(s) pour cette date
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {/* Ligne normale de données */}
                        <tr
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            backgroundColor: rowIndex % 2 === 0 ? "#f8f9fa" : "white",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <div className="date-info">
                              <span className="date-text" style={{fontSize: "14px"}}>{agent.date}</span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <div className="agent-info-compact">
                              <span className="agent-icon">👤</span>
                              <span className="agent-nom-text">
                                {agent.nom}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <div className="adresse-info">
                              <span className="adresse-icon">📍</span>
                              <span className="adresse-text">
                                {agent.adresse}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <div className="telephone-info">
                              <span className="telephone-icon">📞</span>
                              <span className="telephone-text">
                                {agent.telephone}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <span
                              className={`badge ${
                                agent.typeTransport === "Ramassage"
                                  ? "ramassage"
                                  : "depart"
                              }`}
                            >
                              {agent.typeTransport || "N/A"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <div className="heure-info">
                              <span className="heure-icon">⏰</span>
                              <span
                                className="heure-text"
                                style={{ fontWeight: "bold" }}
                              >
                                {agent.heure}H
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <span
                              className={`badge ${
                                agent.estTaxi ? "taxi" : "autre"
                              }`}
                            >
                              {agent.estTaxi ? "🚕 Taxi" : "👨‍✈️ Samir"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #e0e0e0",
                              fontWeight: "bold",
                            }}
                          >
                            <strong>{agent.prixParAgent.toFixed(2)} TND</strong>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()}
                
                {/* Ligne de total pour cette société */}
                <tr
                  className="total-row"
                  style={{ borderTop: "2px solid #2ecc71" }}
                >
                  <td
                    colSpan={7}
                    className="total-label"
                    style={{
                      padding: "12px 15px",
                      border: "1px solid #e0e0e0",
                      borderTop: "2px solid #2ecc71",
                      backgroundColor: "#e8f5e9",
                      fontWeight: "bold",
                      fontSize: "15px"
                    }}
                  >
                    <strong>TOTAL {societe.societe} :</strong>
                  </td>
                  <td
                    className="total-prix"
                    style={{
                      padding: "12px 15px",
                      border: "1px solid #e0e0e0",
                      borderTop: "2px solid #2ecc71",
                      backgroundColor: "#e8f5e9",
                      fontWeight: "bold",
                      fontSize: "15px"
                    }}
                  >
                    <strong>{societe.totalPrix.toFixed(2)} TND</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style={{ 
            textAlign: "right", 
            marginTop: "10px", 
            fontSize: "13px", 
            color: "#7f8c8d" 
          }}>
            <span style={{ 
              backgroundColor: "#f8f9fa", 
              padding: "5px 15px", 
              borderRadius: "15px",
              border: "1px solid #e0e0e0"
            }}>
              📊 Total: {societe.totalAgents} salarié sur {societe.nombreAffectations} courses
            </span>
          </div>
          
          <hr style={{ 
            border: "none", 
            height: "2px", 
            background: "linear-gradient(to right, transparent, #3498db, transparent)",
            margin: "25px 0 15px 0" 
          }} />
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
