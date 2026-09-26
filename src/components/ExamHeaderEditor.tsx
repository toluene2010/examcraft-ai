import React, { useState } from 'react';
import { School, Clock, Calendar, Award, FileText, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { ExamMetadata } from '../types/exam';

interface ExamHeaderEditorProps {
  metadata: ExamMetadata;
  onChange: (metadata: ExamMetadata) => void;
}

export const ExamHeaderEditor: React.FC<ExamHeaderEditorProps> = ({ metadata, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newInstruction, setNewInstruction] = useState('');

  const updateField = (field: keyof ExamMetadata, value: any) => {
    onChange({
      ...metadata,
      [field]: value
    });
  };

  const addInstruction = () => {
    if (!newInstruction.trim()) return;
    onChange({
      ...metadata,
      instructions: [...metadata.instructions, newInstruction.trim()]
    });
    setNewInstruction('');
  };

  const removeInstruction = (index: number) => {
    onChange({
      ...metadata,
      instructions: metadata.instructions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 transition">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Exam Paper Header &amp; Rubric</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configures institution details, duration, instructions, and A4 header</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          <span>{isExpanded ? 'Collapse Details' : 'Edit Header & Details'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main summary view */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Institution</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">
            {metadata.institutionName || 'Click Edit to enter school name'}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Subject &amp; Class</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">
            {metadata.subject || 'Subject'} • {metadata.gradeLevel || 'Class / Grade'}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Examination Title</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">
            {metadata.examTitle || 'Examination Paper'}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Duration</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 block">
            {metadata.durationMinutes || 60} mins
          </span>
        </div>
      </div>

      {/* Expanded editable fields */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Institution / School / College Name</label>
              <input
                type="text"
                value={metadata.institutionName}
                onChange={(e) => updateField('institutionName', e.target.value)}
                placeholder="e.g. ST. XAVIER HIGH SCHOOL / FEDERAL GOVERNMENT COLLEGE"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Faculty / Department (Optional)</label>
              <input
                type="text"
                value={metadata.department || ''}
                onChange={(e) => updateField('department', e.target.value)}
                placeholder="e.g. Department of Sciences & Mathematics"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Examination Title</label>
              <input
                type="text"
                value={metadata.examTitle}
                onChange={(e) => updateField('examTitle', e.target.value)}
                placeholder="e.g. MID-TERM EXAMINATION 2026/2027"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Session / Term</label>
              <input
                type="text"
                value={metadata.academicYear || ''}
                onChange={(e) => updateField('academicYear', e.target.value)}
                placeholder="e.g. 2026/2027 Academic Session (First Term)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={metadata.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="e.g. BIOLOGY & LIFE SCIENCES"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Class / Grade Level</label>
              <input
                type="text"
                value={metadata.gradeLevel}
                onChange={(e) => updateField('gradeLevel', e.target.value)}
                placeholder="e.g. Grade 10 / SS2"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  min="1"
                  value={metadata.durationMinutes}
                  onChange={(e) => updateField('durationMinutes', parseInt(e.target.value) || 60)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="text"
                  value={metadata.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  placeholder="e.g. October 15, 2026"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                School Crest / Logo
              </label>
              <div className="flex items-center gap-3">
                {metadata.logoUrl && (
                  <img
                    src={metadata.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 object-contain rounded-lg border border-slate-300 p-0.5 bg-white"
                  />
                )}
                <label className="cursor-pointer px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  <span>{metadata.logoUrl ? 'Change Logo' : 'Upload School Crest'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        updateField('logoUrl', reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                </label>
                {metadata.logoUrl && (
                  <button
                    type="button"
                    onClick={() => updateField('logoUrl', undefined)}
                    className="text-slate-400 hover:text-red-500 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={metadata.enableStudentInfoBox}
                  onChange={(e) => updateField('enableStudentInfoBox', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Include Student Details Box (Name, Roll No, Signature) on A4 header
                </span>
              </label>
            </div>
          </div>

          {/* General instructions manager */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-2">
              General Examination Instructions (Printed on A4 sheet)
            </label>
            <div className="space-y-2 mb-3">
              {metadata.instructions.map((inst, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-mono text-[11px]">{index + 1}.</span>
                  <input
                    type="text"
                    value={inst}
                    onChange={(e) => {
                      const updated = [...metadata.instructions];
                      updated[index] = e.target.value;
                      onChange({ ...metadata, instructions: updated });
                    }}
                    className="flex-1 bg-transparent border-none text-slate-800 dark:text-slate-200 focus:outline-none text-xs"
                  />
                  <button
                    onClick={() => removeInstruction(index)}
                    className="text-slate-400 hover:text-red-500 transition p-1"
                    title="Remove instruction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addInstruction()}
                placeholder="Add another instruction (e.g. 'Answer all questions in Section A', 'Calculators not permitted')"
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addInstruction}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-xl font-medium text-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
