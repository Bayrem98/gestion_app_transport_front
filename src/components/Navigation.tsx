import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, Modal, Avatar, MenuProps } from 'antd';
import { 
  LogoutOutlined, 
  UserOutlined, 
  SettingOutlined,
  DownOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import './Navigation.css';
import AuthService from '../services/authService';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    // Récupérer les informations de l'utilisateur connecté
    const username = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role') || 'Utilisateur';
    
    if (username) {
      setUserRole(role);
    }
  }, []);

  const handleLogout = () => {
    setIsModalVisible(true);
  };

  const confirmLogout = () => {
    // Déconnexion en fonction du rôle
    if (userRole === 'Administrateur' || userRole === 'Comptabilité') {
      AuthService.logoutAdmin();
    } else {
      AuthService.logout();
    }
    
    setIsModalVisible(false);
    navigate('/');
  };

  const cancelLogout = () => {
    setIsModalVisible(false);
  };

  // Définir les items du menu dropdown
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profil Utilisateur',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Paramètres',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Déconnexion',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const getRoleBadge = () => {
    switch(userRole) {
      case 'Administrateur':
        return <span className="role-badge admin">Admin</span>;
      case 'Comptabilité':
        return <span className="role-badge accounting">Compta</span>;
      default:
        return <span className="role-badge user">User</span>;
    }
  };

  return (
    <>
      <nav className="navigation">
        <div className="nav-brand">
          <h2>Gestion Transport</h2>
        </div>
        
        <ul className="nav-links">
  {/* Lien Récapitulatif - pour tous les rôles */}
  {(userRole === 'Utilisateur' || userRole === 'Administrateur' || userRole === 'Comptabilité') && (
    <li>
      <Link 
        to="/import-agents" 
        className={location.pathname === '/import-agents' ? 'active' : ''}
      >
        📊 Dashboard
      </Link>
    </li>
  )}
  
  {/* Lien Salariés - pour Utilisateur et Administrateur */}
  {(userRole === 'Utilisateur' || userRole === 'Administrateur') && (
    <li>
      <Link 
        to="/agents" 
        className={location.pathname === '/agents' ? 'active' : ''}
      >
        👥 Salariés
      </Link>
    </li>
  )}
  
  {/* Lien Chauffeurs - pour Utilisateur et Administrateur */}
  {(userRole === 'Utilisateur' || userRole === 'Administrateur') && (
    <li>
      <Link 
        to="/chauffeurspage" 
        className={location.pathname === '/chauffeurspage' ? 'active' : ''}
      >
        🚐 Chauffeurs
      </Link>
    </li>
  )}
  
  {/* Lien Affectation - pour Utilisateur et Administrateur */}
  {(userRole === 'Utilisateur' || userRole === 'Administrateur') && (
    <li>
      <Link 
        to="/affectations" 
        className={location.pathname === '/affectations' ? 'active' : ''}
      >
        🎯 Affectation
      </Link>
    </li>
  )}

  {/* Lien Récapitulatif - pour tous les rôles */}
  {(userRole === 'Comptabilité' || userRole === 'Administrateur') && (
  <li>
    <Link 
      to="/validation" 
      className={location.pathname === '/validation' ? 'active' : ''}
    >
      ✅ Validation
    </Link>
  </li>
  )}

  {/* Lien Rapports - pour Comptabilité et Administrateur */}
  {(userRole === 'Comptabilité' || userRole === 'Administrateur') && (
    <li>
      <Link 
        to="/rapports" 
        className={location.pathname === '/rapports' ? 'active' : ''}
      >
        📈 Rapports
      </Link>
    </li>
  )}

  {/* Menu Gestion des utilisateurs - seulement pour Administrateur */}
  {userRole === 'Administrateur' && (
    <li>
      <Link 
        to="/users" 
        className={location.pathname === '/users' ? 'active' : ''}
      >
        👥 Gestion Users
      </Link>
    </li>
  )}
</ul>

        <div className="nav-user-section">
          <Dropdown 
            menu={{ items: userMenuItems }}
            placement="bottomRight" 
            trigger={['click']}
            arrow={{ pointAtCenter: true }}
          >
            <div className="user-profile">
              <Avatar 
                size="small" 
                icon={<UserOutlined />} 
                className="user-avatar"
              />
              <div className="user-info">
                <div className="user-details">
                  {getRoleBadge()}
                  <DownOutlined className="dropdown-arrow" />
                </div>
              </div>
            </div>
          </Dropdown>
        </div>
      </nav>

      {/* Modal de confirmation de déconnexion */}
      <Modal
        title={
          <div className="logout-modal-title">
            <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Confirmation de déconnexion
          </div>
        }
        open={isModalVisible}
        onOk={confirmLogout}
        onCancel={cancelLogout}
        okText="Déconnexion"
        cancelText="Annuler"
        okButtonProps={{ danger: true, icon: <LogoutOutlined /> }}
      >
        <p>Êtes-vous sûr de vouloir vous déconnecter ?</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          Vous devrez vous reconnecter pour accéder à l'application.
        </p>
      </Modal>
    </>
  );
};