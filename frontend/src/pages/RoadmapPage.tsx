import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getRoadmap } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { RoadmapItem } from '../types/api';

import { RoadmapSummaryStrip } from '../components/roadmap/RoadmapSummaryStrip';
import { RoadmapTimelineView } from '../components/roadmap/RoadmapTimelineView';
import { RoadmapGraphView } from '../components/roadmap/RoadmapGraphView';
import { RoadmapItemDrawer } from '../components/roadmap/RoadmapItemDrawer';

export const RoadmapPage: React.FC = () => {
  const { showToast } = useToast();

  const state = useStore((s) => s.state);
  const setState = useStore((s) => s.setState);

  const [isLoading, setIsLoading] = useState<boolean>(!state);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'graph'>('timeline');
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const fetchRoadmap = () => {
    setIsLoading(true);
    setLoadError(null);

    getRoadmap()
      .then((res) => {
        setState(res);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError ? err.message : 'Failed to load roadmap state.';
        setLoadError(message);
        showToast({
          type: 'error',
          title: 'Error Loading Roadmap',
          message,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // If store is empty, fetch roadmap once
  useEffect(() => {
    if (state !== null) {
      setIsLoading(false);
      return;
    }

    fetchRoadmap();
  }, [state]);

  // Handler to open drawer from Timeline card click
  const handleSelectItem = (item: RoadmapItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  // Handler to open drawer from Graph node click
  const handleSelectNode = (nodeId: string) => {
    if (!state?.roadmap?.items) return;

    // Look up item matching nodeId (skill_id === nodeId or capstone)
    const matchingItem = state.roadmap.items.find(
      (item) =>
        item.skill_id === nodeId ||
        (item.is_capstone && (nodeId === 'capstone' || nodeId === 'rm_capstone')) ||
        item.item_id === `rm_${nodeId}`
    );

    if (matchingItem) {
      setSelectedItem(matchingItem);
      setIsDrawerOpen(true);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  if (!state && loadError) {
    return (
      <div className="py-16 px-4 max-w-md mx-auto text-center">
        <Card className="p-8 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Failed to Load Roadmap</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{loadError}</p>
          <Button variant="primary" size="sm" onClick={fetchRoadmap}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading || !state?.roadmap) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <Skeleton height="80px" className="rounded-xl" />
        <div className="space-y-4">
          <Skeleton height="30px" width="200px" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton height="180px" className="rounded-xl" />
            <Skeleton height="180px" className="rounded-xl" />
            <Skeleton height="180px" className="rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const { roadmap, role } = state;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-24">
      {/* 1. Summary Strip & View Toggle */}
      <RoadmapSummaryStrip
        roadmap={roadmap}
        role={role}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* 2. Main Content (Timeline View OR Graph View) */}
      {viewMode === 'timeline' ? (
        <RoadmapTimelineView
          items={roadmap.items}
          phases={roadmap.phases}
          deadlineWeeks={roadmap.deadline_weeks}
          onSelectItem={handleSelectItem}
        />
      ) : (
        <RoadmapGraphView
          graph={roadmap.graph}
          onSelectNode={handleSelectNode}
        />
      )}

      {/* 3. Shared Item Drawer (opened by Timeline card click or Graph node click) */}
      <RoadmapItemDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};
