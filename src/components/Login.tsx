import React, { ChangeEvent, useState } from "react";
import {
  faEye,
  faEyeSlash,
  faLock,
  faUser,
  faShield,
  faBuilding,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert } from "antd";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";
import "./Login.css";
import AuthService from "../services/authService";

function Login() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordShown, setPasswordShown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(true);
  const [isSupAdmin, setIsSupAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
    setErrorMessage("");
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setErrorMessage("");
  };

  const generateRandomTokenValue = () => {
    return uuidv4();
  };

  const toggleRole = (role: string) => {
    if (role === "admin") {
      setIsAdmin(true);
      setIsSupAdmin(false);
    } else if (role === "supadmin") {
      setIsAdmin(false);
      setIsSupAdmin(true);
    } else {
      setIsAdmin(false);
      setIsSupAdmin(false);
    }
  };

  const login = async (
    event: React.FormEvent,
    isAdmin: boolean,
    isSupAdmin: boolean
  ) => {
    event.preventDefault();
    setIsLoading(true);

    if (!username || !password) {
      setErrorMessage("Veuillez remplir tous les champs");
      setIsLoading(false);
      return;
    }

    try {
      let response;

      if (isSupAdmin) {
        response = await AuthService.loginSupadmin(username, password);
        // Stocker le rôle Administrateur
        localStorage.setItem("user_role", "Administrateur");
      } else if (isAdmin) {
        response = await AuthService.loginAdmin(username, password);
        // Stocker le rôle Comptabilité
        localStorage.setItem("user_role", "Comptabilité");
      } else {
        response = await AuthService.loginUser(username, password);
        // Stocker le rôle Utilisateur
        localStorage.setItem("user_role", "Utilisateur");
      }

      // Gérer le stockage en fonction de l'utilisateur
      localStorage.setItem("access_token", response.user.username);
      localStorage.setItem("user_id", response.user._id);

      // Stocker également les informations utilisateur complètes si disponibles
      if (response.user) {
        localStorage.setItem("current_user", JSON.stringify(response.user));
      }

      // Pour les administrateurs et supadmins, utilisez Cookies
      if (isAdmin || isSupAdmin) {
        const token = generateRandomTokenValue();
        Cookies.set(
          "access_token",
          token,
          { expires: 5 / 24 } // 1 heure (1/24 de la journée)
        );
      }

      console.log("Connexion réussie:", response);
      console.log("Rôle utilisateur:", localStorage.getItem("user_role"));

      // Redirection vers le dashboard
      window.location.replace("/import-agents");
    } catch (error: any) {
      console.error("Erreur de connexion:", error);

      // Gestion spécifique des erreurs d'authentification
      if (error.response?.status === 401) {
        setErrorMessage("Nom d'utilisateur ou mot de passe incorrect");
      } else if (error.response?.status === 404) {
        setErrorMessage("Service d'authentification indisponible");
      } else if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else if (error.message === "Network Error") {
        setErrorMessage(
          "Impossible de se connecter au serveur. Vérifiez votre connexion."
        );
      } else {
        setErrorMessage("Une erreur s'est produite. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordShown(!passwordShown);
  };

  const getRoleIcon = () => {
    if (isSupAdmin) return faShield;
    if (isAdmin) return faBuilding;
    return faUsers;
  };

  const getRoleLabel = () => {
    if (isSupAdmin) return "Administrateur";
    if (isAdmin) return "Comptabilité";
    return "Utilisateur";
  };

  const getRoleColor = () => {
    if (isSupAdmin) return "#dc3545";
    if (isAdmin) return "#28a745";
    return "#007bff";
  };

  const getRoleDescription = () => {
    if (isSupAdmin)
      return "Accès complet à toutes les fonctionnalités et gestion des utilisateurs";
    if (isAdmin) return "Accès aux fonctionnalités de comptabilité et rapports";
    return "Accès aux fonctionnalités de base de gestion du transport";
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-layout">
          {/* Section Illustration */}
          <div className="login-illustration">
            <div className="illustration-content">
              <img
                src="/image/pngwing.com.png"
                alt="Transport Illustration"
                className="illustration-image"
              />
              <div className="illustration-text">
                <h1>Gestion Du Transport</h1>
                <p>Gestion des affectations et planning des courses</p>
                <div className="features-list">
                  <div className="feature-item">
                    <span className="feature-icon">👥</span>
                    Gestion des salariés
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📅</span>
                    Planning des courses
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">💰</span>
                    Suivi des coûts
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🚗</span>
                    Gestion des chauffeurs
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section Formulaire */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="login-form-header">
                <h2>Connexion à votre compte</h2>
                <p>Accédez à votre espace de gestion</p>
              </div>

              {errorMessage && (
                <div className="error-alert">
                  <Alert
                    message="Erreur de connexion"
                    description={errorMessage}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setErrorMessage("")}
                  />
                </div>
              )}

              <form
                onSubmit={(event) => login(event, isAdmin, isSupAdmin)}
                className="login-form"
              >
                {/* Sélection du rôle */}
                <div className="form-group modern">
                  <label className="form-label">
                    <FontAwesomeIcon
                      icon={getRoleIcon()}
                      className="label-icon"
                      style={{ color: getRoleColor() }}
                    />
                    Rôle utilisateur
                  </label>
                  <div className="select-wrapper">
                    <select
                      value={
                        isSupAdmin ? "supadmin" : isAdmin ? "admin" : "user"
                      }
                      onChange={(e) => toggleRole(e.target.value)}
                      className="modern-select"
                      disabled={isLoading}
                    >
                      <option value="user">👤 Utilisateur Standard</option>
                      <option value="admin">🏢 Comptabilité</option>
                      <option value="supadmin">🛡️ Administrateur</option>
                    </select>
                    <div className="select-arrow">▼</div>
                  </div>
                  <small className="field-info">
                    Rôle sélectionné:{" "}
                    <strong style={{ color: getRoleColor() }}>
                      {getRoleLabel()}
                    </strong>
                  </small>
                  <div className="role-description">{getRoleDescription()}</div>
                </div>

                {/* Nom d'utilisateur */}
                <div className="form-group modern">
                  <label className="form-label">
                    <FontAwesomeIcon icon={faUser} className="label-icon" />
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="Entrez votre nom d'utilisateur"
                    className="modern-input"
                    disabled={isLoading}
                  />
                </div>

                {/* Mot de passe */}
                <div className="form-group modern">
                  <label className="form-label">
                    <FontAwesomeIcon icon={faLock} className="label-icon" />
                    Mot de passe
                  </label>
                  <div className="password-input-container">
                    <input
                      value={password}
                      onChange={handlePasswordChange}
                      type={passwordShown ? "text" : "password"}
                      placeholder="Entrez votre mot de passe"
                      className="modern-input password-input"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                      disabled={isLoading}
                    >
                      <FontAwesomeIcon
                        icon={passwordShown ? faEyeSlash : faEye}
                        className="eye-icon"
                      />
                    </button>
                  </div>
                </div>

                {/* Bouton de connexion */}
                <button
                  type="submit"
                  className={`submit-btn modern-btn ${
                    isLoading ? "loading" : ""
                  }`}
                  disabled={!username || !password || isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="btn-spinner">⏳</span>
                      <span className="btn-text">Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🔑</span>
                      <span className="btn-text">
                        Se connecter en tant que {getRoleLabel().toLowerCase()}
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Informations supplémentaires */}
              <div className="login-footer">
                <div className="security-info">
                  <FontAwesomeIcon icon={faShield} className="security-icon" />
                  <span>Connexion sécurisée - Protocole HTTPS</span>
                </div>
                <div className="support-info">
                  <span>Besoin d'aide ? Contactez l'administrateur</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
