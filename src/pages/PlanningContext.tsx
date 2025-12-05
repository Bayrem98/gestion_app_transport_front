import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { PlanningData } from '../@types/shared';

interface PlanningContextType {
  planningData: PlanningData[];
  setPlanningData: (data: PlanningData[]) => void;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

export const PlanningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [planningData, setPlanningData] = useState<PlanningData[]>(() => {
    // Charger depuis le localStorage au démarrage
    const savedData = localStorage.getItem('importedPlanningData');
    return savedData ? JSON.parse(savedData) : [];
  });

  // Synchroniser avec le localStorage
  useEffect(() => {
    localStorage.setItem('importedPlanningData', JSON.stringify(planningData));
  }, [planningData]);

  return (
    <PlanningContext.Provider value={{ planningData, setPlanningData }}>
      {children}
    </PlanningContext.Provider>
  );
};

export const usePlanning = (): PlanningContextType => {
  const context = useContext(PlanningContext);
  if (context === undefined) {
    throw new Error('usePlanning must be used within a PlanningProvider');
  }
  return context;
};