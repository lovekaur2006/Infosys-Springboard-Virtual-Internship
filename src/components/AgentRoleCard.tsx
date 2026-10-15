/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flame,
  Handshake,
  Shield,
  Target,
  AlertTriangle,
  Edit2,
  Check,
  Plus,
  Trash2,
  Info,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { AgentConfig, PersonalityType } from '../types.ts';
import { PERSONALITY_DEFINITIONS } from '../data/scenarios.ts';

interface AgentRoleCardProps {
  agent: AgentConfig;
  onUpdatePersonality: (personality: PersonalityType) => void;
  onUpdateGoal: (newGoal: string, newMetric: string) => void;
  onAddConstraint: (constraint: string) => void;
  onRemoveConstraint: (index: number) => void;
}

export const AgentRoleCard: React.FC<AgentRoleCardProps> = ({
  agent,
  onUpdatePersonality,
  onUpdateGoal,
  onAddConstraint,
  onRemoveConstraint,
}) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(agent.primaryGoal);
  const [tempMetric, setTempMetric] = useState(agent.targetMetric);

  const [newConstraintInput, setNewConstraintInput] = useState('');
  const [isAddingConstraint, setIsAddingConstraint] = useState(false);

  const activePersonalityDef = PERSONALITY_DEFINITIONS[agent.personality];

  const handleSaveGoal = () => {
    onUpdateGoal(tempGoal, tempMetric);
    setIsEditingGoal(false);
  };

  const handleAddConstraintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newConstraintInput.trim()) {
      onAddConstraint(newConstraintInput.trim());
      setNewConstraintInput('');
      setIsAddingConstraint(false);
    }
  };

  const getPersonalityIcon = (type: PersonalityType) => {
    switch (type) {
      case 'Aggressive':
        return <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'Collaborative':
        return <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Risk-Averse':
        return <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
      <div>
        {/* Top Header: Agent Name, Role, Organization */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-base text-slate-800 dark:text-slate-100 shadow-inner">
              {agent.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {agent.name}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {agent.organization}
                </span>
              </div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                {agent.roleTitle}
              </div>
            </div>
          </div>

          {/* Personality pill indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${activePersonalityDef.badgeColor}`}
          >
            {getPersonalityIcon(agent.personality)}
            <span>{agent.personality}</span>
          </div>
        </div>

        {/* Role Description */}
        <div className="mt-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            {agent.roleDescription}
          </p>
        </div>

        {/* Primary Goal / Objective */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Target className="w-4 h-4 text-blue-500" />
              <span>Primary Goal / Objective</span>
            </div>
            {!isEditingGoal ? (
              <button
                type="button"
                onClick={() => {
                  setTempGoal(agent.primaryGoal);
                  setTempMetric(agent.targetMetric);
                  setIsEditingGoal(true);
                }}
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Goal</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveGoal}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Goal</span>
              </button>
            )}
          </div>

          {!isEditingGoal ? (
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40">
              <div className="text-xs font-bold text-blue-950 dark:text-blue-200 mb-1">
                {agent.targetMetric}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {agent.primaryGoal}
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Target Metric Label
                </label>
                <input
                  type="text"
                  value={tempMetric}
                  onChange={(e) => setTempMetric(e.target.value)}
                  className="w-full mt-0.5 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-500">
                  Detailed Objective
                </label>
                <textarea
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  rows={2}
                  className="w-full mt-0.5 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Key Constraints */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Key Constraints & Boundaries</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingConstraint(!isAddingConstraint)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Constraint</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {agent.keyConstraints.map((constraint, idx) => (
              <div
                key={idx}
                className="group flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  <span className="leading-snug">{constraint}</span>
                </div>
                {agent.keyConstraints.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveConstraint(idx)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition-opacity"
                    title="Remove constraint"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {isAddingConstraint && (
              <form onSubmit={handleAddConstraintSubmit} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="e.g. Hard ceiling of $190k / Net-30 requirement"
                  value={newConstraintInput}
                  onChange={(e) => setNewConstraintInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Personality Selection Controls (Mandatory Task 2) */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Negotiation Personality
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Select or modify behavior profile
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['Aggressive', 'Collaborative', 'Risk-Averse'] as PersonalityType[]).map((pType) => {
              const def = PERSONALITY_DEFINITIONS[pType];
              const isSelected = agent.personality === pType;
              return (
                <button
                  key={pType}
                  type="button"
                  onClick={() => onUpdatePersonality(pType)}
                  className={`cursor-pointer flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? `bg-white dark:bg-slate-800 ${def.borderColor} ring-2 ring-current font-bold ${def.textColor} shadow-xs`
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                  }`}
                >
                  <div className="mb-1">{getPersonalityIcon(pType)}</div>
                  <span className="text-xs leading-none">{pType}</span>
                </button>
              );
            })}
          </div>

          {/* Personality Behavioral Brief */}
          <div
            className={`p-3 rounded-xl border text-xs space-y-1.5 ${activePersonalityDef.bgLight} ${activePersonalityDef.borderColor}`}
          >
            <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white text-[11px]">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>{activePersonalityDef.title} Tactical Stance:</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                Risk: {activePersonalityDef.riskTolerance} • Speed: {activePersonalityDef.compromiseSpeed}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              {activePersonalityDef.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
