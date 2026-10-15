/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Briefcase,
  Building2,
  Coins,
  Layers,
  User,
  Shield,
  Target,
  CheckCircle2,
  ArrowRight,
  Smile,
  Store,
  Brain,
  SlidersHorizontal,
} from 'lucide-react';
import { AgentConfig, PersonalityType, ScenarioTemplate } from '../types.ts';

interface ReviewStartScreenProps {
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  onBackToConfig: () => void;
  onStartNegotiation: () => void;
  onUpdatePersonality: (agentId: string, personality: PersonalityType) => void;
}

export const ReviewStartScreen: React.FC<ReviewStartScreenProps> = ({
  scenario,
  agents,
  onBackToConfig,
  onStartNegotiation,
  onUpdatePersonality,
}) => {
  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'vendor-pricing':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'job-offer':
        return <Briefcase className="w-5 h-5 text-purple-600" />;
      case 'budget-allocation':
      default:
        return <Coins className="w-5 h-5 text-emerald-600" />;
    }
  };

  const getAgentAvatarBg = (idx: number) => {
    if (idx === 0) return 'bg-blue-600 text-white';
    if (idx === 1) return 'bg-purple-600 text-white';
    return 'bg-emerald-600 text-white';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 3-Section Grid matching Screen 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Section 1: Selected Scenario Card (3.5 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Selected Scenario
          </div>
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[340px]">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-4 border border-purple-100">
                {getScenarioIcon(scenario.id)}
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {scenario.title}
              </h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {scenario.shortDescription}
              </p>
            </div>

            {/* Bottom tags */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium">Agents</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {agents.length}
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium">Roles</div>
                <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5" title={scenario.agentRolesText}>
                  {scenario.agentRolesText?.split(',')[0] || 'Standard'}
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium">Mode</div>
                <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
                  Simulation
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Configured Agents Cards (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Configured Agents
            </div>
            <button
              onClick={onBackToConfig}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Edit Settings
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agents.map((agent, idx) => {
              const avatarBg = getAgentAvatarBg(idx);

              return (
                <div
                  key={agent.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[340px]"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl ${avatarBg} flex items-center justify-center font-bold text-sm shadow-xs`}
                        >
                          {idx === 0 ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Store className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {agent.name}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {agent.roleTitle}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-500 px-1.5 py-0.5">
                        AI Agent
                      </span>
                    </div>

                    {/* Goal */}
                    <div className="mt-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Target className="w-3 h-3 text-blue-600" /> Goal
                      </div>
                      <p className="mt-1 text-xs text-slate-700 font-medium leading-relaxed">
                        {agent.primaryGoal}
                      </p>
                    </div>

                    {/* Constraints */}
                    <div className="mt-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Shield className="w-3 h-3 text-slate-500" /> Constraints
                      </div>
                      <ul className="mt-1 space-y-1 text-xs text-slate-600">
                        {agent.keyConstraints.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Personality */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Smile className="w-3.5 h-3.5 text-slate-400" /> Personality
                    </div>
                    <select
                      value={agent.personality}
                      onChange={(e) =>
                        onUpdatePersonality(agent.id, e.target.value as PersonalityType)
                      }
                      className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="Risk-Averse">Risk-Averse</option>
                      <option value="Aggressive">Aggressive</option>
                      <option value="Collaborative">Collaborative</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Quick Summary Card (2.5 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Quick Summary
          </div>
          <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-200/80 shadow-xs flex flex-col justify-between min-h-[340px]">
            <div>
              <div className="space-y-3.5 text-xs text-emerald-950 font-semibold mt-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Scenario selected</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{agents.length} agents configured</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Goals & constraints set</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Personalities assigned</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ready to start negotiation</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={onStartNegotiation}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <span>Start Negotiation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
