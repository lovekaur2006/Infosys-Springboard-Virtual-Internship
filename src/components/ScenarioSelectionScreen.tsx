/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  const getCardTheme = (id: string) => {
    switch (id) {
      case 'vendor-pricing':
        return {
          icon: <Handshake className="w-6 h-6 text-blue-600" />,
          iconBg: 'bg-blue-100',
          buttonBg: 'bg-[#2563EB] hover:bg-blue-700 text-white',
          badgeText: 'text-blue-600',
          borderHover: 'hover:border-blue-400',
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header section with note */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Choose a Negotiation Scenario
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Select a pre-built scenario to get started. Each scenario comes with predefined agents, goals, constraints and default personalities. You can customize the personalities before starting.
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
              onClick={() => onSelectScenario(scenario)}
              className={`bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between cursor-pointer relative shadow-xs hover:shadow-lg ${theme.borderHover} ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/90'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </div>
              )}

              <div>
                {/* Icon rounded badge */}
                <div
                  className={`w-14 h-14 rounded-2xl ${theme.iconBg} flex items-center justify-center mb-5 shadow-xs`}
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
                    onSelectScenario(scenario);
                    onProceedToConfig();
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
