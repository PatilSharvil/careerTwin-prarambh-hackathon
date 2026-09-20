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
      <Card className="p-6 border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Today's Status
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              All Caught Up!
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              {message || 'You have no urgent tasks scheduled for today. Great work! Pick any available skill from your roadmap below to keep advancing.'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const { activity, minutes, why, reasons, skill_name } = today;

  return (
    <Card className="p-6 border-primary-200 bg-gradient-to-br from-white via-primary-50/20 to-white shadow-sm hover:shadow-md transition-shadow">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200">
            <Sparkles className="w-3 h-3 mr-1 text-primary-600" />
            Today's Recommended Focus
          </span>
          <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <Clock className="w-3 h-3 mr-1 text-slate-500" />
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
          <span className="text-xs text-slate-500 font-medium px-1">
            via <strong className="text-slate-700">{activity.provider}</strong>
          </span>
        </div>
      </div>

      {/* Activity Title & Target Skill */}
      <div className="mb-4">
        <div className="text-xs font-medium text-slate-500 mb-0.5">
          Focus Skill: <span className="font-semibold text-slate-800">{skill_name}</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 leading-snug">
          {activity.title}
        </h3>

        {/* Level Gain Pill */}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            Level {activity.level_from.toFixed(1)} → {activity.level_to.toFixed(1)} (+{activity.level_gain.toFixed(1)})
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Target className="w-3 h-3 text-slate-400" />
            Target: {why.target.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Why Explanation Box */}
      {why?.narrative && (
        <div className="mb-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
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
          <p>{why.narrative}</p>
        </div>
      )}

      {/* Bulleted Reasons */}
      {reasons && reasons.length > 0 && (
        <div className="mb-5 space-y-1.5">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Key Objectives
          </div>
          <ul className="space-y-1">
            {reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
        <span className="text-xs text-slate-500 font-medium">
          Ready to make progress?
        </span>
        <Button
          variant="primary"
          size="md"
          onClick={handleStart}
          disabled={isLoading || !activity.url}
          className="shadow-sm hover:shadow-md"
        >
          <span>Start Activity</span>
          <ExternalLink className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </Card>
  );
};
