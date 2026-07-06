import React, { createContext, useContext, type ReactNode } from 'react';
import type { Services } from './types';

const ServiceContext = createContext<Services | null>(null);

export interface ServiceProviderProps {
  services: Services;
  children: ReactNode;
}

// Services are constructed by the caller (the bootstrap sequence) and
// passed in as a prop rather than created internally — keeps this
// component simple and trivially testable with mock services.
export function ServiceProvider({ services, children }: ServiceProviderProps) {
  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServiceContext);
  if (!services) {
    throw new Error('useServices() must be used within a ServiceProvider.');
  }
  return services;
}
