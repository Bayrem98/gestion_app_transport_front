import React, { useState, useEffect } from "react";
import { TransportApiService } from "../../services/api";
import { Societe } from "../../@types/shared";
import "./GestionSocietes.css";

export const GestionSocietes: React.FC = () => {
  const [societes, setSocietes] = useState<Societe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSociete, setEditingSociete] = useState<Societe | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState<Partial<Societe>>({
    nom: "",
    adresse: "",
    telephone: "",
    matriculef: "",
  });

  useEffect(() => {
    loadSocietes();
  }, []);

  const loadSocietes = async () => {
    try {
      setLoading(true);
      const data = await TransportApiService.getSocietes();
      setSocietes(data);
    } catch (error) {
      console.error("Erreur chargement sociétés:", error);
      alert("Erreur lors du chargement des sociétés");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nom?.trim()) {
      alert("Le nom de la société est requis");
      return;
    }

    try {
      if (editingSociete) {
        await TransportApiService.updateSociete(editingSociete._id!, formData);
        alert("✅ Société mise à jour avec succès !");
      } else {
        await TransportApiService.createSociete(formData);
        alert("✅ Société créée avec succès !");
      }

      await loadSocietes();
      resetForm();
    } catch (error: any) {
      console.error("Erreur sauvegarde société:", error);
      alert(`❌ Erreur lors de la sauvegarde: ${error.message}`);
    }
  };

  const handleEdit = (societe: Societe) => {
    setEditingSociete(societe);
    setFormData({
      nom: societe.nom,
      adresse: societe.adresse || "",
      telephone: societe.telephone || "",
      matriculef: societe.matriculef || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette société ?")) {
      try {
        await TransportApiService.deleteSociete(id);
        await loadSocietes();
        alert("✅ Société supprimée avec succès !");
      } catch (error) {
        console.error("Erreur suppression société:", error);
        alert("❌ Erreur lors de la suppression");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      adresse: "",
      telephone: "",
      matriculef: "",
    });
    setEditingSociete(null);
    setShowForm(false);
  };

  const filteredSocietes = societes.filter(
    (societe) =>
      societe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (societe.adresse &&
        societe.adresse.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (societe.telephone && societe.telephone.includes(searchTerm))
  );

  if (loading) {
    return <div className="loading">Chargement des sociétés...</div>;
  }

  return (
    <div className="gestion-societes">
      <div className="societes-header">
        <h1>🏢 Gestion des Sociétés</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "❌ Annuler" : "➕ Ajouter une société"}
        </button>
      </div>

      {showForm && (
        <div className="societe-form-container">
          <h2>
            {editingSociete ? "✏️ Modifier Société" : "➕ Nouvelle Société"}
          </h2>
          <form onSubmit={handleSubmit} className="societe-form">
            <div className="form-group">
              <label>Nom de la société *</label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleInputChange}
                required
                placeholder="Nom de la société"
              />
            </div>

            <div className="form-group">
              <label>Adresse</label>
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleInputChange}
                placeholder="Adresse"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleInputChange}
                  placeholder="Téléphone"
                />
              </div>
              <div className="form-group">
                <label>Matricule F</label>
                <input
                  type="text"
                  name="matriculef"
                  value={formData.matriculef}
                  onChange={handleInputChange}
                  placeholder="Matricule F"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success">
                {editingSociete ? "💾 Mettre à jour" : "✅ Enregistrer"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
              >
                ❌ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="societes-content">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Rechercher une société..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="societes-count">
            {filteredSocietes.length} société(s) trouvée(s)
          </span>
        </div>

        <div className="societes-grid">
          {filteredSocietes.length > 0 ? (
            filteredSocietes.map((societe) => (
              <div key={societe._id} className="societe-card">
                <div className="societe-card-header">
                  <h3>{societe.nom}</h3>
                  <div className="societe-actions">
                    <button
                      onClick={() => handleEdit(societe)}
                      className="btn-edit"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => societe._id && handleDelete(societe._id)}
                      className="btn-delete"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="societe-details">
                  {societe.adresse && (
                    <p>
                      <strong>📍 Adresse:</strong> {societe.adresse}
                    </p>
                  )}
                  {societe.telephone && (
                    <p>
                      <strong>📞 Téléphone:</strong> {societe.telephone}
                    </p>
                  )}
                  {societe.matriculef && (
                    <p>
                      <strong>📄 Matricule F:</strong> {societe.matriculef}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">
              {searchTerm
                ? "Aucune société trouvée pour votre recherche"
                : "Aucune société enregistrée"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
