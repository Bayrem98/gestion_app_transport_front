import React from "react";
import { Result, Button, Card } from "antd";
import { useNavigate } from "react-router-dom";
import AuthService from "../services/authService";

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const userRole = AuthService.getUserRole();

  const getRoleDescription = () => {
    switch (userRole) {
      case "Utilisateur":
        return "Vous avez accès aux fonctionnalités de gestion du transport : Dashboard, Salariés, Chauffeurs, Affectation et Récapitulatif.";
      case "Comptabilité":
        return "Vous avez accès aux fonctionnalités financières : Dashboard, Validation et Rapports financiers.";
      case "Administrateur":
        return "Vous avez un accès complet à toutes les fonctionnalités de l'application.";
      default:
        return "Vous n'avez pas les permissions nécessaires pour accéder à cette page.";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ maxWidth: 600, width: "100%" }}>
        <Result
          status="403"
          title="Accès non autorisé"
          subTitle="Désolé, vous n'êtes pas autorisé à accéder à cette page."
          extra={
            <Button type="primary" onClick={() => navigate("/import-agents")}>
              Retour à l'accueil
            </Button>
          }
        />

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#fafafa",
            borderRadius: 6,
          }}
        >
          <h4>Vos permissions actuelles :</h4>
          <p>
            <strong>Rôle :</strong> {userRole}
          </p>
          <p>
            <strong>Description :</strong> {getRoleDescription()}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Unauthorized;
