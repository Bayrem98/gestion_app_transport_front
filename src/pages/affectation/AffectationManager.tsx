import React, { useState } from 'react';
import { AffectationFormPage } from './AffectationFormPage';
import './AffectationManager.css';
import { Affectation } from '../../@types/shared';
import { RecapitulatifCourses } from './RecapitulatifCourses';

type Page = 'form' | 'validation' | 'recap';

export const AffectationManager: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('recap'); // Par défaut sur le récap
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAffectationAdded = () => {
    console.log('✅ Nouvelle affectation ajoutée, redirection vers la validation...');
    setRefreshTrigger(prev => prev + 1);
    setCurrentPage('validation');
  };

  const handleValidationComplete = (affectationsValidees: Affectation[]) => {
    console.log('✅ Affectations validées à enregistrer dans le récap:', affectationsValidees);
    
    // Rediriger vers le récap
    setCurrentPage('recap');
    
    // Rafraîchir la validation
    setRefreshTrigger(prev => prev + 1);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'form':
        return (
          <AffectationFormPage
            onAffectationAdded={handleAffectationAdded}
            onNavigateToValidation={() => setCurrentPage('recap')}
          />
        );
     {/* case 'validation':
        return (
          <AffectationValidationPage
            onNavigateToForm={() => setCurrentPage('form')}
          />
        ); */}
      case 'recap':
        return (
          <RecapitulatifCourses />
        );
      default:
        return null;
    }
  };

  return (
    <div className="affectation-manager">
      <nav className="navigation-tabs">
        <button 
          className={`tab ${currentPage === 'form' ? 'active' : ''}`}
          onClick={() => setCurrentPage('form')}
        >
          ➕ Ajout Affectation
        </button>
       {/* <button 
          className={`tab ${currentPage === 'validation' ? 'active' : ''}`}
          onClick={() => setCurrentPage('validation')}
        >
          📋 Validation
          {refreshTrigger > 0 && <span className="tab-badge">{refreshTrigger}</span>}
        </button> */}
        <button 
          className={`tab ${currentPage === 'recap' ? 'active' : ''}`}
          onClick={() => setCurrentPage('recap')}
        >
          🗓️ Récapitulatif
        </button>
      </nav>

      <div className="page-content">
        {renderPage()}
      </div>
    </div>
  );
};