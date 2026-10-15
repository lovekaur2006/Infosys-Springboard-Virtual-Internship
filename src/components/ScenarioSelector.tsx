/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Briefcase,
  Building2,
  Coins,
  Users,
  Layers,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ScenarioTemplate } from '../types.ts';
import { PREBUILT_SCENARIOS } from '../data/scenarios.ts';

interface ScenarioSelectorProps {
  selectedScenario: ScenarioTemplate;
  onSelectScenario: (scenario: ScenarioTemplate) => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  selectedScenario,
  onSelectScenario,
}) => {
  const getIconForScenario = (id: string) => {
    switch (id) {
      case 'vendor-pricing':
        return <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'job-offer':
        return <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'budget-allocation':
        return <Coins className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 1: Negotiation Scenario</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pre-Built Negotiation Scenarios
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a negotiation context. Choosing a scenario dynamically loads the participating agents, roles, goals, and constraints.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PREBUILT_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenario.id === scenario.id;
          return (
            <div
              key={scenario.id}
              onClick={() => onSelectScenario(scenario)}
              className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/20 shadow-lg dark:shadow-blue-950/30'
                  : 'bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              {/* Header badge & Icon */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                    {getIconForScenario(scenario.id)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {scenario.badge}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-blue-500 animate-pulse' : 'bg-transparent'
                      }`}
                    />
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {scenario.title}
                </h3>

                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {scenario.shortDescription}
                </p>

                {/* Agent role breakdown preview */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>{scenario.defaultAgents.length} Participating Agents:</span>
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {scenario.complexity} Complexity
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {scenario.defaultAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-medium truncate max-w-[140px]">{agent.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                          {agent.roleTitle}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom selection indicator */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span
                  className={
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                  }
                >
                  {isSelected ? 'Currently Selected' : 'Click to Load Scenario'}
                </span>
                <div
                  className={`p-1 rounded-lg transition-transform ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
