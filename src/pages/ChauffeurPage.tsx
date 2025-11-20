import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TransportApiService } from '../services/api';
import { Chauffeur } from '../@types/shared';
import './ChauffeurPage.css';

export const ChauffeurPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChauffeur, setEditingChauffeur] = useState<Chauffeur | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadChauffeurs();
  }, []);

  useEffect(() => {
    // Vérifier si on doit ouvrir le formulaire d'édition depuis l'URL
    const urlParams = new URLSearchParams(location.search);
    const editChauffeurId = urlParams.get('edit');
    const returnTo = urlParams.get('returnTo');
    
    if (editChauffeurId && chauffeurs.length > 0) {
      // Trouver l'agent à éditer
      const chauffeurToEdit = chauffeurs.find(chauffeur => chauffeur._id === editChauffeurId);
      if (chauffeurToEdit) {
        setEditingChauffeur(chauffeurToEdit);
        setShowForm(true);
        
        // Faire défiler jusqu'au formulaire
        setTimeout(() => {
          const formElement = document.querySelector('.chauffeur-form-container');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [location.search, chauffeurs]);

  const loadChauffeurs = async () => {
    try {
      const chauffeursData = await TransportApiService.getChauffeurs();
      setChauffeurs(chauffeursData);
    } catch (error) {
      console.error('Erreur chargement chauffeurs:', error);
      alert('Erreur lors du chargement des Chauffeurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const chauffeurData: Partial<Chauffeur> = {
      nom: formData.get('nom') as string,
      cin: formData.get('cin') as string,
      telephone: formData.get('telephone') as string,
      societe: formData.get('societe') as string,
      voiture: formData.get('voiture') as string,
    };

    try {
      if (editingChauffeur) {
        await TransportApiService.updateChauffeur(editingChauffeur._id!, chauffeurData);
        alert('✅ Chauffeur mis à jour avec succès !');
      } else {
        await TransportApiService.createChauffeur(chauffeurData);
        alert('✅ Chauffeur créé avec succès !');
      }
      await loadChauffeurs();
      setShowForm(false);
      setEditingChauffeur(null);
      
      // Vérifier si on doit retourner à la page d'import
      const urlParams = new URLSearchParams(location.search);
      const returnTo = urlParams.get('returnTo');
      
      if (returnTo === 'import') {
        // Retourner à la page d'import
        navigate('/import-agents');
      } else {
        // Nettoyer l'URL après sauvegarde réussie
        navigate('/chauffeurspage', { replace: true });
      }
      
      // Reset form
      e.currentTarget.reset();
    } catch (error) {
      console.error('Erreur sauvegarde Chauffeur:', error);
      alert('❌ Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (chauffeur: Chauffeur) => {
    setEditingChauffeur(chauffeur);
    setShowForm(true);
    // Mettre à jour l'URL pour refléter l'édition
    navigate(`/chauffeurspage?edit=${chauffeur._id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce Chauffeur ?')) {
      try {
        await TransportApiService.deleteChauffeur(id);
        await loadChauffeurs();
        alert('✅ Chauffeur supprimé avec succès !');
      } catch (error) {
        console.error('Erreur suppression Chauffeur:', error);
        alert('❌ Erreur lors de la suppression');
      }
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingChauffeur(null);
    
    // Vérifier si on doit retourner à la page d'import
    const urlParams = new URLSearchParams(location.search);
    const returnTo = urlParams.get('returnTo');
    
    if (returnTo === 'import') {
      // Retourner à la page d'import
      navigate('/import-agents');
    } else {
      // Nettoyer l'URL lors de l'annulation
      navigate('/chauffeurspage', { replace: true });
    }
  };

  // Bouton pour retourner à l'import
  const handleReturnToImport = () => {
    navigate('/import-agents');
  };

  const filteredChauffeurs = chauffeurs.filter(chauffeur =>
    chauffeur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chauffeur.societe.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chauffeur.cin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Chargement des salariés...</div>;
  }

  return (
    <div className="gestion-chauffeurs">
      <div className="chauffeurs-header">
        <h1 style={{color: "black"}}>🚐 Gestion des Chauffeurs</h1>
        <div className="header-actions">
          {location.search.includes('returnTo=import') && (
            <button 
              className="btn-secondary"
              onClick={handleReturnToImport}
            >
              ↩️ Retour
            </button>
          )}
          <button 
            className="btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingChauffeur(null);
              if (showForm) {
                navigate('/chauffeurspage', { replace: true });
              }
            }}
          >
            {showForm ? '❌ Annuler' : '➕ Ajouter un chauffeur'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="chauffeur-form-container">
          <h2>{editingChauffeur ? '✏️ Modifier Chauffeur' : '➕ Nouveau Chauffeur'}</h2>
          <form onSubmit={handleSubmit} className="chauffeur-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  name="nom"
                  defaultValue={editingChauffeur?.nom}
                  required
                  placeholder="Nom et prénom"
                />
              </div>

              <div className="form-group">
            <label>Cin Num° *</label>
              <input
                  type="text"
                  name="cin"
                  defaultValue={editingChauffeur?.cin}
                  required
                  placeholder="CIN du chauffeur"
                />
            </div> 

              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="tel"
                  name="telephone"
                  defaultValue={editingChauffeur?.telephone}
                  required
                  placeholder="Numéro de téléphone"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Société *</label>
                <input
                  type="text"
                  name="societe"
                  defaultValue={editingChauffeur?.societe}
                  required
                  placeholder="Nom de la société"
                />
              </div>
             <div className="form-group">
                <label>🚘 Modèle du voiture</label>
                <input
                  type="text"
                  name="voiture"
                  defaultValue={editingChauffeur?.voiture}
                  placeholder="Modèle du voiture"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingChauffeur ? '💾 Mettre à jour' : '✅ Enregistrer'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleCancelEdit}
              >
                ❌ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="chauffeurs-content">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Rechercher un chauffeur par nom, société ou adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="chauffeurs-count">
            {filteredChauffeurs.length} chauffeur(s) trouvé(s)
          </span>
        </div>

        <div className="chauffeurs-grid">
          {filteredChauffeurs.length > 0 ? (
            filteredChauffeurs.map(chauffeur => (
              <div key={chauffeur._id} className="chauffeur-card">
                <div className="chauffeur-card-header">
                  <h3>{chauffeur.nom}</h3>
                  <div className="chauffeur-actions">
                    <button 
                      onClick={() => handleEdit(chauffeur)}
                      className="btn-edit"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => chauffeur._id && handleDelete(chauffeur._id)}
                      className="btn-delete"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="chauffeur-details">
                  <p><strong>📞 Téléphone:</strong> {chauffeur.telephone}</p>
                  <p><strong>📄 Cin:</strong> {chauffeur.cin}</p>
                  <p><strong>🏢 Société:</strong> {chauffeur.societe}</p>
                  <p><strong>🚘 Voiture:</strong> {chauffeur.voiture} </p>

                  {chauffeur.createdAt && (
                    <p className="creation-date">
                      <strong>📅 Créé le:</strong> {new Date(chauffeur.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">
              {searchTerm ? 'Aucun chauffeur trouvé pour votre recherche' : 'Aucun chauffeur enregistré'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};