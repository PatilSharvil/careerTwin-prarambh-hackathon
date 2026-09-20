import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getRoadmap } from '../api/endpoints';
import { Skeleton } from './ui/Skeleton';

export interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const state = useStore((s) => s.state);
  const setState = useStore((s) => s.setState);
  const [loading, setLoading] = useState(state === null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (state !== null) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    getRoadmap()
      .then((res) => {
        if (isMounted) {
          setState(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [state, setState]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-6">
        <Skeleton height="120px" className="rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height="260px" className="rounded-xl" />
          <Skeleton height="260px" className="rounded-xl" />
        </div>
        <Skeleton height="350px" className="rounded-xl" />
      </div>
    );
  }

  if (failed || state === null) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
