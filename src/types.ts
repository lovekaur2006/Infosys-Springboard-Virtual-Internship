/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PersonalityType = 'Aggressive' | 'Collaborative' | 'Risk-Averse';

export interface PersonalityDefinition {
  type: PersonalityType;
  title: string;
  tagline: string;
  badgeColor: string;
  borderColor: string;
  bgLight: string;
  textColor: string;
  description: string;
  tactics: string[];
  riskTolerance: 'Low' | 'Medium' | 'High';
  compromiseSpeed: 'Immediate' | 'Moderate' | 'Reluctant';
}

export interface AgentConfig {
  id: string;
  name: string;
  roleTitle: string;
  organization: string;
  avatarIcon: string;
  themeColor: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo';
  roleDescription: string;
  primaryGoal: string;
  targetMetric: string;
  keyConstraints: string[];
  personality: PersonalityType;
  tacticalNotes: string;
  openingStance?: string;
}

export interface OrchestratorConfig {
  name: string;
  roleTitle: string;
  description: string;
  arbitrationRules: string[];
  maxRounds: number;
  deadlockConfig?: Partial<DeadlockConfig>;
}

export interface DeadlockConfig {
  /** Number of unchanged proposals before the mediator intervenes. */
  unchangedOfferLimit: number;
  /** Number of similar rejected proposals before the mediator intervenes. */
  repeatedRejectionLimit: number;
  /** Number of times a role may return to an earlier position. */
  repeatedPositionLimit: number;
}

export type DeadlockReason =
  | 'no_meaningful_offer_change'
  | 'repeated_rejection'
  | 'repeated_position'
  | 'maximum_rounds_reached';

export type DeadlockResolution = 'none' | 'compromise_proposal' | 'modify_stance' | 'final_round' | 'breakdown';

export interface DeadlockStatus {
  isDeadlocked: boolean;
  reasons: DeadlockReason[];
  reasonText: string;
  resolution: DeadlockResolution;
  resolutionAttempts: number;
}

export interface ScenarioTemplate {
  id: string;
  title: string;
  badge: string;
  category: 'Enterprise Sales' | 'Talent & HR' | 'Corporate Finance';
  shortDescription: string;
  detailedContext: string;
  stakeholdersCount: number;
  estimatedRounds: number;
  complexity: 'Moderate' | 'High' | 'Expert';
  orchestrator: OrchestratorConfig;
  defaultAgents: AgentConfig[];
  dealZoneSummary: {
    batnaBuyer: string;
    batnaSeller: string;
    targetOverlaps: string;
  };
  participatingAgentsText?: string;
  agentRolesText?: string;
  keyGoalsText?: string;
  constraintsText?: string;
  accentColor?: 'blue' | 'purple' | 'emerald';
}

export interface ValidationItem {
  id: string;
  label: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  items: ValidationItem[];
}

export interface NegotiationTurn {
  id: string;
  round: number;
  timestamp: string;
  agentId: string;
  agentName: string;
  roleTitle: string;
  personality: PersonalityType;
  speechText: string;
  offeredTerms?: {
    label: string;
    value: string;
  }[];
  concessionNote?: string;
  sentiment: 'assertive' | 'collaborative' | 'defensive' | 'mediating';
  leverageScore: number; // 0 - 100
  decision?: 'opening' | 'accept' | 'counter' | 'reject';
  decisionRationale?: string;
  evaluationScore?: number;
  respondingToTurnId?: string;
}

export interface SettlementSummary {
  status: 'settled' | 'impasse';
  title: string;
  agreementScore: number; // 0 - 100
  keyTerms: {
    term: string;
    agreedValue: string;
    satisfaction: 'High' | 'Acceptable' | 'Compromised';
  }[];
  constraintCompliance: {
    agentName: string;
    compliant: boolean;
    notes: string;
  }[];
  executiveSummary: string;
}
