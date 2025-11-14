import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PlanningData, PlanningContextType } from '../@types/shared';

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

export const PlanningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [planningData, setPlanningData] = useState<PlanningData[]>([]);

  return (
    <PlanningContext.Provider value={{ planningData, setPlanningData }}>
      {children}
    </PlanningContext.Provider>
  );
};

export const usePlanning = (): PlanningContextType => {
  const context = useContext(PlanningContext);
  if (!context) {
    throw new Error('usePlanning must be used within a PlanningProvider');
  }
  return context;
};