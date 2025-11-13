// Types communs entre frontend et backend
export interface Agent {
  _id?: string;
  nom: string;
  adresse: string;
  telephone: string;
  societe: string;
  voiturePersonnelle: boolean;
  chauffeurNom?: string;
  vehiculeChauffeur?: string;
  createdAt?: string;
}

export interface Affectation {
  _id?: string;
  chauffeur: string;
  heure: number;
  agentNom: string;
  adresse: string;
  telephone: string;
  societe: string;
  vehicule: string;
  typeTransport: 'Ramassage' | 'Départ';
  jour: string;
  dateAjout: string;
  dateReelle: string;
  prixCourse: number;
  statutPaiement: 'Non payé' | 'Payé';
  createdAt?: string;
}

export interface AppConfig {
  PRIX_COURSE_CHAUFFEUR: number;
  PRIX_COURSE_TAXI: number;
}

export interface PlanningData {
  Salarie: string;
  Lundi: string;
  Mardi: string;
  Mercredi: string;
  Jeudi: string;
  Vendredi: string;
  Samedi: string;
  Dimanche: string;
  Qualification: string;
}

export interface StatistiquesMensuelles {
  periode: string;
  totalCourses: number;
  chauffeursNormaux: { [chauffeur: string]: number };
  chauffeursTaxi: { [chauffeur: string]: number };
  societesNormaux: { [societe: string]: number };
  societesTaxi: { [societe: string]: number };
  totalMontant: number;
}