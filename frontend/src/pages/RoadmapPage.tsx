import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getRoadmap } from '../api/endpoints';
import { mockAnalyzeInitial, mockProfile, mockRoles } from '../mocks/fixtures';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { RoadmapItem } from '../types/api';

import { RoadmapSummaryStrip } from '../components/roadmap/RoadmapSummaryStrip';
import { RoadmapTimelineView } from '../components/roadmap/RoadmapTimelineView';
import { RoadmapGraphView } from '../components/roadmap/RoadmapGraphView';
import { RoadmapItemDrawer } from '../components/roadmap/RoadmapItemDrawer';

export const RoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const state = useStore((s) => s.state);
  const setState = useStore((s) => s.setState);
  const setStoreProfile = useStore((s) => s.setProfile);
  const setStoreRoles = useStore((s) => s.setRoles);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'graph'>('timeline');
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const fetchRoadmap = () => {
    setIsLoading(true);

    getRoadmap()
      .then((res) => {
        setState(res);
      })
      .catch(() => {
        // Silently handle empty initial state
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // If store is empty, attempt to fetch roadmap once
  useEffect(() => {
    if (state !== null) {
      setIsLoading(false);
      return;
    }

    fetchRoadmap();
  }, [state]);

  const handleLoadDemo = () => {
    setIsLoading(true);
    setStoreProfile(mockProfile.profile);
    setStoreRoles(mockRoles.roles);
    setState(mockAnalyzeInitial);
    showToast({
      type: 'success',
      title: 'Demo Profile Loaded',
      message: 'Generated GenAI Engineer roadmap with 4 execution phases.',
    });
    setIsLoading(false);
  };

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

  if (isLoading) {
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

  // Smooth Empty State when no profile is analyzed yet
  if (!state?.roadmap) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center">
        <Card className="p-8 sm:p-10 border-2 border-black bg-white shadow-neo-lg rounded-3xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#b892ff] text-black flex items-center justify-center mx-auto border-2 border-black shadow-neo-sm">
            <Sparkles className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-black">No Roadmap Generated Yet</h2>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              To view your execution roadmap and learning timeline, create your profile in Step 1 or load our demo roadmap with one click.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleLoadDemo}
              className="w-full sm:w-auto font-black shadow-neo-sm"
              leftIcon={<Sparkles className="w-4 h-4 mr-1.5" />}
            >
              ⚡ Load Demo &amp; Roadmap
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/profile')}
              className="w-full sm:w-auto font-bold"
              rightIcon={<ArrowRight className="w-4 h-4 ml-1.5" />}
            >
              Go to Step 1 (Profile)
            </Button>
          </div>
        </Card>
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
