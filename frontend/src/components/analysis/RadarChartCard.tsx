import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import type { RadarPoint } from '../../types/api';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Compass } from 'lucide-react';

export interface RadarChartCardProps {
  radarData: RadarPoint[];
}

export const RadarChartCard: React.FC<RadarChartCardProps> = ({ radarData }) => {
  return (
    <Card className="border-slate-200 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary-600" />
          <CardTitle>Skill Coverage Radar</CardTitle>
        </div>
        <CardDescription>
          Top 8 benchmarked skills comparing your current level against target requirements (0–10).
        </CardDescription>
      </CardHeader>

      <div className="p-2 sm:p-4 flex-1 flex items-center justify-center min-h-[300px]">
        {radarData.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No radar data available.</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="skill_name"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Radar
                  name="Current Level"
                  dataKey="current"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Target Required"
                  dataKey="target"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                  strokeDasharray="4 4"
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)} / 10`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '10px',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
};
