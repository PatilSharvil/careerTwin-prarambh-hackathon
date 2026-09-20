import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getRoadmap } from '../api/endpoints';

export interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const state = useStore((s) => s.state);
  const setState = useStore((s) => s.setState);

  useEffect(() => {
    if (state !== null) return;

    let isMounted = true;
    getRoadmap()
      .then((res) => {
        if (isMounted) {
          setState(res);
        }
      })
      .catch(() => {
        // Silently handle empty initial state
      });

    return () => {
      isMounted = false;
    };
  }, [state, setState]);

  return <>{children}</>;
};
