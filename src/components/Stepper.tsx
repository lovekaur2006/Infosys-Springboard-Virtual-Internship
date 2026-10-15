/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, ChevronDown, Layers, Building2, Briefcase, Coins } from 'lucide-react';
import { ScenarioTemplate } from '../types.ts';
import { PREBUILT_SCENARIOS } from '../data/scenarios.ts';

interface StepperProps {
  currentStep: 1 | 2 | 3;
  onSelectStep: (step: 1 | 2 | 3) => void;
  selectedScenario: ScenarioTemplate;
  onSelectScenario: (scenario: ScenarioTemplate) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  onSelectStep,
  selectedScenario,
  onSelectScenario,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const steps = [
    { number: 1, label: 'Select Scenario' },
    { number: 2, label: 'Configure Agents' },
    { number: 3, label: 'Review & Start' },
  ];

  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'vendor-pricing':
        return <Building2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'job-offer':
        return <Briefcase className="w-3.5 h-3.5 text-purple-600" />;
      case 'budget-allocation':
        return <Coins className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
      {/* Stepper items */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;

          return (
            <React.Fragment key={step.number}>
              <button
                onClick={() => onSelectStep(step.number as 1 | 2 | 3)}
                className={`flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : isCompleted
                    ? 'text-slate-700 hover:text-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100'
                      : isCompleted
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.number}
                </div>
                <span>{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={`w-8 h-[2px] rounded ${
                    isCompleted ? 'bg-blue-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Scenario switcher dropdown pill on the right */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-colors text-xs font-semibold text-slate-700"
        >
          <div className="p-1 rounded bg-slate-50 border border-slate-100">
            {getScenarioIcon(selectedScenario.id)}
          </div>
          <span className="truncate max-w-[170px]">{selectedScenario.title}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Scenario
              </div>
              {PREBUILT_SCENARIOS.map((scenario) => {
                const isSelected = scenario.id === selectedScenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      onSelectScenario(scenario);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {getScenarioIcon(scenario.id)}
                    <span className="flex-1 truncate">{scenario.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
