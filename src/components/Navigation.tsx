import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>🚗 Gestion Transport</h2>
      </div>
      <ul className="nav-links">
        <li>
          <Link 
            to="/import-agents" 
            className={location.pathname === '/import-agents' ? 'active' : ''}
          >
             📊 Dashboard
          </Link>
        </li>
        {/*<li>
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
           
          </Link>
        </li> */}
        <li>
          <Link 
            to="/agents" 
            className={location.pathname === '/agents' ? 'active' : ''}
          >
            👥 Salariés
          </Link>
        </li>
        <li>
          <Link 
            to="/chauffeurspage" 
            className={location.pathname === '/chauffeurspage' ? 'active' : ''}
          >
            🚐 Chauffeurs
          </Link>
        </li>
        
        <li>
          <Link 
            to="/chauffeurs" 
            className={location.pathname === '/chauffeurs' ? 'active' : ''}
          >
            🎯 Affectation
          </Link>
        </li>
        <li>
          <Link 
            to="/rapports" 
            className={location.pathname === '/rapports' ? 'active' : ''}
          >
            📈 Rapports
          </Link>
        </li>
      </ul>
    </nav>
  );
};