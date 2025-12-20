// src/pages/GestionAgents.tsx - Version complète avec SelectSociete
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TransportApiService } from "../services/api";
import { Agent, Societe } from "../@types/shared";
import "./GestionAgents.css";
import { SelectSociete } from "./societes/SelectSociete";

export const GestionAgents: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [selectedSocieteId, setSelectedSocieteId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les agents (maintenant sans populate)
      const agentsData = await TransportApiService.getAgents();
      
      // Charger les sociétés séparément
      const societesData = await TransportApiService.getSocietes();
      
      // Transformer les agents pour qu'ils aient le nom de la société
      const agentsAvecNoms = agentsData.map(agent => {
        let societeNom = 'Non spécifié';
        
        // Si la société est un ObjectId (nouveau format)
        if (agent.societe && typeof agent.societe === 'object') {
          societeNom = agent.societe.nom || 'Société inconnue';
        } 
        // Si c'est une string (ancien format)
        else if (typeof agent.societe === 'string') {
          // Chercher le nom dans la liste des sociétés
          if (agent.societe.match(/^[0-9a-fA-F]{24}$/)) {
            // C'est un ObjectId, chercher la société
            const societe = societesData.find(s => s._id === agent.societe);
            societeNom = societe ? societe.nom : agent.societe;
          } else {
            // C'est déjà un nom de société
            societeNom = agent.societe;
          }
        }
        
        return {
          ...agent,
          societe: societeNom  // Toujours une string pour l'affichage
        };
      });
      
      setAgents(agentsAvecNoms);
      setSocietes(societesData);
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadSocietes = async (): Promise<Societe[]> => {
    try {
      // Essayer d'abord l'API
      return await TransportApiService.getSocietes();
    } catch (error) {
      console.warn("API sociétés non disponible, chargement local");
      const saved = localStorage.getItem("societes_locales");
      return saved ? JSON.parse(saved) : [];
    }
  };

  const saveSocietes = (newSocietes: Societe[]) => {
    setSocietes(newSocietes);
    localStorage.setItem("societes_locales", JSON.stringify(newSocietes));
  };

  const handleNewSociete = (societe: Societe) => {
    saveSocietes([...societes, societe]);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const editAgentId = urlParams.get('edit');
    
    if (editAgentId && agents.length > 0) {
      const agentToEdit = agents.find(agent => agent._id === editAgentId);
      if (agentToEdit) {
        setEditingAgent(agentToEdit);
        setShowForm(true);
        
        // Pour l'édition, on garde la société comme string
        setSelectedSocieteId('');
        
        setTimeout(() => {
          const formElement = document.querySelector('.agent-form-container');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [location.search, agents]);

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".csv")
    ) {
      alert("❌ Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV");
      return;
    }

    setImportLoading(true);

    try {
      const result = await TransportApiService.importAgents(file);
      alert(`✅ Import réussi ! ${result.importedCount} agent(s) ajouté(s)`);
      await loadData();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Erreur importation:", error);
      alert(`❌ Erreur lors de l'importation: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Récupérer les données du formulaire
    const nom = formData.get("nom") as string;
    const adresse = formData.get("adresse") as string;
    const telephone = formData.get("telephone") as string;

    // Vérifier que tous les champs requis sont remplis
    if (!nom || !adresse || !telephone || !selectedSocieteId) {
      alert("❌ Tous les champs obligatoires doivent être remplis");
      return;
    }

    const agentData: Partial<Agent> = {
      nom,
      adresse,
      telephone,
      voiturePersonnelle: formData.get("voiturePersonnelle") === "on",
      chauffeurNom: formData.get("chauffeurNom") as string,
      vehiculeChauffeur: formData.get("vehiculeChauffeur") as string,
      latitude: formData.get("latitude")
        ? parseFloat(formData.get("latitude") as string)
        : undefined,
      longitude: formData.get("longitude")
        ? parseFloat(formData.get("longitude") as string)
        : undefined,
    };

    if (selectedSocieteId) {
      // Nouveau format: envoyer l'ID de la société
      agentData.societe = selectedSocieteId;
    } else if (editingAgent) {
      // En édition, garder l'ancienne valeur
      agentData.societe = editingAgent.societe;
    } else {
      alert('❌ Veuillez sélectionner une société');
      return;
    }

    try {
      if (editingAgent) {
        await TransportApiService.updateAgent(editingAgent._id!, agentData);
        alert("✅ Salarié mis à jour avec succès !");
      } else {
        await TransportApiService.createAgent(agentData);
        alert("✅ Salarié créé avec succès !");
      }

      await loadData();
      resetForm();

      const urlParams = new URLSearchParams(location.search);
      const returnTo = urlParams.get("returnTo");

      if (returnTo === "import") {
        navigate("/import-agents");
      } else {
        navigate("/agents", { replace: true });
      }
    } catch (error: any) {
      console.error("Erreur sauvegarde Salarié:", error);
      alert(`❌ Erreur lors de la sauvegarde: ${error.message}`);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAgent(null);
    setSelectedSocieteId("");
    const form = document.querySelector(".agent-form") as HTMLFormElement;
    if (form) form.reset();
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);

    // Déterminer l'ID de la société pour l'agent en édition
    if (agent.societe) {
      if (typeof agent.societe === "object") {
        setSelectedSocieteId(agent.societe._id!);
      } else {
        setSelectedSocieteId(agent.societe);
      }
    }

    setShowForm(true);
    navigate(`/agents?edit=${agent._id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce Salarié ?")) {
      try {
        await TransportApiService.deleteAgent(id);
        await loadData();
        alert("✅ Agent supprimé avec succès !");
      } catch (error) {
        console.error("Erreur suppression Salarié:", error);
        alert("❌ Erreur lors de la suppression");
      }
    }
  };

  const handleCancelEdit = () => {
    resetForm();

    const urlParams = new URLSearchParams(location.search);
    const returnTo = urlParams.get("returnTo");

    if (returnTo === "import") {
      navigate("/import-agents");
    } else {
      navigate("/agents", { replace: true });
    }
  };

  const handleReturnToImport = () => {
    navigate("/import-agents");
  };

  const getGoogleMapsLink = (agent: Agent) => {
    if (agent.latitude && agent.longitude) {
      return `https://www.google.com/maps?q=${agent.latitude},${agent.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      agent.adresse
    )}`;
  };

  const getSocieteNom = (agent: Agent): string => {
    if (!agent.societe) return "Non spécifié";
    if (typeof agent.societe === "object") {
      return agent.societe.nom;
    }
    // Si c'est un ID, chercher dans la liste des sociétés
    const societe = societes.find((s) => s._id === agent.societe);
    return societe ? societe.nom : (agent.societe as string);
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSocieteNom(agent).toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.adresse.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Chargement des salariés...</div>;
  }

  return (
    <div className="gestion-agents">
      <div className="agents-header">
        <h1>👤 Gestion des Salariés</h1>
        <div className="header-actions">
          {location.search.includes("returnTo=import") && (
            <button className="btn-secondary" onClick={handleReturnToImport}>
              ↩️ Retour
            </button>
          )}

          <div className="import-section">
            <button
              className="btn-import"
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
            >
              {importLoading ? "⏳ Import..." : "📁 Importer fichier"}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingAgent(null);
              setSelectedSocieteId("");
              if (showForm) {
                navigate("/agents", { replace: true });
              }
            }}
          >
            {showForm ? "❌ Annuler" : "➕ Ajouter un salarié"}
          </button>
        </div>
      </div>

      <div className="import-instructions">
        <h3>📝 Instructions pour l'importation</h3>
        <p>
          Importez le fichier pour ajouter plusieurs agents en une seule fois.
        </p>
        <ul>
          <li>
            <strong>Format supporté:</strong> Excel (.xlsx, .xls) ou CSV
          </li>
          <li>
            <strong>Colonnes requises:</strong> Nom, Telephone, Adresse,
            Societe, Voiture Personnelle
          </li>
        </ul>
      </div>

      {showForm && (
        <div className="agent-form-container">
          <h2>{editingAgent ? "✏️ Modifier Salarié" : "➕ Nouveau Salarié"}</h2>
          <form onSubmit={handleSubmit} className="agent-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nom et pseudo *</label>
                <input
                  type="text"
                  name="nom"
                  defaultValue={editingAgent?.nom}
                  required
                  placeholder="Nom et pseudo"
                />
              </div>
              <div className="form-group">
                <label>Téléphone *</label>
                <input
                  type="tel"
                  name="telephone"
                  defaultValue={editingAgent?.telephone}
                  required
                  placeholder="Numéro de téléphone"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Adresse complète *</label>
              <textarea
                name="adresse"
                defaultValue={editingAgent?.adresse}
                required
                placeholder="Adresse complète avec code postal"
                rows={3}
              />
            </div>

            {/* Champs pour coordonnées GPS (optionnels) */}
            <div className="form-row">
              <div className="form-group">
                <label>Latitude (optionnel)</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  defaultValue={editingAgent?.latitude}
                  placeholder="Ex: 35.8235978"
                />
                <small className="form-help">
                  Pour un positionnement exact sur Google Maps
                </small>
              </div>
              <div className="form-group">
                <label>Longitude (optionnel)</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  defaultValue={editingAgent?.longitude}
                  placeholder="Ex: 10.6309176"
                />
                <small className="form-help">
                  Google Maps : clic droit → Coordonnées
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Société *</label>
                <SelectSociete
                  value={selectedSocieteId}
                  onChange={setSelectedSocieteId}
                  required
                  placeholder="Sélectionnez ou créez une société"
                  societes={societes}
                  onNewSociete={handleNewSociete}
                />
              </div>
              <div className="form-group">
                <label>Chauffeur (optionnel)</label>
                <input
                  type="text"
                  name="chauffeurNom"
                  defaultValue={editingAgent?.chauffeurNom}
                  placeholder="Nom du chauffeur"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Véhicule et matricule (optionnel)</label>
                <input
                  type="text"
                  name="vehiculeChauffeur"
                  defaultValue={editingAgent?.vehiculeChauffeur}
                  placeholder="Modèle du véhicule"
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="voiturePersonnelle"
                    defaultChecked={editingAgent?.voiturePersonnelle}
                  />
                  <span className="checkmark"></span>
                  🚘 Voiture personnelle
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingAgent ? "💾 Mettre à jour" : "✅ Enregistrer"}
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

      <div className="agents-content">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Rechercher un salarié par nom, société ou adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span
            className="agents-count"
            style={{ color: "white", fontWeight: "bold" }}
          >
            {filteredAgents.length} salarié(s) trouvé(s)
          </span>
        </div>

        <div className="agents-grid">
          {filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
              <div key={agent._id} className="agent-card">
                <div className="agent-card-header">
                  <h3>{agent.nom}</h3>
                  <div className="agent-actions">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="btn-edit"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => agent._id && handleDelete(agent._id)}
                      className="btn-delete"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="chauffeur-details">
                  <p>
                    <strong>📞 Téléphone:</strong> {agent.telephone}
                  </p>

                  <div className="address-row">
                    <a
                      href={getGoogleMapsLink(agent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="address-link"
                      title="Ouvrir dans Google Maps"
                    >
                      <p>
                        <span style={{ fontWeight: "bold" }}>
                          📍 Adresse: {agent.adresse}
                        </span>
                      </p>
                    </a>
                  </div>

                  <p>
                    <strong>🏢 Société:</strong> {getSocieteNom(agent)}
                  </p>

                  {agent.chauffeurNom && (
                    <p>
                      <strong>🚗 Chauffeur:</strong> {agent.chauffeurNom}
                    </p>
                  )}

                  <p>
                    <strong>🚘 Voiture perso:</strong>
                    <span
                      className={
                        agent.voiturePersonnelle ? "status-yes" : "status-no"
                      }
                    >
                      {agent.voiturePersonnelle ? "Oui" : "Non"}
                    </span>
                  </p>

                  {agent.vehiculeChauffeur && (
                    <p>
                      <strong>🚙 Véhicule:</strong> {agent.vehiculeChauffeur}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">
              {searchTerm
                ? "Aucun salarié trouvé pour votre recherche"
                : "Aucun salarié enregistré"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
