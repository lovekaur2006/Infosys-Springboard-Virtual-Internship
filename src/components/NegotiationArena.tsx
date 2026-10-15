/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Award,
  Layers,
  Flame,
  Handshake,
  Shield,
  Clock,
  Send,
  User,
  Bot,
  SlidersHorizontal,
  Lightbulb,
  Check,
  FileCheck2,
} from 'lucide-react';
import {
  AgentConfig,
  NegotiationTurn,
  ScenarioTemplate,
  SettlementSummary,
} from '../types.ts';
import { PERSONALITY_DEFINITIONS } from '../data/scenarios.ts';
import {
  generateSettlementSummary,
  generateTurnDialogue,
  generateAIResponseToUserInput,
} from '../services/negotiationEngine.ts';

interface NegotiationArenaProps {
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  onBackToConfig: () => void;
  onOpenScheduleModal: () => void;
  isCalendarConnected: boolean;
}

export const NegotiationArena: React.FC<NegotiationArenaProps> = ({
  scenario,
  agents,
  onBackToConfig,
  onOpenScheduleModal,
  isCalendarConnected,
}) => {
  // Negotiation Mode: 'interactive' (You vs AI) or 'auto' (AI vs AI)
  const [mode, setMode] = useState<'interactive' | 'auto'>('interactive');

  // Which agent the user is playing as (default is agent[0])
  const [userAgentIdx, setUserAgentIdx] = useState(0);

  // Simulation rounds & turns
  const [currentRound, setCurrentRound] = useState(1);
  const [turns, setTurns] = useState<NegotiationTurn[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(2400);
  const [settlement, setSettlement] = useState<SettlementSummary | null>(null);

  // User Custom Input State
  const [userInputText, setUserInputText] = useState('');
  const [customPriceTerm, setCustomPriceTerm] = useState('');
  const [customDurationTerm, setCustomDurationTerm] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const userAgent = agents[userAgentIdx] || agents[0];
  const aiAgent = agents[userAgentIdx === 0 ? 1 : 0] || agents[0];

  // Initialize opening turn when mounted
  useEffect(() => {
    if (turns.length === 0) {
      const firstTurn = generateTurnDialogue(scenario, agents, 1, 0, []);
      setTurns([firstTurn]);
    }
  }, []);

  // Auto-scroll transcript on new turn
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isAiThinking]);

  // Autonomous turn advance (AI vs AI mode)
  const advanceAutonomousTurn = () => {
    if (settlement) return;

    const lastTurn = turns[turns.length - 1];
    const nextAgentIdx =
      lastTurn?.agentId === agents[0]?.id ? 1 : 0;
    const nextRound = nextAgentIdx === 0 ? currentRound + 1 : currentRound;

    if (nextRound > scenario.orchestrator.maxRounds) {
      setIsPlaying(false);
      setSettlement(generateSettlementSummary(scenario, agents));
      return;
    }

    const newTurn = generateTurnDialogue(
      scenario,
      agents,
      nextRound,
      nextAgentIdx,
      turns
    );
    setTurns((prev) => [...prev, newTurn]);
    setCurrentRound(nextRound);

    if (nextRound === scenario.orchestrator.maxRounds && nextAgentIdx === 1) {
      setIsPlaying(false);
      setSettlement(generateSettlementSummary(scenario, agents));
    }
  };

  // Auto-play timer loop for 'auto' mode
  useEffect(() => {
    let timer: any;
    if (isPlaying && !settlement && mode === 'auto') {
      timer = setTimeout(() => {
        advanceAutonomousTurn();
      }, playSpeedMs);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentRound, settlement, playSpeedMs, turns, mode]);

  // Handle User submitting their own proposal
  const handleSendUserTurn = () => {
    if (!userInputText.trim() || isAiThinking || settlement) return;

    const termsToInclude: { label: string; value: string }[] = [];
    if (customPriceTerm.trim()) {
      termsToInclude.push({ label: 'Proposed Price / Comp', value: customPriceTerm.trim() });
    }
    if (customDurationTerm.trim()) {
      termsToInclude.push({ label: 'Terms / Duration', value: customDurationTerm.trim() });
    }

    // 1. Create and append user turn
    const userTurn: NegotiationTurn = {
      id: `turn-user-${Date.now()}`,
      round: currentRound,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agentId: userAgent.id,
      agentName: `${userAgent.name} (You)`,
      roleTitle: `${userAgent.roleTitle}`,
      personality: userAgent.personality,
      speechText: userInputText.trim(),
      offeredTerms: termsToInclude.length > 0 ? termsToInclude : undefined,
      concessionNote: 'Direct human counter-offer submitted.',
      sentiment: 'collaborative',
      leverageScore: 78,
    };

    const updatedTurns = [...turns, userTurn];
    setTurns(updatedTurns);
    setUserInputText('');
    setCustomPriceTerm('');
    setCustomDurationTerm('');
    setIsAiThinking(true);

    // 2. Trigger AI Counterparty response after a brief realistic thinking delay
    setTimeout(() => {
      const aiTurn = generateAIResponseToUserInput(
        scenario,
        agents,
        aiAgent.id,
        userTurn.speechText,
        userTurn.offeredTerms,
        currentRound,
        updatedTurns
      );

      setTurns((prev) => [...prev, aiTurn]);
      setIsAiThinking(false);

      // Advance round if both have spoken
      if (currentRound >= scenario.orchestrator.maxRounds) {
        setSettlement(generateSettlementSummary(scenario, agents));
      } else {
        setCurrentRound((prev) => prev + 1);
      }
    }, 1100);
  };

  // AI Draft Assistance for user
  const handleDraftSuggestion = () => {
    if (scenario.id === 'vendor-pricing') {
      if (userAgentIdx === 0) {
        setUserInputText(
          'We can accept ₹8,00,000 for a 2-year commitment provided you include 1 year of warranty and Net-45 payment terms.'
        );
        setCustomPriceTerm('₹8,00,000');
        setCustomDurationTerm('2 Years + Warranty');
      } else {
        setUserInputText(
          'We can meet you at ₹8,20,000 with 2 years of premium enterprise support and 99.99% SLA guarantee.'
        );
        setCustomPriceTerm('₹8,20,000');
        setCustomDurationTerm('2 Years Premium SLA');
      }
    } else if (scenario.id === 'job-offer') {
      if (userAgentIdx === 0) {
        setUserInputText(
          'I am ready to sign today if we finalize at ₹8,80,000 base salary with 3 days remote flexibility and joining bonus.'
        );
        setCustomPriceTerm('₹8,80,000');
        setCustomDurationTerm('3 Days WFH + Bonus');
      } else {
        setUserInputText(
          'We can offer ₹8,50,000 base with an upfront ₹40,000 signing bonus and 2 days remote flexibility to stay within band guidelines.'
        );
        setCustomPriceTerm('₹8,50,000 + ₹40k Bonus');
        setCustomDurationTerm('Hybrid (2 Days WFH)');
      }
    } else {
      setUserInputText(
        'Let us agree on a phased disbursement: ₹550,000 upfront for immediate operational safety with remaining unlocked after Q3 audit.'
      );
      setCustomPriceTerm('₹5,50,000 Phase 1');
      setCustomDurationTerm('Milestone Tranches');
    }
  };

  // Accept latest terms and execute settlement
  const handleAcceptAndSettle = () => {
    setIsPlaying(false);
    setSettlement(generateSettlementSummary(scenario, agents));
  };

  // Reset simulation
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentRound(1);
    setSettlement(null);
    setUserInputText('');
    setCustomPriceTerm('');
    setCustomDurationTerm('');
    const firstTurn = generateTurnDialogue(scenario, agents, 1, 0, []);
    setTurns([firstTurn]);
  };

  const getPersonalityIcon = (p: string) => {
    switch (p) {
      case 'Aggressive':
        return <Flame className="w-3.5 h-3.5 text-rose-500" />;
      case 'Collaborative':
        return <Handshake className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToConfig}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Return to Agent Configuration"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-100 text-blue-800">
                {mode === 'interactive' ? 'Interactive Negotiation' : 'Autonomous Simulation'}
              </span>
              <span className="text-xs text-slate-500">
                Round {Math.min(currentRound, scenario.orchestrator.maxRounds)} of{' '}
                {scenario.orchestrator.maxRounds}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {scenario.title}
            </h2>
          </div>
        </div>

        {/* Mode Selector & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('interactive');
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'interactive'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎮 You vs AI
            </button>
            <button
              onClick={() => setMode('auto')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                mode === 'auto'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🤖 AI vs AI
            </button>
          </div>

          {/* Autonomous Controls */}
          {mode === 'auto' && !settlement && (
            <>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'Pause' : 'Auto-Play'}</span>
              </button>

              <button
                type="button"
                onClick={advanceAutonomousTurn}
                disabled={isPlaying}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-50"
              >
                <span>Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Dialogue Arena & Right Agent Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dialogue & User Input Console (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs flex flex-col h-[700px] overflow-hidden">
            {/* Arena Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Negotiation Arena ({turns.length} Turns)</span>
              </div>

              {/* Role Toggle if interactive */}
              {mode === 'interactive' && !settlement && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Playing as:</span>
                  <select
                    value={userAgentIdx}
                    onChange={(e) => setUserAgentIdx(Number(e.target.value))}
                    className="font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none"
                  >
                    {agents.map((a, idx) => (
                      <option key={a.id} value={idx}>
                        {a.name} ({a.roleTitle})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Scrollable Dialogue Stream */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* Orchestrator Kickoff Notice */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>{scenario.orchestrator.name}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Session commenced for <strong className="text-slate-900">"{scenario.title}"</strong>.
                  {mode === 'interactive'
                    ? ' You are negotiating directly with the counterparty AI agent. Type your proposals below.'
                    : ' Autonomous orchestration active.'}
                </p>
              </div>

              {/* Turn Bubbles */}
              {turns.map((turn, idx) => {
                const isUserTurn = turn.agentName.includes('(You)');
                const pDef = PERSONALITY_DEFINITIONS[turn.personality];

                return (
                  <div
                    key={turn.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUserTurn
                        ? 'bg-blue-50/70 border-blue-200 ml-4 sm:ml-8'
                        : 'bg-white border-slate-200/90 shadow-2xs mr-4 sm:mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isUserTurn
                              ? 'bg-blue-600 text-white'
                              : 'bg-purple-600 text-white'
                          }`}
                        >
                          {isUserTurn ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">
                              {turn.agentName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              • {turn.roleTitle}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Round {turn.round} • {turn.timestamp}
                          </div>
                        </div>
                      </div>

                      {pDef && (
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pDef.badgeColor}`}
                        >
                          {getPersonalityIcon(turn.personality)}
                          <span>{turn.personality}</span>
                        </div>
                      )}
                    </div>

                    {/* Speech Text */}
                    <div className="mt-2.5 text-xs text-slate-800 leading-relaxed font-sans pl-1">
                      "{turn.speechText}"
                    </div>

                    {/* Offered Terms badge pills */}
                    {turn.offeredTerms && turn.offeredTerms.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {turn.offeredTerms.map((term, tIdx) => (
                          <div
                            key={tIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] shadow-2xs"
                          >
                            <span className="font-medium text-slate-500">
                              {term.label}:
                            </span>
                            <span className="font-bold text-blue-700">
                              {term.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {turn.concessionNote && !isUserTurn && (
                      <div className="pt-2 text-[11px] text-slate-500 italic">
                        ⚡ AI Tactical Stance: {turn.concessionNote}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* AI is thinking indicator */}
              {isAiThinking && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600 animate-pulse">
                  <Bot className="w-4 h-4 text-purple-600 animate-spin" />
                  <span>
                    <strong>{aiAgent.name}</strong> is evaluating your offer against constraints...
                  </span>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>

            {/* Bottom Section: Interactive User Input Console OR Settlement Bar */}
            {!settlement ? (
              mode === 'interactive' ? (
                <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                  {/* Quick Term Fillers & Suggestion */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-semibold text-[11px]">Quick Terms:</span>
                      <input
                        type="text"
                        placeholder="Price (e.g. ₹8,00,000)"
                        value={customPriceTerm}
                        onChange={(e) => setCustomPriceTerm(e.target.value)}
                        className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Terms (e.g. 2 Yrs, Net-45)"
                        value={customDurationTerm}
                        onChange={(e) => setCustomDurationTerm(e.target.value)}
                        className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleDraftSuggestion}
                      className="text-xs text-purple-700 hover:text-purple-800 font-bold flex items-center gap-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      Suggest Pitch
                    </button>
                  </div>

                  {/* Main Textarea & Actions */}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={userInputText}
                      onChange={(e) => setUserInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendUserTurn();
                        }
                      }}
                      placeholder={`State your terms or counter-proposal as ${userAgent.name}... (Press Enter to send)`}
                      rows={2}
                      disabled={isAiThinking}
                      className="flex-1 text-xs p-3 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none text-slate-800 shadow-2xs"
                    />

                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={handleSendUserTurn}
                        disabled={!userInputText.trim() || isAiThinking}
                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Send Proposal"
                      >
                        <Send className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleAcceptAndSettle}
                        className="px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold transition-colors whitespace-nowrap"
                        title="Accept current terms and conclude negotiation"
                      >
                        Accept & Settle
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Auto mode footer */
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Autonomous negotiation running...</span>
                  </div>
                  <button
                    onClick={advanceAutonomousTurn}
                    disabled={isPlaying}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors"
                  >
                    Trigger Next Step
                  </button>
                </div>
              )
            ) : (
              /* Concluded banner */
              <div className="p-4 bg-emerald-50 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Agreement reached! Settlement terms verified and recorded.</span>
                </div>
                <button
                  onClick={onOpenScheduleModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isCalendarConnected ? 'Schedule in Google Cal' : 'Connect & Schedule'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Counterparty Agent Intelligence & Live Status (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Counterparty AI Live Profile */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Counterparty Agent
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                AI Powered
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {aiAgent.name}
                </h3>
                <div className="text-xs text-purple-600 font-semibold">
                  {aiAgent.roleTitle}
                </div>
              </div>
            </div>

            {/* AI Personality & Primary Goal */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Negotiation Style:</span>
                <span className="font-bold text-slate-800">{aiAgent.personality}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600 leading-relaxed text-[11px]">
                {PERSONALITY_DEFINITIONS[aiAgent.personality]?.description}
              </div>
            </div>

            {/* AI Active Redline Constraints */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                Active Constraints to Respect
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-600">
                {aiAgent.keyConstraints.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Settlement Summary Card if concluded */}
          {settlement && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-xs space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Agreement Score: {settlement.agreementScore}%</span>
              </div>
              <div className="divide-y divide-emerald-200/60 text-xs">
                {settlement.keyTerms.slice(0, 3).map((term, i) => (
                  <div key={i} className="py-2 flex items-center justify-between">
                    <span className="text-slate-600">{term.term}</span>
                    <span className="font-bold text-emerald-900">{term.agreedValue}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={onOpenScheduleModal}
                className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Execution Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
