/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Building2,
  Store,
  Briefcase,
  Brain,
  Sparkles,
  Shield,
  Target,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Plus,
  Trash2,
  Smile,
  Edit2,
  Check,
} from 'lucide-react';
import { AgentConfig, PersonalityType, ScenarioTemplate, ValidationResult } from '../types.ts';
import { PERSONALITY_DEFINITIONS } from '../data/scenarios.ts';

interface AgentConfigurationScreenProps {
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  validation: ValidationResult;
  onUpdatePersonality: (agentId: string, personality: PersonalityType) => void;
  onUpdateGoal: (agentId: string, goal: string, metric: string) => void;
  onAddConstraint: (agentId: string, constraint: string) => void;
  onRemoveConstraint: (agentId: string, index: number) => void;
  onProceedToReview: () => void;
  onStartNegotiation: () => void;
}

export const AgentConfigurationScreen: React.FC<AgentConfigurationScreenProps> = ({
  scenario,
  agents,
  validation,
  onUpdatePersonality,
  onUpdateGoal,
  onAddConstraint,
  onRemoveConstraint,
  onProceedToReview,
  onStartNegotiation,
}) => {
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [tempGoal, setTempGoal] = useState('');
  const [newConstraintAgentId, setNewConstraintAgentId] = useState<string | null>(null);
  const [newConstraintText, setNewConstraintText] = useState('');

  const getAgentTheme = (agent: AgentConfig, index: number) => {
    if (index === 0) {
      return {
        avatarBg: 'bg-blue-600 text-white',
        roleBadge: 'bg-blue-50 text-blue-700 border-blue-200',
        ringFocus: 'focus:ring-blue-500',
      };
    }
    if (index === 1) {
      return {
        avatarBg: 'bg-purple-600 text-white',
        roleBadge: 'bg-purple-50 text-purple-700 border-purple-200',
        ringFocus: 'focus:ring-purple-500',
      };
    }
    return {
      avatarBg: 'bg-emerald-600 text-white',
      roleBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ringFocus: 'focus:ring-emerald-500',
    };
  };

  const getPersonalityDescription = (type: PersonalityType) => {
    switch (type) {
      case 'Risk-Averse':
        return 'Prefers stability, avoids unnecessary risks, and makes cautious concessions.';
      case 'Aggressive':
        return 'Starts with strong demands, makes smaller concessions, pressures for better terms.';
      case 'Collaborative':
        return 'Focuses on mutual value creation, flexible bundling, and win-win trade-offs.';
    }
  };

  const handleStartEditGoal = (agent: AgentConfig) => {
    setEditingAgentId(agent.id);
    setTempGoal(agent.primaryGoal);
  };

  const handleSaveGoal = (agent: AgentConfig) => {
    if (tempGoal.trim()) {
      onUpdateGoal(agent.id, tempGoal.trim(), agent.targetMetric);
    }
    setEditingAgentId(null);
  };

  const handleAddConstraintSubmit = (agentId: string) => {
    if (newConstraintText.trim()) {
      onAddConstraint(agentId, newConstraintText.trim());
      setNewConstraintText('');
      setNewConstraintAgentId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Configure Agents for {scenario.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          Review the agents, their roles, goals and constraints. You can customize the personality for each agent before starting the negotiation.
        </p>
      </div>

      {/* Agents side-by-side grid */}
      <div
        className={`grid grid-cols-1 gap-6 ${
          agents.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        }`}
      >
        {agents.map((agent, idx) => {
          const theme = getAgentTheme(agent, idx);
          const isEditingThisGoal = editingAgentId === agent.id;
          const isAddingThisConstraint = newConstraintAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Header: Avatar, Name, Role badge, and AI Agent tag */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl ${theme.avatarBg} flex items-center justify-center font-bold text-base shadow-sm shrink-0`}
                    >
                      {idx === 0 ? (
                        <User className="w-5 h-5" />
                      ) : idx === 1 ? (
                        <Store className="w-5 h-5" />
                      ) : (
                        <Brain className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                          {agent.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${theme.roleBadge}`}
                        >
                          {agent.roleTitle}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {agent.organization}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                    AI Agent
                  </span>
                </div>

                {/* Role Description */}
                <p className="mt-3 text-xs text-slate-500 leading-relaxed min-h-[36px]">
                  {agent.roleDescription}
                </p>

                {/* Two Sub-columns inside card */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                  {/* Left Column: Primary Goal & Key Constraints */}
                  <div className="space-y-4">
                    {/* Primary Goal */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                          <Target className="w-3.5 h-3.5 text-blue-600" />
                          Primary Goal
                        </div>
                        {!isEditingThisGoal ? (
                          <button
                            onClick={() => handleStartEditGoal(agent)}
                            className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5 font-medium"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSaveGoal(agent)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-bold"
                          >
                            <Check className="w-3 h-3" /> Done
                          </button>
                        )}
                      </div>

                      {isEditingThisGoal ? (
                        <textarea
                          value={tempGoal}
                          onChange={(e) => setTempGoal(e.target.value)}
                          rows={3}
                          className="mt-1.5 w-full text-xs p-2 rounded-xl border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none text-slate-800"
                        />
                      ) : (
                        <div className="mt-1 text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          {agent.primaryGoal}
                        </div>
                      )}
                    </div>

                    {/* Key Constraints */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                          <Shield className="w-3.5 h-3.5 text-slate-600" />
                          Key Constraints
                        </div>
                        <button
                          onClick={() => {
                            setNewConstraintAgentId(agent.id);
                            setNewConstraintText('');
                          }}
                          className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5 font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>

                      <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                        {agent.keyConstraints.map((constraint, cIdx) => (
                          <li
                            key={cIdx}
                            className="flex items-start justify-between gap-1.5 group p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <span className="flex items-start gap-2 leading-tight">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                              <span>{constraint}</span>
                            </span>
                            <button
                              onClick={() => onRemoveConstraint(agent.id, cIdx)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-0.5"
                              title="Remove constraint"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>

                      {isAddingThisConstraint && (
                        <div className="mt-2 flex items-center gap-1.5 animate-in fade-in duration-150">
                          <input
                            type="text"
                            placeholder="Enter constraint..."
                            value={newConstraintText}
                            onChange={(e) => setNewConstraintText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddConstraintSubmit(agent.id);
                              }
                            }}
                            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddConstraintSubmit(agent.id)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setNewConstraintAgentId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Personality Selector & Description */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                      <Smile className="w-3.5 h-3.5 text-slate-600" />
                      Personality
                    </div>

                    {/* Personality dropdown */}
                    <div className="relative">
                      <select
                        value={agent.personality}
                        onChange={(e) =>
                          onUpdatePersonality(agent.id, e.target.value as PersonalityType)
                        }
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer pr-8"
                      >
                        <option value="Risk-Averse">Risk-Averse</option>
                        <option value="Aggressive">Aggressive</option>
                        <option value="Collaborative">Collaborative</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {/* Personality description box from mockup */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed min-h-[70px]">
                      {getPersonalityDescription(agent.personality)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Status & CTA Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left valid pill */}
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configuration is valid! You can now start the negotiation.</span>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onProceedToReview}
            className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
          >
            Review Summary
          </button>
          <button
            onClick={onStartNegotiation}
            className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <span>Start Negotiation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
