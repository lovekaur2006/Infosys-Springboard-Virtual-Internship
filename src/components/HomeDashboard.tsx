import React from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Handshake,
  Layers3,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { ScenarioTemplate } from '../types.ts';
import { PREBUILT_SCENARIOS } from '../data/scenarios.ts';

interface HomeDashboardProps {
  selectedScenario: ScenarioTemplate;
  onSelectScenario: (scenario: ScenarioTemplate) => void;
  onStart: () => void;
  onViewScenarios: () => void;
}

const scenarioIcons = [Handshake, BriefcaseBusiness, UsersRound];
const scenarioKinds = ['Commercial', 'Career', 'Collective'];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  selectedScenario,
  onSelectScenario,
  onStart,
  onViewScenarios,
}) => {
  const chooseScenario = (scenario: ScenarioTemplate) => {
    onSelectScenario(scenario);
    window.setTimeout(onStart, 620);
  };

  return (
  <div className="pn-dashboard pn-fieldbook animate-in fade-in duration-300">
    <header className="pn-desk-heading">
      <div>
        <div className="pn-eyebrow"><span className="pn-eyebrow-mark" /> FIELDNOTES / NEGOTIATION LAB</div>
        <h1>Make the next<br className="hidden sm:block" /> move count.</h1>
        <p>Choose a room, set your terms, and see what both sides are willing to trade.</p>
      </div>
      <button onClick={onStart} className="pn-new-session"><Plus className="h-4 w-4" /> Build a negotiation</button>
    </header>

    <section className="pn-field-hero">
      <div className="pn-field-hero-copy">
        <div className="pn-live-label"><Sparkles className="h-3.5 w-3.5" /> YOUR NEGOTIATION WORKBENCH</div>
        <h2>Every good deal<br />starts with a clear brief.</h2>
        <p>Bring distinct priorities to the table. Watch the offers move, the boundaries hold, and the agreement take shape.</p>
        <button onClick={onStart}>Open {selectedScenario.title}<ArrowRight className="h-4 w-4" /></button>
      </div>
      <div className="pn-field-stamp" aria-label="Selected scenario">
        <span className="pn-stamp-ring">CURRENT<br />PLAYBOOK</span>
        <span className="pn-stamp-number">0{Math.max(1, PREBUILT_SCENARIOS.findIndex((item) => item.id === selectedScenario.id) + 1)}</span>
        <span className="pn-stamp-title">{selectedScenario.category}</span>
        <span className="pn-stamp-rule" />
        <span className="pn-stamp-caption">{selectedScenario.defaultAgents.length} voices · {selectedScenario.estimatedRounds} rounds</span>
      </div>
      <span className="pn-hero-index">01 — 03</span>
    </section>

    <section className="pn-stat-strip" aria-label="Workspace overview">
      <div><span className="pn-stat-icon"><Layers3 className="h-4 w-4" /></span><span><strong>{String(PREBUILT_SCENARIOS.length).padStart(2, '0')}</strong><small>Negotiation briefs</small></span></div>
      <div><span className="pn-stat-icon"><UsersRound className="h-4 w-4" /></span><span><strong>{String(PREBUILT_SCENARIOS.reduce((count, item) => count + item.defaultAgents.length, 0)).padStart(2, '0')}</strong><small>Distinct perspectives</small></span></div>
      <div><span className="pn-stat-icon"><Clock3 className="h-4 w-4" /></span><span><strong>12<span className="pn-stat-unit"> min</span></strong><small>Typical session</small></span></div>
      <div className="pn-stat-note"><span className="pn-note-dot" /> BUILT FOR THE HARD PART: FINDING COMMON GROUND</div>
    </section>

    <section className="pn-playbooks">
      <div className="pn-section-heading">
        <div><div className="pn-eyebrow">THE PLAYBOOK SHELF</div><h2>Pick your table.</h2></div>
        <button onClick={onViewScenarios}>Browse all scenarios <ArrowRight className="h-4 w-4" /></button>
      </div>
      <div className="pn-playbook-grid">
        {PREBUILT_SCENARIOS.map((scenario, index) => {
          const Icon = scenarioIcons[index % scenarioIcons.length];
          const isSelected = selectedScenario.id === scenario.id;
          return (
            <article key={scenario.id} className={`pn-playbook-card ${isSelected ? 'is-selected' : ''}`}>
              <div className="pn-playbook-top"><span className="pn-playbook-number">0{index + 1}</span><span className="pn-playbook-icon"><Icon className="h-5 w-5" /></span>{isSelected && <span className="pn-selected-tag">IN FOCUS</span>}</div>
              <div className="pn-playbook-kind">{scenarioKinds[index % scenarioKinds.length]} / {scenario.category}</div>
              <h3>{scenario.title}</h3>
              <p>{scenario.shortDescription}</p>
              <div className="pn-playbook-footer">
                <span>{scenario.defaultAgents.length} participants <i /> {scenario.estimatedRounds} rounds</span>
                <button aria-label={`Start ${scenario.title}`} onClick={() => chooseScenario(scenario)}><ArrowRight className="h-4 w-4" /></button>
              </div>
            </article>
          );
        })}
      </div>
    </section>

    <footer className="pn-method-note"><span className="pn-method-mark"><ArrowDownRight className="h-5 w-5" /></span><span><strong>A useful negotiation is a sequence, not a single offer.</strong><small>Set a goal · Name your boundary · Trade with intent · Capture the outcome</small></span><span className="pn-method-aside">THE METHOD / 04 STEPS</span></footer>
  </div>
  );
};
