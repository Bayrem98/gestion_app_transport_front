import React, { useState } from 'react';
import { migrateSocietesToDB } from '../utils/migrateSocietes';
import './MigrationButton.css';

interface MigrationButtonProps {
  onComplete?: () => void;
}

export const MigrationButton: React.FC<MigrationButtonProps> = ({ onComplete }) => {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ success: 0, errors: 0, total: 0 });

  const handleMigration = async () => {
    if (!window.confirm('Voulez-vous migrer les sociétés du localStorage vers la base de données ?')) {
      return;
    }

    setMigrating(true);
    setProgress({ success: 0, errors: 0, total: 0 });

    try {
      const result = await migrateSocietesToDB();
setProgress(prev => ({ ...prev, ...result, total: result.success + result.errors }));
      
      if (result.errors === 0) {
        alert(`✅ Migration réussie ! ${result.success} sociétés migrées.`);
      } else {
        alert(`⚠️ Migration partielle : ${result.success} succès, ${result.errors} erreurs.`);
      }
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Erreur migration:', error);
      alert('❌ Erreur lors de la migration');
    } finally {
      setMigrating(false);
    }
  };

  const societesLocal = localStorage.getItem('societes_locales');
  const societesCount = societesLocal ? JSON.parse(societesLocal).length : 0;

  if (societesCount === 0) {
    return null;
  }

  return (
    <div className="migration-button">
      <div className="migration-info">
        <span className="migration-icon">🔄</span>
        <span className="migration-text">
          {societesCount} société(s) en attente dans localStorage
        </span>
      </div>
      <button
        onClick={handleMigration}
        disabled={migrating}
        className="migration-btn"
      >
        {migrating ? 'Migration en cours...' : 'Migrer vers la base de données'}
      </button>
      
      {migrating && (
        <div className="migration-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${progress.total > 0 ? (progress.success / progress.total) * 100 : 0}%` 
              }}
            />
          </div>
          <div className="progress-stats">
            <span className="stat-success">✅ {progress.success}</span>
            <span className="stat-errors">❌ {progress.errors}</span>
          </div>
        </div>
      )}
    </div>
  );
};