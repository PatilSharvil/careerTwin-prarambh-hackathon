import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { TodayPick } from '../../types/api';
import {
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Code2,
  FileText,
  Award,
  TrendingUp,
  Target,
} from 'lucide-react';

export interface TodayCardProps {
  today: TodayPick | null;
  message: string | null;
  isLoading?: boolean;
}

export const TodayCard: React.FC<TodayCardProps> = ({
  today,
  message,
  isLoading = false,
}) => {
  const getActivityTypeIcon = (type: TodayPick['activity']['type']) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-3.5 h-3.5 mr-1" />;
      case 'project':
        return <Code2 className="w-3.5 h-3.5 mr-1" />;
      case 'doc':
        return <FileText className="w-3.5 h-3.5 mr-1" />;
      case 'certification':
        return <Award className="w-3.5 h-3.5 mr-1" />;
    }
  };

  const handleStart = () => {
    if (!today?.activity.url) return;
    window.open(today.activity.url, '_blank', 'noopener,noreferrer');
  };

  if (!today) {
    return (
      <Card className="p-6 border-2 border-black bg-white rounded-2xl shadow-neo">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#79e7a8] border-2 border-black flex items-center justify-center text-black flex-shrink-0 shadow-neo-xs">
            <CheckCircle2 className="w-6 h-6 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-black bg-[#79e7a8] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs">
                Today's Status
              </span>
            </div>
            <h3 className="text-lg font-black text-black mb-1">
              All Caught Up!
            </h3>
            <p className="text-sm font-medium text-slate-700 mb-3">
              {message || 'You have no urgent tasks scheduled for today. Great work! Pick any available skill from your roadmap below to keep advancing.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const { activity, minutes, why, reasons, skill_name } = today;

  return (
    <Card className="p-6 border-2 border-black bg-white shadow-neo rounded-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-xs font-black uppercase tracking-wider text-black bg-[#ffe566] px-3 py-1 rounded-xl border-2 border-black shadow-neo-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-black stroke-[2.5]" />
            Today's Recommended Focus
          </span>
          <span className="inline-flex items-center text-xs font-black text-black bg-white px-2.5 py-1 rounded-xl border-2 border-black shadow-neo-xs">
            <Clock className="w-3.5 h-3.5 mr-1 text-black" />
            {minutes} mins
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" size="sm" className="capitalize">
            <span className="inline-flex items-center">
              {getActivityTypeIcon(activity.type)}
              {activity.type}
            </span>
          </Badge>
          <span className="text-xs text-black font-bold px-1">
            via <strong className="text-black bg-[#faf6ee] px-1.5 py-0.5 rounded border border-black">{activity.provider}</strong>
          </span>
        </div>
      </div>

      {/* Activity Title & Target Skill */}
      <div className="mb-4">
        <div className="text-xs font-black text-black mb-0.5">
          Focus Skill: <span className="bg-[#70d6ff] px-2 py-0.5 rounded-lg border border-black shadow-neo-xs">{skill_name}</span>
        </div>
        <h3 className="text-xl font-black text-black leading-snug mt-2 break-words [overflow-wrap:anywhere]">
          {activity.title}
        </h3>

        {/* Level Gain Pill */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-black font-bold">
          <span className="inline-flex items-center gap-1 bg-[#79e7a8] text-black border-2 border-black px-2.5 py-0.5 rounded-lg shadow-neo-xs">
            <TrendingUp className="w-3.5 h-3.5 text-black stroke-[3]" />
            Level {activity.level_from.toFixed(1)} → {activity.level_to.toFixed(1)} (+{activity.level_gain.toFixed(1)})
          </span>
          <span className="inline-flex items-center gap-1 text-black bg-white px-2 py-0.5 rounded border border-black shadow-neo-xs">
            <Target className="w-3.5 h-3.5 text-black" />
            Target: {why.target.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Why Explanation Box */}
      {why?.narrative && (
        <div className="mb-4 p-4 rounded-2xl bg-[#faf6ee] border-2 border-black text-xs text-black leading-relaxed font-medium shadow-neo-xs">
          <div className="flex flex-wrap items-center justify-between font-black text-black mb-1.5 gap-2">
            <span>Why this activity?</span>
            <Badge
              variant={
                why.priority_label === 'Critical'
                  ? 'critical'
                  : why.priority_label === 'High'
                  ? 'high'
                  : 'medium'
              }
              size="sm"
            >
              {why.priority_label} Priority ({why.priority})
            </Badge>
          </div>
          <p className="bg-white p-3 rounded-xl border border-black break-words [overflow-wrap:anywhere]">&ldquo;{why.narrative}&rdquo;</p>
        </div>
      )}

      {/* Bulleted Reasons */}
      {reasons && reasons.length > 0 && (
        <div className="mb-5 space-y-1.5">
          <div className="text-xs font-black text-black uppercase tracking-wider">
            Key Objectives
          </div>
          <ul className="space-y-1.5">
            {reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-black bg-[#faf6ee] p-2.5 rounded-xl border border-black break-words [overflow-wrap:anywhere]">
                <CheckCircle2 className="w-4 h-4 text-black stroke-[3] flex-shrink-0 mt-0.5" />
                <span className="flex-1 min-w-0">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="pt-3 flex items-center justify-between border-t-2 border-black">
        <span className="text-xs text-black font-black">
          Ready to make progress?
        </span>
        <Button
          variant="primary"
          size="md"
          onClick={handleStart}
          disabled={isLoading || !activity.url}
          rightIcon={<ExternalLink className="w-4 h-4 ml-1 stroke-[2.5]" />}
        >
          Start Activity
        </Button>
      </div>
    </Card>
  );
};
