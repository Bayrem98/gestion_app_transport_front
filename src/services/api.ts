import axios from 'axios';
import { Agent, Affectation, PlanningData } from '../@types/shared';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Types pour les réponses API
export interface ApiResponse<T> {
  data: T;
}

export class TransportApiService {
  // Agents
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

  // Statistiques
  static async getStatistiquesMensuelles(mois?: number, annee?: number): Promise<any> {
    const params = new URLSearchParams();
    if (mois) params.append('mois', mois.toString());
    if (annee) params.append('annee', annee.toString());
    
    const response = await api.get(`/affectations/statistiques/mensuelles?${params}`);
    return response.data;
  }
}

export default api;