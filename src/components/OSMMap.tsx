// components/AdvancedOSMMap.tsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Agent, Coordinate } from '../@types/shared';

// Fix icons
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icône pour le chauffeur
const chauffeurIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNy41ODYgMiA0IDUuNTg2IDQgMTBDNCAxNS4yNzQgOS4yMTMgMTkuNzYzIDExLjAxNSAyMS44MTVDMTEuNDY2IDIyLjM5OCAxMi41MzQgMjIuMzk4IDEyLjk4NSAyMS44MTVDMTQuNzg3IDE5Ljc2MyAyMCAxNS4yNzQgMjAgMTBDMjAgNS41ODYgMTYuNDE0IDIgMTIgMloiIGZpbGw9IiNGNDRCMDAiLz4KPHBhdGggZD0iTTEyIDEzQzEzLjY1NjkgMTMgMTUgMTEuNjU2OSAxNSAxMEMxNSA4LjM0MzE1IDEzLjY1NjkgNyAxMiA3QzEwLjM0MzEgNyA5IDguMzQzMTUgOSAxMEM5IDExLjY1NjkgMTAuMzQzMSAxMyAxMiAxM1oiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

interface AdvancedOSMMapProps {
  agents: Agent[];
  chauffeurPosition?: Coordinate;
}

const AdvancedOSMMap: React.FC<AdvancedOSMMapProps> = ({ 
  agents, 
  chauffeurPosition 
}) => {
  const [route, setRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    calculateOptimalRoute();
  }, [agents]);

  const calculateOptimalRoute = async () => {
    // Filtrer les agents avec des coordonnées valides
    const validAgents = agents.filter(a => a.latitude && a.longitude);
    
    if (validAgents.length > 1) {
      try {
        const response = await fetch('/api/routes/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            points: validAgents.map(a => ({ lat: a.latitude!, lng: a.longitude! }))
          })
        });
        
        if (response.ok) {
          const routeData = await response.json();
          if (routeData?.geometry) {
            setRoute(routeData.geometry);
          }
        } else {
          throw new Error('Erreur calcul itinéraire');
        }
      } catch (error) {
        console.log('Utilisation du trajet simplifié (ligne droite)');
        // Fallback: ligne droite entre les points
        const straightLine = validAgents.map(agent => 
          [agent.latitude!, agent.longitude!] as [number, number]
        );
        setRoute(straightLine);
      }
    } else {
      setRoute([]);
    }
  };

  // Calcul du centre de la carte basé sur les agents
  const getCenter = (): [number, number] => {
    const validAgents = agents.filter(a => a.latitude && a.longitude);
    
    if (validAgents.length === 0) {
      return [36.8065, 10.1815]; // Tunis par défaut
    }

    const sumLat = validAgents.reduce((sum, agent) => sum + agent.latitude!, 0);
    const sumLng = validAgents.reduce((sum, agent) => sum + agent.longitude!, 0);
    
    return [
      sumLat / validAgents.length,
      sumLng / validAgents.length
    ];
  };

  // Agents avec coordonnées valides
  const agentsAvecCoords = agents.filter(a => a.latitude && a.longitude);

  return (
    <div style={{ height: '600px', width: '100%', borderRadius: '8px' }}>
      <MapContainer
        center={getCenter()}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marqueurs agents */}
        {agentsAvecCoords.map((agent, index) => (
          <Marker
            key={agent._id || `agent-${index}`}
            position={[agent.latitude!, agent.longitude!]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <strong>🏠 {agent.nom}</strong><br />
                <div className="mt-1">
                  <div>📍 {agent.adresse}</div>
                  {agent.societe && <div>🏢 {agent.societe}</div>}
                  {agent.telephone && <div>📞 {agent.telephone}</div>}
                  <div className="text-xs text-gray-500 mt-1">
                    Coord: {agent.latitude?.toFixed(4)}, {agent.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Position chauffeur */}
        {chauffeurPosition && (
          <Marker position={[chauffeurPosition.lat, chauffeurPosition.lng]} icon={chauffeurIcon}>
            <Popup>
              <strong>🚗 Chauffeur</strong>
            </Popup>
          </Marker>
        )}

        {/* Itinéraire */}
        {route.length > 1 && (
          <Polyline
            positions={route}
            color="#3B82F6"
            weight={6}
            opacity={0.7}
          />
        )}

        {/* Message si pas assez d'agents avec coordonnées */}
        {agentsAvecCoords.length < 2 && (
          <div className="leaflet-top leaflet-right">
            <div className="leaflet-control leaflet-bar p-2 bg-yellow-100 text-yellow-800 text-sm">
              ⚠️ {agentsAvecCoords.length} agent(s) avec coordonnées GPS
              <br />
              {agents.length - agentsAvecCoords.length} agent(s) sans coordonnées
            </div>
          </div>
        )}
      </MapContainer>
    </div>
  );
};

export default AdvancedOSMMap;