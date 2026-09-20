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
    <Card className="border-2 border-black bg-white rounded-2xl shadow-neo h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-black stroke-[2.5]" />
          <CardTitle className="text-base font-black text-black">Skill Coverage Radar</CardTitle>
        </div>
        <CardDescription className="text-xs font-medium text-slate-700">
          Top 8 benchmarked skills comparing your current level against target requirements (0–10).
        </CardDescription>
      </CardHeader>

      <div className="p-2 sm:p-4 flex-1 flex items-center justify-center min-h-[300px]">
        {radarData.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium italic">No radar data available.</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#000000" strokeWidth={1} strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="skill_name"
                  tick={{ fill: '#000000', fontSize: 11, fontWeight: 800 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  stroke="#000000"
                  tick={{ fill: '#000000', fontSize: 10, fontWeight: 700 }}
                />
                <Radar
                  name="Current Level"
                  dataKey="current"
                  stroke="#000000"
                  strokeWidth={2}
                  fill="#70d6ff"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Target Required"
                  dataKey="target"
                  stroke="#000000"
                  strokeWidth={2}
                  fill="#ffe566"
                  fillOpacity={0.5}
                  strokeDasharray="4 4"
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)} / 10`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #000000',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '3px 3px 0px 0px #000000',
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '10px',
                    fontSize: '12px',
                    fontWeight: 'bold',
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
