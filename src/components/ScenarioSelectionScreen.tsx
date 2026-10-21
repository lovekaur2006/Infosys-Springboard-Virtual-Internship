/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Handshake,
  Briefcase,
  Users,
  User,
  Shield,
  Target,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { ScenarioTemplate } from '../types.ts';
import { PREBUILT_SCENARIOS } from '../data/scenarios.ts';

interface ScenarioSelectionScreenProps {
  selectedScenario: ScenarioTemplate;
  onSelectScenario: (scenario: ScenarioTemplate) => void;
  onProceedToConfig: () => void;
}

export const ScenarioSelectionScreen: React.FC<ScenarioSelectionScreenProps> = ({
  selectedScenario,
  onSelectScenario,
  onProceedToConfig,
}) => {
  const [pendingScenarioId, setPendingScenarioId] = useState<string | null>(null);
  const [animatedScenarioId, setAnimatedScenarioId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingScenarioId) return;
    const timer = window.setTimeout(() => {
      onProceedToConfig();
      setPendingScenarioId(null);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [pendingScenarioId, onProceedToConfig]);

  const chooseScenario = (scenario: ScenarioTemplate) => {
    onSelectScenario(scenario);
    setAnimatedScenarioId(null);
    window.requestAnimationFrame(() => setAnimatedScenarioId(scenario.id));
  };

  const getCardTheme = (id: string) => {
    switch (id) {
      case 'vendor-pricing':
        return {
          icon: <Handshake className="w-6 h-6 text-teal-700" />,
          iconBg: 'bg-teal-100',
          buttonBg: 'bg-[#2563EB] hover:bg-teal-800 text-white',
          badgeText: 'text-teal-700',
          borderHover: 'hover:border-teal-500',
        };
      case 'job-offer':
        return {
          icon: <Briefcase className="w-6 h-6 text-purple-600" />,
          iconBg: 'bg-purple-100',
          buttonBg: 'bg-[#7C3AED] hover:bg-purple-700 text-white',
          badgeText: 'text-purple-600',
          borderHover: 'hover:border-purple-400',
        };
      case 'budget-allocation':
      default:
        return {
          icon: <Users className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-100',
          buttonBg: 'bg-[#059669] hover:bg-emerald-700 text-white',
          badgeText: 'text-emerald-600',
          borderHover: 'hover:border-emerald-400',
        };
    }
  };

  return (
    <div className="pn-scenario-selection space-y-8 animate-in fade-in duration-200">
      {/* Header section with note */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Choose your starting point · 01</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Pick the conversation.
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Start from a focused playbook, then tune the people, priorities, and boundaries around the table.
          </p>
        </div>

        {/* Hand-written whimsical slogan note */}
        <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3.5 px-5 shadow-xs text-right self-start rotate-1 hover:rotate-0 transition-transform">
          <div className="font-handwriting text-base sm:text-lg text-purple-800 leading-tight">
            Different scenarios <br />
            Different challenges <br />
            <span className="font-bold text-indigo-900">
              Same goal — Better negotiation skills!
            </span>
          </div>
        </div>
      </div>

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PREBUILT_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenario.id === scenario.id;
          const theme = getCardTheme(scenario.id);

          return (
            <div
              key={scenario.id}
              onClick={() => chooseScenario(scenario)}
              className={`pn-scenario-card bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between cursor-pointer relative shadow-xs hover:shadow-lg ${theme.borderHover} ${
                isSelected
                  ? `is-selected ${animatedScenarioId === scenario.id ? 'is-animating' : ''} border-teal-600 ring-2 ring-teal-600/20 shadow-md`
                  : 'border-slate-200/90'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </div>
              )}

              <div>
                {/* Icon rounded badge */}
                <div
                  className={`pn-scenario-icon w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center mb-5 shadow-xs`}
                >
                  {theme.icon}
                </div>

                {/* Scenario Title */}
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {scenario.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-xs text-slate-600 leading-relaxed min-h-[40px]">
                  {scenario.shortDescription}
                </p>

                {/* Metadata Fields matching image */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3.5 text-xs">
                  {/* Participating Agents */}
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Participating Agents
                      </div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {scenario.participatingAgentsText ||
                          scenario.defaultAgents.map((a) => a.name).join(' + ')}
                      </div>
                    </div>
                  </div>

                  {/* Agent Roles */}
                  <div className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Agent Roles
                      </div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {scenario.agentRolesText ||
                          scenario.defaultAgents.map((a) => a.roleTitle).join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Key Goals */}
                  <div className="flex items-start gap-2.5">
                    <Target className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Key Goals
                      </div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {scenario.keyGoalsText ||
                          'Achieve favorable settlement within defined constraints'}
                      </div>
                    </div>
                  </div>

                  {/* Constraints */}
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Constraints
                      </div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {scenario.constraintsText ||
                          'Budget limits, duration bounds, SLAs and minimum terms'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom CTA Button */}
              <div className="mt-6 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    chooseScenario(scenario);
                    setPendingScenarioId(scenario.id);
                  }}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${theme.buttonBg}`}
                >
                  <span>Select Scenario</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
