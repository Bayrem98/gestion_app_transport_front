import React, { useState, useEffect, useRef } from 'react';
import './SelectSociete.css';
import { Societe } from '../../@types/shared';

interface SelectSocieteProps {
  value: string;
  onChange: (societeId: string) => void;
  onSocieteSelect?: (societe: Societe) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  societes: Societe[];
  onNewSociete?: (societe: Societe) => void;
}

export const SelectSociete: React.FC<SelectSocieteProps> = ({
  value,
  onChange,
  onSocieteSelect,
  required = false,
  placeholder = "Sélectionner une société...",
  className = "",
  societes = [],
  onNewSociete
}) => {
  const [filteredSocietes, setFilteredSocietes] = useState<Societe[]>(societes);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSociete, setNewSociete] = useState<Partial<Societe>>({
    nom: '',
    adresse: '',
    telephone: '',
    matriculef: ''
  });
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFilteredSocietes(societes);
    
    // Fermer le dropdown en cliquant à l'extérieur
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowCreateForm(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [societes]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSocietes(societes);
    } else {
      const filtered = societes.filter(societe =>
        societe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (societe.adresse && societe.adresse.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (societe.telephone && societe.telephone.includes(searchTerm))
      );
      setFilteredSocietes(filtered);
    }
  }, [searchTerm, societes]);

  const getSelectedSocieteName = () => {
    if (!value) return '';
    const societe = societes.find(s => s._id === value);
    return societe ? societe.nom : '';
  };

  const handleSelectSociete = (societe: Societe) => {
    onChange(societe._id!);
    if (onSocieteSelect) {
      onSocieteSelect(societe);
    }
    setSearchTerm(societe.nom);
    setShowDropdown(false);
    setShowCreateForm(false);
  };

  const handleCreateNewSociete = () => {
    if (!newSociete.nom || newSociete.nom.trim() === '') {
      alert('Le nom de la société est requis');
      return;
    }

    const nouvelleSociete: Societe = {
      _id: Date.now().toString(),
      nom: newSociete.nom.trim(),
      adresse: newSociete.adresse?.trim() || '',
      telephone: newSociete.telephone?.trim() || '',
      matriculef: newSociete.matriculef?.trim() || ''
    };

    // Ajouter à la liste locale
    if (onNewSociete) {
      onNewSociete(nouvelleSociete);
    }

    // Sélectionner la nouvelle société
    handleSelectSociete(nouvelleSociete);

    // Réinitialiser le formulaire
    setNewSociete({
      nom: '',
      adresse: '',
      telephone: '',
      matriculef: ''
    });
    
    setShowCreateForm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      const exactMatch = societes.find(s => 
        s.nom.toLowerCase() === searchTerm.toLowerCase().trim()
      );
      
      if (!exactMatch) {
        setNewSociete({...newSociete, nom: searchTerm.trim()});
        setShowCreateForm(true);
        e.preventDefault();
      }
    }
  };

  return (
    <div className={`select-societe ${className}`} ref={wrapperRef}>
      <div className="select-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm || getSelectedSocieteName()}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className="select-input"
        />
        <button 
          type="button" 
          className="select-arrow"
          onClick={() => {
            setShowDropdown(!showDropdown);
            if (!showDropdown && inputRef.current) {
              inputRef.current.focus();
            }
          }}
        >
          {showDropdown ? '▲' : '▼'}
        </button>
      </div>
      
      {showDropdown && (
        <div className="dropdown-menu">
          {filteredSocietes.length > 0 ? (
            <>
              <div className="societes-list">
                {filteredSocietes.map((societe) => (
                  <div
                    key={societe._id}
                    className={`societe-item ${value === societe._id ? 'selected' : ''}`}
                    onClick={() => handleSelectSociete(societe)}
                  >
                    <div className="societe-name">{societe.nom}</div>
                    <div className="societe-details">
                      {societe.telephone && <span>📞 {societe.telephone}</span>}
                      {societe.adresse && <span>📍 {societe.adresse}</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              {searchTerm.trim() !== '' && !societes.some(s => 
                s.nom.toLowerCase() === searchTerm.toLowerCase().trim()
              ) && (
                <div className="create-option">
                  <div 
                    className="create-option-btn"
                    onClick={() => {
                      setNewSociete({...newSociete, nom: searchTerm.trim()});
                      setShowCreateForm(true);
                    }}
                  >
                    <span className="create-icon">➕</span>
                    <span>Créer "{searchTerm}"</span>
                  </div>
                </div>
              )}
            </>
          ) : searchTerm.trim() !== '' ? (
            <div className="create-new-section">
              <div className="create-new-header">
                <span>Créer une nouvelle société</span>
              </div>
              <div className="create-new-form">
                <input
                  type="text"
                  value={newSociete.nom || searchTerm}
                  onChange={(e) => setNewSociete({...newSociete, nom: e.target.value})}
                  placeholder="Nom de la société *"
                  className="new-input"
                  autoFocus
                />
                <input
                  type="text"
                  value={newSociete.adresse || ''}
                  onChange={(e) => setNewSociete({...newSociete, adresse: e.target.value})}
                  placeholder="Adresse (optionnel)"
                  className="new-input"
                />
                <input
                  type="tel"
                  value={newSociete.telephone || ''}
                  onChange={(e) => setNewSociete({...newSociete, telephone: e.target.value})}
                  placeholder="Téléphone (optionnel)"
                  className="new-input"
                />
                <input
                  type="text"
                  value={newSociete.matriculef || ''}
                  onChange={(e) => setNewSociete({...newSociete, matriculef: e.target.value})}
                  placeholder="Matricule F (optionnel)"
                  className="new-input"
                />
                <div className="create-actions">
                  <button
                    type="button"
                    onClick={handleCreateNewSociete}
                    disabled={!newSociete.nom?.trim()}
                    className="create-btn"
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setSearchTerm('');
                    }}
                    className="cancel-btn"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-results">
              Aucune société trouvée
            </div>
          )}
        </div>
      )}
    </div>
  );
};