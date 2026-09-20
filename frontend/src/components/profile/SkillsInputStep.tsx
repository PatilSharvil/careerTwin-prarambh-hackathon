import React, { useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import {
  UploadCloud,
  FileCode,
  Plus,
  Trash2,
  X,
  FileCheck,
  Sparkles,
} from 'lucide-react';

export interface ManualSkill {
  name: string;
  self: number;
}

export interface SkillsInputStepProps {
  resumeFile: File | null;
  onSetResumeFile: (file: File | null) => void;
  resumeText: string;
  onSetResumeText: (text: string) => void;
  manualSkills: ManualSkill[];
  onSetManualSkills: (skills: ManualSkill[]) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const SkillsInputStep: React.FC<SkillsInputStepProps> = ({
  resumeFile,
  onSetResumeFile,
  resumeText,
  onSetResumeText,
  manualSkills,
  onSetManualSkills,
  onSubmit,
  isLoading,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onSetResumeFile(file);
      } else {
        alert('Please upload a PDF file.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onSetResumeFile(file);
    }
  };

  const handleAddManualSkill = () => {
    onSetManualSkills([...manualSkills, { name: '', self: 5 }]);
  };

  const handleRemoveManualSkill = (index: number) => {
    onSetManualSkills(manualSkills.filter((_, idx) => idx !== index));
  };

  const handleManualSkillNameChange = (index: number, name: string) => {
    const updated = [...manualSkills];
    updated[index] = { ...updated[index], name };
    onSetManualSkills(updated);
  };

  const handleManualSkillRatingChange = (index: number, self: number) => {
    const updated = [...manualSkills];
    updated[index] = { ...updated[index], self };
    onSetManualSkills(updated);
  };

  return (
    <Card className="border-2 border-black bg-white rounded-2xl shadow-neo">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-xl bg-[#ffe566] text-black border-2 border-black flex items-center justify-center text-xs font-black shadow-neo-xs">
            2
          </span>
          <CardTitle className="text-lg font-black text-black">Skills Input</CardTitle>
        </div>
        <CardDescription className="text-xs font-medium text-slate-700">
          Upload your resume PDF or paste your background text, and optionally add manual skills.
        </CardDescription>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Input Method Selector (Upload vs Text) */}
        <div>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              disabled={isLoading || disabled}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-black border-2 border-black transition-all ${
                activeTab === 'upload'
                  ? 'bg-[#ffe566] text-black shadow-neo-xs'
                  : 'bg-white text-slate-600 hover:bg-[#faf6ee] hover:text-black'
              }`}
            >
              <UploadCloud className="w-4 h-4 stroke-[2.5]" />
              Resume PDF Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              disabled={isLoading || disabled}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-black border-2 border-black transition-all ${
                activeTab === 'text'
                  ? 'bg-[#ffe566] text-black shadow-neo-xs'
                  : 'bg-white text-slate-600 hover:bg-[#faf6ee] hover:text-black'
              }`}
            >
              <FileCode className="w-4 h-4 stroke-[2.5]" />
              Pasted Resume / Skills Text
            </button>
          </div>

          {/* Option A: Resume PDF Drag-and-Drop / Upload */}
          {activeTab === 'upload' && (
            <div>
              {resumeFile ? (
                <div className="flex items-center justify-between p-4 bg-[#79e7a8] border-2 border-black rounded-2xl shadow-neo-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black font-black shadow-neo-xs">
                      <FileCheck className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-black">{resumeFile.name}</p>
                      <p className="text-xs font-bold text-slate-800">
                        {(resumeFile.size / 1024).toFixed(1)} KB &bull; PDF document ready
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSetResumeFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isLoading || disabled}
                    className="p-1.5 rounded-xl bg-white border-2 border-black text-black hover:bg-[#ff6b6b] hover:text-white transition-all shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5"
                    aria-label="Remove resume file"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-black rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'bg-[#ffe566]/20 shadow-neo scale-[1.01]'
                      : 'bg-[#fdfbf7] hover:bg-[#faf6ee] shadow-neo-sm'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={isLoading || disabled}
                  />
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#ffe566] text-black border-2 border-black flex items-center justify-center mb-3 shadow-neo-xs">
                    <UploadCloud className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <p className="text-sm font-black text-black mb-1">
                    Drag and drop your resume PDF here
                  </p>
                  <p className="text-xs font-medium text-slate-600 mb-3">
                    Or click to browse files (PDF only, max 10MB)
                  </p>
                  <span className="inline-flex items-center text-xs font-black text-black bg-white px-3.5 py-1.5 rounded-xl border-2 border-black shadow-neo-xs">
                    Choose PDF
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Option B: Pasted Resume / Skills Text */}
          {activeTab === 'text' && (
            <div>
              <label htmlFor="pasted-resume-text" className="block text-xs font-black text-black mb-1.5">
                Paste your resume, LinkedIn summary, or skills list:
              </label>
              <textarea
                id="pasted-resume-text"
                rows={5}
                placeholder="e.g. Senior backend developer with 4 years in Python, FastAPI, Docker, and designing RESTful APIs..."
                value={resumeText}
                onChange={(e) => onSetResumeText(e.target.value)}
                disabled={isLoading || disabled}
                className="w-full p-3.5 text-xs sm:text-sm border-2 border-black rounded-xl font-medium focus:outline-none focus:shadow-neo bg-white leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Manual Skills Input */}
        <div className="pt-4 border-t-2 border-black">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="text-sm font-black text-black">Manual Skills &amp; Self-Ratings</h4>
              <p className="text-xs font-medium text-slate-600">
                Rate your proficiency (0–10) to guide calibration against resume evidence.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddManualSkill}
              disabled={isLoading || disabled}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black hover:bg-[#ffe566] transition-all shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Skill
            </button>
          </div>

          {manualSkills.length > 0 ? (
            <div className="space-y-3">
              {manualSkills.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-[#faf6ee] rounded-xl border-2 border-black shadow-neo-xs"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Skill name (e.g. Python, Docker)"
                      value={item.name}
                      onChange={(e) => handleManualSkillNameChange(idx, e.target.value)}
                      disabled={isLoading || disabled}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border-2 border-black bg-white font-bold focus:outline-none focus:shadow-neo-xs"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-64">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={item.self}
                      onChange={(e) => handleManualSkillRatingChange(idx, parseFloat(e.target.value))}
                      disabled={isLoading || disabled}
                      className="flex-1 h-2 bg-slate-200 border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <span className="w-12 text-xs font-black text-black bg-white px-2 py-0.5 rounded border border-black text-center shadow-neo-xs">
                      {item.self.toFixed(1)}/10
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveManualSkill(idx)}
                      disabled={isLoading || disabled}
                      className="p-1 rounded-lg text-slate-500 hover:text-black hover:bg-[#ff6b6b] hover:text-white transition-colors"
                      aria-label="Remove skill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#faf6ee] border-2 border-dashed border-black text-center">
              <p className="text-xs font-medium text-slate-600">
                No manual skills added. You can add specific skills or let resume parsing extract them.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button & Extraction Action */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-black">
          <p className="text-xs font-semibold text-slate-600">
            Clicking extract will parse and calibrate proficiencies via <span className="font-mono text-black font-black">POST /profile</span>.
          </p>
          <Button
            type="button"
            onClick={onSubmit}
            isLoading={isLoading}
            disabled={disabled}
            leftIcon={<Sparkles className="w-4 h-4 stroke-[2.5]" />}
          >
            Extract Skills
          </Button>
        </div>

        {/* Loading Skeleton during extraction */}
        {isLoading && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-black">
              <span className="animate-spin text-base font-black">&bull;</span> Extracting and calibrating skills from profile...
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton height="70px" className="rounded-2xl" />
              <Skeleton height="70px" className="rounded-2xl" />
              <Skeleton height="70px" className="rounded-2xl" />
              <Skeleton height="70px" className="rounded-2xl" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
