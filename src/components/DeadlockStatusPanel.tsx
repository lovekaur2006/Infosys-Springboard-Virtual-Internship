/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DeadlockStatusPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the live deadlock status, per-condition scores, active reason
 * details, resolution strategy, and action controls inside the
 * NegotiationArena.
 *
 * Props
 *   status           — current DeadlockStatus (basic; always available)
 *   analysis         — extended DeadlockAnalysis (rich scores; optional)
 *   currentRound     — round displayed in the progress bar
 *   maxRounds        — scenario max rounds
 *   onTriggerResolution — called when the user manually triggers a resolution
 *   onDismiss        — called when the user dismisses a non-critical banner
 *   compact          — when true, renders a single-line ribbon instead of the
 *                      full panel (used in the arena header bar)
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Scale,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Ban,
  RotateCcw,
  Zap,
  Info,
} from 'lucide-react';
import { DeadlockReason, DeadlockResolution, DeadlockStatus } from '../types.ts';
import {
  DeadlockAnalysis,
  DEADLOCK_REASON_LABELS,
  DEADLOCK_REASON_DESCRIPTIONS,
  deadlockResolutionText,
} from '../services/deadlockDetector.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REASON_ICONS: Record<DeadlockReason, React.ReactNode> = {
  no_meaningful_offer_change: <TrendingDown className="w-3.5 h-3.5" />,
  repeated_rejection:         <Ban          className="w-3.5 h-3.5" />,
  repeated_position:          <RotateCcw    className="w-3.5 h-3.5" />,
  maximum_rounds_reached:     <Clock        className="w-3.5 h-3.5" />,
};

const RESOLUTION_ICONS: Record<DeadlockResolution, React.ReactNode> = {
  none:                 <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  compromise_proposal:  <Scale        className="w-4 h-4 text-blue-600"    />,
  modify_stance:        <RefreshCw    className="w-4 h-4 text-amber-600"   />,
  final_round:          <Zap          className="w-4 h-4 text-orange-600"  />,
  breakdown:            <XCircle      className="w-4 h-4 text-rose-600"    />,
};

/** Clamp a raw score to 0–100 and render as a colour-coded bar. */
function ConditionBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const pct   = Math.min(Math.max(score, 0), 100);
  const color =
    pct >= 100 ? 'bg-rose-500'
    : pct >= 70 ? 'bg-amber-500'
    : pct >= 40 ? 'bg-yellow-400'
    : 'bg-emerald-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`text-[10px] font-bold ${pct >= 100 ? 'text-rose-600' : pct >= 70 ? 'text-amber-600' : 'text-slate-500'}`}>
          {pct >= 100 ? 'TRIGGERED' : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Compact ribbon (single-line, used in arena header area) ──────────────────

interface CompactRibbonProps {
  status:   DeadlockStatus;
  onExpand: () => void;
}

function CompactRibbon({ status, onExpand }: CompactRibbonProps) {
  const isDeadlocked = status.isDeadlocked;
  return (
    <button
      type="button"
      onClick={onExpand}
      className={`w-full flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
        isDeadlocked
          ? 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100'
          : 'border-emerald-100 bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100/60'
      }`}
      aria-live="polite"
    >
      {isDeadlocked
        ? <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
        : <CheckCircle2  className="w-4 h-4 shrink-0 text-emerald-600" />}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-bold">
          {isDeadlocked ? 'Deadlock / stall detected' : 'Deadlock monitor active'}
        </span>
        <span className="ml-2 text-[11px] opacity-80 truncate">{status.reasonText}</span>
        {isDeadlocked && (
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide">
            → {status.resolution.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
    </button>
  );
}

// ─── Full panel ───────────────────────────────────────────────────────────────

export interface DeadlockStatusPanelProps {
  status:               DeadlockStatus;
  analysis?:            DeadlockAnalysis;
  currentRound:         number;
  maxRounds:            number;
  onTriggerResolution?: () => void;
  onDismiss?:           () => void;
  compact?:             boolean;
}

export const DeadlockStatusPanel: React.FC<DeadlockStatusPanelProps> = ({
  status,
  analysis,
  currentRound,
  maxRounds,
  onTriggerResolution,
  onDismiss,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);

  const isDeadlocked = status.isDeadlocked;
  const severity     = analysis?.severity ?? (isDeadlocked ? 'warning' : 'none');
  const isCritical   = severity === 'critical';

  // ── Compact view ──
  if (compact && !expanded) {
    return <CompactRibbon status={status} onExpand={() => setExpanded(true)} />;
  }

  // ── Full panel ──
  const containerClass = isCritical
    ? 'border-rose-200   bg-rose-50   text-rose-950'
    : isDeadlocked
      ? 'border-amber-200  bg-amber-50  text-amber-950'
      : 'border-emerald-100 bg-emerald-50/60 text-emerald-900';

  const headerIcon = isCritical
    ? <XCircle       className="w-5 h-5 mt-0.5 shrink-0 text-rose-600"    />
    : isDeadlocked
      ? <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-600"  />
      : <CheckCircle2  className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600"/>;

  const roundPct = Math.min(((currentRound - 1) / Math.max(maxRounds - 1, 1)) * 100, 100);

  return (
    <section
      className={`rounded-2xl border ${containerClass} transition-all duration-200`}
      aria-live="polite"
      aria-label="Deadlock monitor"
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 p-3.5">
        {headerIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold">
              {isCritical
                ? 'Critical — negotiation breakdown imminent'
                : isDeadlocked
                  ? 'Deadlock / stall detected'
                  : 'Deadlock monitor active'}
            </p>
            <div className="flex items-center gap-1">
              {/* Manual resolution trigger */}
              {isDeadlocked && onTriggerResolution && (
                <button
                  type="button"
                  onClick={onTriggerResolution}
                  title="Apply resolution now"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/70 border border-current/20 hover:bg-white transition-colors"
                >
                  {RESOLUTION_ICONS[status.resolution]}
                  <span className="hidden sm:inline">Resolve</span>
                </button>
              )}
              {/* Dismiss (non-critical only) */}
              {!isCritical && onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  title="Dismiss"
                  className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Expand/collapse toggle */}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? 'Collapse' : 'Expand'}
                className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity"
              >
                {expanded
                  ? <ChevronUp   className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Reason text */}
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-85">
            {status.reasonText}
          </p>

          {/* Resolution label */}
          {isDeadlocked && (
            <div className="mt-1 flex items-center gap-1.5">
              {RESOLUTION_ICONS[status.resolution]}
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Resolution: {status.resolution.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] opacity-70">
                (attempt {status.resolutionAttempts + 1} of 4)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-current/10 px-3.5 pb-3.5 pt-3 space-y-4">

          {/* Round progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold opacity-70">
              <span>Round Progress</span>
              <span>Round {Math.min(currentRound, maxRounds)} / {maxRounds}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-current/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  roundPct >= 100 ? 'bg-rose-500' : roundPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${roundPct}%` }}
              />
            </div>
          </div>

          {/* Condition scores (only when extended analysis is provided) */}
          {analysis && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                Condition Proximity Scores
              </p>
              <ConditionBar
                label="Stagnation (no offer change)"
                score={analysis.conditionScores.stagnation}
                icon={<TrendingDown className="w-3.5 h-3.5" />}
              />
              <ConditionBar
                label="Rejection cycling"
                score={analysis.conditionScores.rejectionCycling}
                icon={<Ban className="w-3.5 h-3.5" />}
              />
              <ConditionBar
                label="Position cycling"
                score={analysis.conditionScores.positionCycling}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              />
              <ConditionBar
                label="Round timeout"
                score={analysis.conditionScores.roundTimeout}
                icon={<Clock className="w-3.5 h-3.5" />}
              />
            </div>
          )}

          {/* Active reason cards */}
          {isDeadlocked && status.reasons.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                Active Deadlock Conditions
              </p>
              {status.reasons.map((reason) => (
                <div
                  key={reason}
                  className="flex items-start gap-2 rounded-xl bg-white/50 border border-current/10 p-2.5"
                >
                  <span className="mt-0.5 shrink-0 opacity-70">
                    {REASON_ICONS[reason]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold">{DEADLOCK_REASON_LABELS[reason]}</p>
                    <p className="text-[10px] opacity-75 leading-relaxed mt-0.5">
                      {analysis?.diagnostics[reason] ?? DEADLOCK_REASON_DESCRIPTIONS[reason]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolution strategy card */}
          {isDeadlocked && status.resolution !== 'none' && (
            <div className="rounded-xl bg-white/60 border border-current/10 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                {RESOLUTION_ICONS[status.resolution]}
                <span>Resolution Strategy: {status.resolution.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              <p className="text-[10px] opacity-80 leading-relaxed pl-5">
                {deadlockResolutionText[status.resolution]}
              </p>
              {onTriggerResolution && (
                <button
                  type="button"
                  onClick={onTriggerResolution}
                  className="mt-1.5 ml-5 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold bg-current/10 hover:bg-current/20 border border-current/20 transition-colors"
                >
                  {RESOLUTION_ICONS[status.resolution]}
                  Apply Resolution Now
                </button>
              )}
            </div>
          )}

          {/* "All clear" message */}
          {!isDeadlocked && (
            <div className="flex items-center gap-2 text-[11px] opacity-70">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                All four deadlock conditions are below threshold.
                The negotiation is progressing normally.
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

