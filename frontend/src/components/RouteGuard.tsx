import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const state = useStore((s) => s.state);

  if (state === null) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
