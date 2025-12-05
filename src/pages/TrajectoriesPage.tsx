import React, { useState, useEffect } from 'react';
import { Affectation, Agent } from '../@types/shared';
import { TransportApiService } from '../services/api';
import './TrajectoriesPage.css';
import AdvancedOSMMap from '../components/OSMMap';

const TrajectoriesPage: React.FC = () => {
  const [courses, setCourses] = useState<Affectation[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Affectation | null>(null);
  const [agentsComplets, setAgentsComplets] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Début du chargement des données...');
      
      const [affectationsData, agentsData] = await Promise.all([
        TransportApiService.getAffectations(),
        TransportApiService.getAgents()
      ]);
      
      console.log('✅ Données chargées:', {
        affectations: affectationsData.length,
        agents: agentsData.length
      });
      
      setCourses(affectationsData);
      setAgentsComplets(agentsData);

      // Géocoder seulement quelques agents pour les tests
      await geocodeAgentsManquants(agentsData.slice(0, 10));
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      setError('Erreur lors du chargement des données. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const geocodeAgentsManquants = async (agents: Agent[]) => {
    const agentsSansCoords = agents.filter(agent => !agent.latitude || !agent.longitude);
    
    console.log(`🔍 ${agentsSansCoords.length} agents sans coordonnées`);
    
    if (agentsSansCoords.length === 0) return;

    setGeocodingProgress(0);
    
    for (let i = 0; i < agentsSansCoords.length; i++) {
      const agent = agentsSansCoords[i];
      try {
        setGeocodingProgress(((i + 1) / agentsSansCoords.length) * 100);
        await geocodeAgentIfNeeded(agent);
        await new Promise(resolve => setTimeout(resolve, 500)); // Pause
      } catch (error) {
        console.error(`❌ Erreur géocodage pour ${agent.nom}:`, error);
      }
    }
    
    setGeocodingProgress(100);
  };

  const geocodeAgentIfNeeded = async (agent: Agent) => {
    if (!agent.latitude || !agent.longitude) {
      try {
        console.log(`📍 Tentative de géocodage pour ${agent.nom}: ${agent.adresse}`);
        
        // Pour l'instant, on simule le géocodage avec des coordonnées aléatoires
        // car l'endpoint /geocoding/address n'existe pas encore
        const coords = {
          lat: 36.8 + Math.random() * 0.2, // Tunis area
          lng: 10.1 + Math.random() * 0.2
        };
        
        // Simulation de mise à jour
        console.log(`✅ ${agent.nom} - Coordonnées simulées:`, coords);
        
      } catch (error) {
        console.error(`💥 Erreur géocodage simulé pour ${agent.nom}:`, error);
      }
    }
  };

  const getAgentsCompletsFromAffectation = (affectation: Affectation): Agent[] => {
    if (!affectation.agents || affectation.agents.length === 0) {
      return [];
    }

    return affectation.agents.map(agentAffectation => {
      const agentComplet = agentsComplets.find(agent => 
        agent.nom === agentAffectation.agentNom
      );

      if (agentComplet) {
        return agentComplet;
      } else {
        return {
          _id: `temp-${agentAffectation.agentNom}`,
          nom: agentAffectation.agentNom,
          adresse: agentAffectation.adresse,
          telephone: agentAffectation.telephone,
          societe: agentAffectation.societe,
          voiturePersonnelle: false,
          latitude: undefined,
          longitude: undefined
        } as Agent;
      }
    });
  };

  const agentsAvecCoords = agentsComplets.filter(a => a.latitude && a.longitude).length;
  const agentsSansCoords = agentsComplets.length - agentsAvecCoords;

  if (loading) {
    return (
      <div className="trajectories-container">
        <div className="trajectories-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-message">Chargement des données de transport...</p>
            {geocodingProgress > 0 && (
              <div style={{marginTop: '10px', width: '200px'}}>
                <div style={{
                  width: '100%',
                  background: '#e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${geocodingProgress}%`,
                    height: '6px',
                    background: '#10b981',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <p style={{fontSize: '0.8rem', color: '#64748b', marginTop: '5px'}}>
                  Géocodage: {Math.round(geocodingProgress)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trajectories-container">
        <div className="trajectories-content">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={loadData}>
              🔄 Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trajectories-container">
      <div className="trajectories-content">
        <div className="trajectories-header">
          <h1>🗺️ Visualisation des Trajets</h1>
          <p>Suivez les parcours de vos chauffeurs en temps réel</p>
        </div>

        <div className="trajectories-stats">
          <div className="stat-cardt stat-total">
            <div className="stat-numbert">{courses.length}</div>
            <div className="stat-labelt">Courses Planifiées</div>
          </div>
          <div className="stat-cardt stat-geocoded">
            <div className="stat-numbert">{agentsAvecCoords}</div>
            <div className="stat-labelt">Agents Localisés</div>
          </div>
          <div className="stat-cardt stat-missing">
            <div className="stat-numbert">{agentsSansCoords}</div>
            <div className="stat-labelt">Adresses à Géocoder</div>
          </div>
        </div>

        <div className="trajectories-grid">
          {/* Panel des courses */}
          <div className="courses-panel">
            <div className="courses-header">
              <h2>📋 Liste des Courses</h2>
              <button className="refresh-btn" onClick={loadData} title="Actualiser">
                🔄
              </button>
            </div>
            
            <div className="courses-list">
              {courses.length === 0 ? (
                <div className="empty-container">
                  <div className="empty-icon">📭</div>
                  <p className="empty-message">Aucune course trouvée</p>
                  <button className="retry-btn" onClick={loadData}>
                    Actualiser
                  </button>
                </div>
              ) : (
                courses.map((course, index) => (
                  <div
                    key={course._id || index}
                    className={`course-item ${selectedCourse?._id === course._id ? 'selected' : ''}`}
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="course-driver">
                      👨‍✈️ {course.chauffeur || 'Chauffeur non spécifié'}
                    </div>
                    <div className="course-meta">
                      <span className="course-agents">
                        👥 {course.agents?.length || 0}
                      </span>
                      <span className={`course-type ${course.typeTransport?.toLowerCase()}`}>
                        {course.typeTransport === 'Ramassage' ? '🚗' : '🏠'} {course.typeTransport}
                      </span>
                      <span>🕒 {course.heure}H</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel de la carte */}
          <div className="map-panel">
            {selectedCourse ? (
              <>
                <div className="map-header">
                  <h2>🎯 Trajet - {selectedCourse.chauffeur}</h2>
                  <div className="course-details">
                    <div className="detail-row">
                      <span className="detail-label">Véhicule:</span>
                      <span className="detail-value">{selectedCourse.vehicule || 'Non spécifié'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">{selectedCourse.dateReelle}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Heure & Type:</span>
                      <span className="detail-value">
                        {selectedCourse.heure}H • {selectedCourse.typeTransport}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="map-container">
                  <AdvancedOSMMap
                    agents={getAgentsCompletsFromAffectation(selectedCourse)}
                  />
                </div>

                <div className="agents-list">
                  <h3>👥 Agents à Transporter ({selectedCourse.agents?.length || 0})</h3>
                  {selectedCourse.agents && selectedCourse.agents.length > 0 ? (
                    selectedCourse.agents.map((agent, index) => {
                      const agentComplet = agentsComplets.find(a => a.nom === agent.agentNom);
                      const hasCoords = agentComplet?.latitude && agentComplet?.longitude;
                      
                      return (
                        <div key={index} className="agent-item">
                          <div className="agent-number">{index + 1}</div>
                          <div className="agent-info">
                            <div className="agent-name">{agent.agentNom}</div>
                            <div className="agent-address">📍 {agent.adresse}</div>
                            <div className="agent-company">
                              🏢 {agent.societe} • 📞 {agent.telephone}
                            </div>
                            <div className={`agent-coords ${hasCoords ? 'available' : 'missing'}`}>
                              {hasCoords ? (
                                `✅ Localisé: ${agentComplet.latitude?.toFixed(4)}, ${agentComplet.longitude?.toFixed(4)}`
                              ) : (
                                '❌ En attente de géocodage'
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{textAlign: 'center', color: '#64748b', padding: '20px'}}>
                      Aucun agent dans cette course
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-container">
                <div className="empty-icon">🗺️</div>
                <p className="empty-message">Sélectionnez une course</p>
                <p style={{color: '#94a3b8', fontSize: '0.9rem', marginTop: '10px'}}>
                  Choisissez une course dans la liste pour visualiser le trajet sur la carte
                </p>
                {courses.length > 0 && (
                  <p style={{color: '#3b82f6', fontSize: '0.9rem', marginTop: '10px'}}>
                    {courses.length} courses disponibles
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrajectoriesPage;