import axios from 'axios';
import { Agent, Affectation, PlanningData, Chauffeur } from '../@types/shared';
import User from '../@types/User';
import Adminuser from '../@types/Adminuser';
import Supadmin from '../@types/Supadmin';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Types pour les réponses API
export interface ApiResponse<T> {
  data: T;
}

export class TransportApiService {
  // === SERVICES UTILISATEURS ===

  // Users (Utilisateurs Standard)
  static async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/user');
    return response.data;
  }

  static async getUser(id: string): Promise<User> {
    const response = await api.get<User>(`/user/${id}`);
    return response.data;
  }

  static async createUser(user: Partial<User>): Promise<User> {
    const response = await api.post<User>('/user', user);
    return response.data;
  }

  static async updateUser(id: string, user: Partial<User>): Promise<User> {
    const response = await api.put<User>(`/user/${id}`, user);
    return response.data;
  }

  static async deleteUser(id: string): Promise<void> {
    await api.delete(`/user/${id}`);
  }

  // Adminusers (Comptabilité)
  static async getAdminusers(): Promise<Adminuser[]> {
    const response = await api.get<Adminuser[]>('/adminuser');
    return response.data;
  }

  static async getAdminuser(id: string): Promise<Adminuser> {
    const response = await api.get<Adminuser>(`/adminuser/${id}`);
    return response.data;
  }

  static async createAdminuser(adminuser: Partial<Adminuser>): Promise<Adminuser> {
    const response = await api.post<Adminuser>('/adminuser', adminuser);
    return response.data;
  }

  static async updateAdminuser(id: string, adminuser: Partial<Adminuser>): Promise<Adminuser> {
    const response = await api.put<Adminuser>(`/adminuser/${id}`, adminuser);
    return response.data;
  }

  static async deleteAdminuser(id: string): Promise<void> {
    await api.delete(`/adminuser/${id}`);
  }

  // Supadmins (Administrateurs)
  static async getSupadmins(): Promise<Supadmin[]> {
    const response = await api.get<Supadmin[]>('/supadmin');
    return response.data;
  }

  static async getSupadmin(id: string): Promise<Supadmin> {
    const response = await api.get<Supadmin>(`/supadmin/${id}`);
    return response.data;
  }

  static async createSupadmin(supadmin: Partial<Supadmin>): Promise<Supadmin> {
    const response = await api.post<Supadmin>('/supadmin', supadmin);
    return response.data;
  }

  static async updateSupadmin(id: string, supadmin: Partial<Supadmin>): Promise<Supadmin> {
    const response = await api.put<Supadmin>(`/supadmin/${id}`, supadmin);
    return response.data;
  }

  static async deleteSupadmin(id: string): Promise<void> {
    await api.delete(`/supadmin/${id}`);
  }

  // === SERVICES AUTHENTIFICATION ===
  static async login(username: string, password: string): Promise<any> {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  }

  static async loginAdmin(username: string, password: string): Promise<any> {
    const response = await api.post('/auth/logina', { username, password });
    return response.data;
  }

  static async loginSupadmin(username: string, password: string): Promise<any> {
    const response = await api.post('/auth/loginsup', { username, password });
    return response.data;
  }

  static async register(userData: Partial<User>): Promise<User> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  }

  static async registerAdmin(adminData: Partial<Adminuser>): Promise<Adminuser> {
    const response = await api.post('/auth/registera', adminData);
    return response.data;
  }

  static async registerSupadmin(supadminData: Partial<Supadmin>): Promise<Supadmin> {
    const response = await api.post('/auth/registersup', supadminData);
    return response.data;
  }

  // === SERVICES EXISTANTS ===

  // Chauffeurs
  static async getChauffeurByNom(nom: string): Promise<Chauffeur> {
    const response = await api.get<Chauffeur>(`/chauffeurs/nom/${encodeURIComponent(nom)}`);
    return response.data;
  }

  static async getChauffeurs(): Promise<Chauffeur[]> {
    const response = await api.get<Chauffeur[]>('/chauffeurs');
    return response.data;
  }

  static async createChauffeur(chauffeur: Partial<Chauffeur>): Promise<Chauffeur> {
    const response = await api.post<Chauffeur>('/chauffeurs', chauffeur);
    return response.data;
  }

  static async updateChauffeur(id: string, chauffeur: Partial<Chauffeur>): Promise<Chauffeur> {
    const response = await api.put<Chauffeur>(`/chauffeurs/${id}`, chauffeur);
    return response.data;
  }

  static async deleteChauffeur(id: string): Promise<void> {
    await api.delete(`/chauffeurs/${id}`);
  }

  // Agents
  static async getAgentByNom(nom: string): Promise<Agent> {
    const response = await api.get<Agent>(`/agents/nom/${encodeURIComponent(nom)}`);
    return response.data;
  }

  static async getAgents(): Promise<Agent[]> {
    const response = await api.get<Agent[]>('/agents');
    return response.data;
  }

  static async createAgent(agent: Partial<Agent>): Promise<Agent> {
    const response = await api.post<Agent>('/agents', agent);
    return response.data;
  }

  static async updateAgent(id: string, agent: Partial<Agent>): Promise<Agent> {
    const response = await api.put<Agent>(`/agents/${id}`, agent);
    return response.data;
  }

  static async deleteAgent(id: string): Promise<void> {
    await api.delete(`/agents/${id}`);
  }

  static async verifierAgentsManquants(nomsAgents: string[]): Promise<string[]> {
    const response = await api.post<string[]>('/agents/verifier-manquants', nomsAgents);
    return response.data;
  }

  // Affectations
  static async getAffectations(): Promise<Affectation[]> {
    const response = await api.get<Affectation[]>('/affectations');
    return response.data;
  }

  static async createAffectation(affectation: Partial<Affectation>): Promise<Affectation> {
    const response = await api.post<Affectation>('/affectations', affectation);
    return response.data;
  }

  static async updateAffectation(id: string, affectation: Partial<Affectation>): Promise<Affectation> {
    const response = await api.put<Affectation>(`/affectations/${id}`, affectation);
    return response.data;
  }

  static async deleteAffectation(id: string): Promise<void> {
    await api.delete(`/affectations/${id}`);
  }

  // Planning
  static async uploadPlanning(file: File): Promise<PlanningData[]> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<PlanningData[]>('/planning/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Importation des agents depuis un fichier CSV
  static async importAgents(file: File): Promise<{ importedCount: number }> {
  const formData = new FormData();
  formData.append('file', file);  // ← Créer FormData avec le File
  
  const response = await api.post<{ importedCount: number }>('/agents/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

  // Statistiques
  static async getStatistiquesMensuelles(mois?: number, annee?: number): Promise<any> {
    const params = new URLSearchParams();
    if (mois) params.append('mois', mois.toString());
    if (annee) params.append('annee', annee.toString());
    
    const response = await api.get(`/affectations/statistiques/mensuelles?${params}`);
    return response.data;
  }

  static async filtrerAgentsPlanning(
    jour: string, 
    typeTransport: 'Ramassage' | 'Départ'
  ): Promise<string[]> {
    const response = await api.post<string[]>('/planning/filtrer-agents', {
      jour,
      typeTransport
    });
    return response.data;
  }
}



export default api;