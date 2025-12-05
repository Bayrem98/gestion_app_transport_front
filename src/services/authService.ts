import { UserRole } from '../pages/ProtectedRoute';
import { TransportApiService } from './api';

export class AuthService {
  static async loginUser(username: string, password: string) {
    const response = await TransportApiService.login(username, password);
    // Stocker le rôle de l'utilisateur
    localStorage.setItem('user_role', 'Utilisateur');
    return response;
  }

  static async loginAdmin(username: string, password: string) {
    const response = await TransportApiService.loginAdmin(username, password);
    // Stocker le rôle de l'utilisateur
    localStorage.setItem('user_role', 'Comptabilité');
    return response;
  }

  static async loginSupadmin(username: string, password: string) {
    const response = await TransportApiService.loginSupadmin(username, password);
    // Stocker le rôle de l'utilisateur
    localStorage.setItem('user_role', 'Administrateur');
    return response;
  }

  static async registerUser(userData: any) {
    return await TransportApiService.register(userData);
  }

  static async registerAdmin(adminData: any) {
    return await TransportApiService.registerAdmin(adminData);
  }

  static async registerSupadmin(supadminData: any) {
    return await TransportApiService.registerSupadmin(supadminData);
  }

  static logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    window.location.href = '/';
  }

  static logoutAdmin() {
    // Supprimer les cookies et le localStorage
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    window.location.href = '/';
  }

  // Méthode pour vérifier si l'utilisateur est connecté
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Méthode pour obtenir le rôle de l'utilisateur
  static getUserRole(): string {
    return localStorage.getItem('user_role') || 'Utilisateur';
  }

  // Méthode pour obtenir le nom d'utilisateur
  static getUsername(): string {
    return localStorage.getItem('access_token') || '';
  }

  // Méthode pour vérifier si l'utilisateur a accès à une route
  static hasAccessToRoute(route: string): boolean {
    const userRole = this.getUserRole() as UserRole;
    
    const routeAccess: Record<UserRole, string[]> = {
      'Administrateur': [
        '/import-agents',
        '/chauffeurspage', 
        '/agents',
        '/affectations',
        '/recap',
        '/rapports',
        '/users'
      ],
      'Comptabilité': [
        '/import-agents',
        '/recap',
        '/rapports'
      ],
      'Utilisateur': [
        '/import-agents',
        '/chauffeurspage',
        '/agents', 
        '/affectations',
        '/recap'
      ]
    };

    return routeAccess[userRole]?.includes(route) || false;
  }

  // Méthode pour obtenir les routes accessibles
  static getAccessibleRoutes(): string[] {
    const userRole = this.getUserRole() as UserRole;
    
    const routeAccess: Record<UserRole, string[]> = {
      'Administrateur': [
        '/import-agents',
        '/chauffeurspage',
        '/agents',
        '/affectations', 
        '/recap',
        '/rapports',
        '/users'
      ],
      'Comptabilité': [
        '/import-agents',
        '/recap',
        '/rapports'
      ],
      'Utilisateur': [
        '/import-agents',
        '/chauffeurspage',
        '/agents',
        '/affectations',
        '/recap'
      ]
    };

    return routeAccess[userRole] || [];
  }
}

export default AuthService;