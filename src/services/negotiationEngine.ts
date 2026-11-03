/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentConfig, NegotiationTurn, ScenarioTemplate, SettlementSummary } from '../types.ts';
import { amounts, evaluateCounteroffer } from './counterofferEvaluation.ts';

/**
 * Validates the scenario and agent configuration prior to starting negotiation.
 */
export function validateConfiguration(
  scenario: ScenarioTemplate,
  agents: AgentConfig[]
): {
  isValid: boolean;
  score: number;
  items: { id: string; label: string; passed: boolean; message: string; severity: 'info' | 'warning' | 'error' }[];
} {
  const items = [];

  // Check 1: Scenario Loaded
  const hasScenario = Boolean(scenario && scenario.id);
  items.push({
    id: 'scenario_selected',
    label: 'Scenario Selected',
    passed: hasScenario,
    message: hasScenario ? `Loaded template: "${scenario.title}"` : 'No valid scenario template selected.',
    severity: 'error' as const,
  });

  // Check 2: Minimum participating agents
  const hasMinAgents = agents.length >= 2;
  items.push({
    id: 'agents_count',
    label: 'Participating Agents Quorum',
    passed: hasMinAgents,
    message: hasMinAgents
      ? `${agents.length} participating agents initialized and mapped.`
      : 'At least 2 participating agents are required.',
    severity: 'error' as const,
  });

  // Check 3: All agents have personality assigned
  const validPersonalities = ['Aggressive', 'Collaborative', 'Risk-Averse'];
  const allPersonalitiesAssigned = agents.every((a) => validPersonalities.includes(a.personality));
  items.push({
    id: 'personalities_configured',
    label: 'Personality Matrix Configured',
    passed: allPersonalitiesAssigned,
    message: allPersonalitiesAssigned
      ? `All ${agents.length} agents configured (${agents.map((a) => `${a.name}: ${a.personality}`).join(', ')})`
      : 'One or more agents are missing a defined negotiation personality.',
    severity: 'error' as const,
  });

  // Check 4: Goals and Objectives present
  const allGoalsDefined = agents.every((a) => a.primaryGoal && a.primaryGoal.trim().length > 15);
  items.push({
    id: 'goals_defined',
    label: 'Primary Objectives & Metrics Specified',
    passed: allGoalsDefined,
    message: allGoalsDefined
      ? 'Clear, quantified primary objectives established for each role.'
      : 'One or more agents have incomplete or empty primary goals.',
    severity: 'warning' as const,
  });

  // Check 5: Constraints defined
  const allConstraintsDefined = agents.every((a) => a.keyConstraints && a.keyConstraints.length >= 2);
  items.push({
    id: 'constraints_defined',
    label: 'Negotiation Constraints & Walkaway Limits',
    passed: allConstraintsDefined,
    message: allConstraintsDefined
      ? `Total of ${agents.reduce((acc, a) => acc + a.keyConstraints.length, 0)} boundary constraints active across parties.`
      : 'Each agent must have at least 2 explicit boundary constraints defined.',
    severity: 'warning' as const,
  });

  // Check 6: Downstream Orchestrator Ready
  const orchestratorReady = Boolean(scenario.orchestrator && scenario.orchestrator.arbitrationRules.length > 0);
  items.push({
    id: 'orchestrator_ready',
    label: 'Orchestrator Protocol Verified',
    passed: orchestratorReady,
    message: orchestratorReady
      ? `Arbitration protocol ready: ${scenario.orchestrator.name} (${scenario.orchestrator.maxRounds} max rounds)`
      : 'Downstream orchestrator protocol is unconfigured.',
    severity: 'info' as const,
  });

  const passedCount = items.filter((i) => i.passed).length;
  const score = Math.round((passedCount / items.length) * 100);
  const isValid = items.every((i) => i.severity !== 'error' || i.passed);

  return {
    isValid,
    score,
    items,
  };
}

/**
 * Generates downstream negotiation dialogue round based on agent personalities,
 * goals, and constraints.
 */
export function generateTurnDialogue(
  scenario: ScenarioTemplate,
  agents: AgentConfig[],
  round: number,
  agentIndex: number,
  previousTurns: NegotiationTurn[]
): NegotiationTurn {
  const agent = agents[agentIndex];
  const isOrchestrator = false;

  // Tailored dialogues based on scenario and configured agent personalities
  if (scenario.id === 'vendor-pricing') {
    if (round === 1) {
      if (agent.id === 'buyer-procurement') {
        const personalityTone =
          agent.personality === 'Aggressive'
            ? 'We reviewed your ₹9,50,000 quote and frankly it is completely out of line with current market rates. Our hard cap is ₹7,50,000. If CloudScale cannot match that with Net-60 terms and a 99.99% uptime guarantee, we are authorized to begin phased migration to an alternative provider next week.'
            : agent.personality === 'Collaborative'
            ? 'Thank you for meeting Marcus. OmniTrans values our partnership with CloudScale, but our IT directive requires reducing our software spend. We are targeting ₹7,80,000 annually. In exchange, we are willing to commit to a 2-year engagement and serve as a public customer reference if you can meet us on pricing and SLA.'
            : 'From a fiscal risk standpoint, committing over ₹8,00,000 without downside protections is unacceptable to our audit committee. We must have Net-60 terms and strict penalty clauses for any SLA dips below 99.99%. Let us establish a conservative baseline around ₹7,70,000.';

        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText: personalityTone,
          offeredTerms: [
            { label: 'Proposed Price', value: agent.personality === 'Aggressive' ? '₹7,50,000/yr' : '₹7,80,000/yr' },
            { label: 'Payment Terms', value: 'Net-60' },
            { label: 'SLA Requirement', value: '99.99% Guarantee' },
          ],
          concessionNote: 'Opened with assertive anchor to gauge vendor flexibility.',
          sentiment: agent.personality === 'Aggressive' ? 'assertive' : 'collaborative',
          leverageScore: 78,
        };
      } else {
        // seller
        const personalityTone =
          agent.personality === 'Aggressive'
            ? 'Elena, OmniTrans executed over 40 million critical transactions on our infrastructure this quarter without a millisecond of disruption. Migrating to another vendor will incur ₹1,50,000 in consulting costs and significant downtime risk. Our renewal is ₹9,00,000 for a 3-year term, and that includes our new Predictive AI Suite.'
            : agent.personality === 'Collaborative'
            ? 'I hear your budgetary objectives, Elena. Let us find a package that satisfies your board while ensuring your engineering squads keep uninterrupted compute power. Our list price is ₹9,50,000, but on a 2-year agreement, I can bring it to ₹8,40,000 and include premium 24/7 dedicated engineering support at no extra charge.'
            : 'We cannot expose our business to an unsustainable price drop below ₹8,50,000 while maintaining dedicated infrastructure. However, to mitigate your risk, we can structure performance milestones and quarterly technical reviews, provided payments remain on Net-30.';

        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText: personalityTone,
          offeredTerms: [
            { label: 'Proposed Price', value: agent.personality === 'Aggressive' ? '₹9,00,000/yr' : '₹8,40,000/yr' },
            { label: 'Term Length', value: '3-Year Agreement' },
            { label: 'Add-ons', value: 'Predictive AI Suite Included' },
          ],
          concessionNote: 'Offered value add-on instead of pure cash discount.',
          sentiment: agent.personality === 'Aggressive' ? 'assertive' : 'collaborative',
          leverageScore: 72,
        };
      }
    } else if (round === 2) {
      if (agent.id === 'buyer-procurement') {
        const text =
          agent.personality === 'Aggressive'
            ? '₹9,00,000 is still above our walkaway threshold. We do not need the Predictive AI Suite if it keeps the price inflated. Drop the unnecessary bells and whistles and get the core infrastructure under ₹7,90,000, or we will table this discussion.'
            : agent.personality === 'Collaborative'
            ? 'The Predictive AI Suite is appealing, Marcus. What if we meet in the middle? We will agree to a 24-month commitment at ₹8,00,000/year, keeping the AI suite and Net-45 terms, with mutual termination if SLA drops below 99.98%.'
            : 'Our hard ceiling remains ₹8,00,000. If we accept Net-45 instead of Net-60, we must have ironclad SLA credit clauses in writing and an annual review clause after Year 1.';

        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText: text,
          offeredTerms: [
            { label: 'Counter Price', value: '₹8,00,000/yr' },
            { label: 'Term Commitment', value: '2-Year Agreement' },
            { label: 'Payment Terms', value: 'Net-45 Compromise' },
          ],
          concessionNote: 'Shifted payment terms from Net-60 to Net-45 in exchange for price cap.',
          sentiment: 'collaborative',
          leverageScore: 82,
        };
      } else {
        const text =
          agent.personality === 'Aggressive'
            ? 'I discussed this with our VP of Sales. The lowest we can possibly go is ₹8,20,000/year, provided you sign the 2-year agreement before end of month and agree to standard payment milestones.'
            : agent.personality === 'Collaborative'
            ? 'We have significant common ground, Elena. If you can do ₹8,10,000/year on a 2-year term with Net-45, I will personally guarantee executive sponsor priority and bundle the 99.99% enterprise SLA package without the normal surcharge.'
            : 'Under our risk guidelines, ₹8,15,000 is our absolute floor. At ₹8,15,000 with Net-45 and a 2-year term, we protect both parties from inflation and guarantee support continuity.';

        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText: text,
          offeredTerms: [
            { label: 'Revised Price', value: '₹8,10,000/yr' },
            { label: 'SLA Level', value: '99.99% Enterprise Included' },
            { label: 'Payment Terms', value: 'Net-45' },
          ],
          concessionNote: 'Vendor moved from ₹9,00,000 to ₹8,10,000, meeting near buyer boundary.',
          sentiment: 'collaborative',
          leverageScore: 80,
        };
      }
    } else {
      // Round 3 / Final Round
      if (agent.id === 'buyer-procurement') {
        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText:
            'OmniTrans can finalize at ₹8,00,000/year on a 2-year agreement, Net-45 terms, with the 99.99% SLA and dedicated CSM. This stays strictly within our approved budget ceiling while giving CloudScale multi-year revenue certainty.',
          offeredTerms: [
            { label: 'Final Price', value: '₹8,00,000/yr' },
            { label: 'Duration', value: '2 Years (₹16,00,000 Total)' },
            { label: 'SLA Guarantee', value: '99.99% with credits' },
          ],
          concessionNote: 'Final compromise offer aligned with procurement mandate.',
          sentiment: 'mediating',
          leverageScore: 88,
        };
      } else {
        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText:
            'Agreed, Elena. At ₹8,00,000 per year on a 2-year contract with Net-45 and enterprise SLA tier, we have a deal. I will send over the formal paperwork and initiate provisioning for your team immediately.',
          offeredTerms: [
            { label: 'Deal Status', value: 'ACCEPTED' },
            { label: 'Annual ARR', value: '₹8,00,000' },
            { label: 'Savings for Buyer', value: '₹1,50,000/yr vs list' },
          ],
          concessionNote: 'Full bilateral agreement achieved within mutual deal zone.',
          sentiment: 'collaborative',
          leverageScore: 90,
        };
      }
    }
  }

  if (scenario.id === 'job-offer') {
    if (round === 1) {
      if (agent.id === 'candidate-ai-lead') {
        const text =
          agent.personality === 'Aggressive'
            ? 'I have an active offer from an established tech lab offering ₹9,50,000 base and deep compute grants. To join Apex Robotics, I require a minimum of ₹9,20,000 base salary, ₹1,20,000 in equity grants, full remote flexibility, and dedicated GPU compute access for exploratory vision research.'
            : agent.personality === 'Collaborative'
            ? 'I am very excited about Apex’s robotics roadmap and team. While my competing offer has a high cash component, I value Apex’s mission. If we can reach ₹8,80,000 base salary with an attractive signing bonus and flexible remote arrangements, I am ready to commit.'
            : 'For me, stability and team autonomy are paramount. I need assurances on an ₹8,50,000 base floor, 3 days remote per week, and standard acceleration on my equity before considering moving from my current role.';

        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText: text,
          offeredTerms: [
            { label: 'Requested Base', value: '₹9,00,000 - ₹9,20,000' },
            { label: 'Remote Flexibility', value: 'Full Remote / 4 days WFH' },
            { label: 'Compute Allocation', value: 'Dedicated GPU Quota' },
          ],
          concessionNote: 'Stated key requirements anchored against competing lab offer.',
          sentiment: agent.personality === 'Aggressive' ? 'assertive' : 'collaborative',
          leverageScore: 80,
        };
      } else {
        const text =
          agent.personality === 'Aggressive'
            ? 'Zachary, our Level 6 engineering band is strictly calibrated across the entire engineering department. Our base salary cap is ₹8,20,000. However, we can compensate with ₹1,30,000 in high-growth equity and performance milestone bonuses.'
            : agent.personality === 'Collaborative'
            ? 'We respect your expertise and want you leading this stack, Zachary. While our salary band caps base compensation at ₹8,60,000 to maintain internal fairness with current staff, we can bridge the cash gap with a ₹40,000 upfront signing bonus and hybrid flexibility.'
            : 'We must adhere to our compensation committee guidelines: base salary cannot exceed ₹8,40,000. We also require at least 2 days a month on-site for real robot sensor calibrations. We can, however, offer accelerated 6-month equity vesting tranches.';

        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText: text,
          offeredTerms: [
            { label: 'Offered Base', value: '₹8,40,000' },
            { label: 'Signing Bonus', value: '₹40,000 One-time' },
            { label: 'Equity Grant', value: '₹1,30,000 / 4-yr' },
          ],
          concessionNote: 'Offered signing bonus to bridge gap without violating base band ceiling.',
          sentiment: 'collaborative',
          leverageScore: 76,
        };
      }
    } else {
      // Round 2/3
      if (agent.id === 'candidate-ai-lead') {
        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText:
            'I appreciate the signing bonus structure, Sarah. If we can lock in ₹8,70,000 base, a ₹50,000 signing bonus, 80% remote flexibility with quarterly hardware test weeks on-site, and dedicated GPU compute quota, I am thrilled to accept.',
          offeredTerms: [
            { label: 'Final Base Salary', value: '₹8,70,000' },
            { label: 'Signing Bonus', value: '₹50,000' },
            { label: 'Work Arrangement', value: 'Remote with quarterly on-sites' },
          ],
          concessionNote: 'Adjusted remote request to accommodate hardware testing needs.',
          sentiment: 'collaborative',
          leverageScore: 85,
        };
      } else {
        return {
          id: `turn-${round}-${agent.id}`,
          round,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentId: agent.id,
          agentName: agent.name,
          roleTitle: agent.roleTitle,
          personality: agent.personality,
          speechText:
            'That works within our band approvals! Base of ₹8,70,000, ₹50,000 signing bonus, ₹1,40,000 in equity grants, and priority access to our cluster. Welcome to Apex Robotics, Zachary!',
          offeredTerms: [
            { label: 'Offer Status', value: 'ACCEPTED' },
            { label: 'Total Year-1 Cash', value: '₹9,20,000' },
            { label: 'Equity Value', value: '₹1,40,000' },
          ],
          concessionNote: 'Full alignment reached within internal parity guidelines.',
          sentiment: 'collaborative',
          leverageScore: 92,
        };
      }
    }
  }

  // Budget Allocation Scenario (3 stakeholders)
  if (round === 1) {
    if (agent.id === 'product-lead') {
      return {
        id: `turn-${round}-${agent.id}`,
        round,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: agent.id,
        agentName: agent.name,
        roleTitle: agent.roleTitle,
        personality: agent.personality,
        speechText:
          'Product Innovation is requesting ₹8,50,000. Customer expectations for AI banking assistants are peaking, and delaying rollout will cost us millions in deposit acquisition. We must launch before Q4.',
        offeredTerms: [
          { label: 'Requested Budget', value: '₹8,50,000' },
          { label: 'Target Launch', value: 'Q3/Q4 Early Peak' },
        ],
        sentiment: 'assertive',
        leverageScore: 78,
      };
    } else if (agent.id === 'infra-lead') {
      return {
        id: `turn-${round}-${agent.id}`,
        round,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: agent.id,
        agentName: agent.name,
        roleTitle: agent.roleTitle,
        personality: agent.personality,
        speechText:
          'We cannot deploy generative AI on top of unhardened systems. Our SOC-2 Type II audit remediation is legally mandated and requires ₹2,50,000 minimum, plus ₹4,50,000 for multi-region database failover. Infrastructure requires ₹7,00,000.',
        offeredTerms: [
          { label: 'Requested Budget', value: '₹7,00,000' },
          { label: 'Compliance Non-Negotiable', value: '₹2,50,000 SOC-2' },
        ],
        sentiment: 'defensive',
        leverageScore: 75,
      };
    } else {
      // CFO
      return {
        id: `turn-${round}-${agent.id}`,
        round,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: agent.id,
        agentName: agent.name,
        roleTitle: agent.roleTitle,
        personality: agent.personality,
        speechText:
          'Your combined requests equal ₹15,50,000. Our absolute capex ceiling is ₹15,00,000, and I insist on keeping a ₹1,00,000 reserve buffer. Both teams need to find ₹1,50,000 in phased cuts, or the committee will mandate equal percentage cuts across both.',
        offeredTerms: [
          { label: 'Available Capex Pool', value: '₹14,00,000 max' },
          { label: 'Reserve Buffer', value: '₹1,00,000 mandatory' },
        ],
        sentiment: 'mediating',
        leverageScore: 90,
      };
    }
  } else {
    // Round 2/3 compromised allocations
    if (agent.id === 'product-lead') {
      return {
        id: `turn-${round}-${agent.id}`,
        round,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: agent.id,
        agentName: agent.name,
        roleTitle: agent.roleTitle,
        personality: agent.personality,
        speechText:
          'Product can phase our initiative: ₹7,50,000 for Q3/Q4 launch, deferring custom avatars to next fiscal year. This preserves our core conversational agent while freeing ₹1,00,000 for infrastructure compliance.',
        offeredTerms: [
          { label: 'Revised Product Budget', value: '₹7,50,000' },
          { label: 'Phasing', value: 'Avatars deferred to next FY' },
        ],
        sentiment: 'collaborative',
        leverageScore: 84,
      };
    } else if (agent.id === 'infra-lead') {
      return {
        id: `turn-${round}-${agent.id}`,
        round,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: agent.id,
        agentName: agent.name,
        roleTitle: agent.roleTitle,
        personality: agent.personality,
        speechText:
          'By utilizing 3-year reserved instances, Infrastructure can lower database migration costs to ₹4,00,000 while fully funding the ₹2,50,000 SOC-2 compliance audit. Our revised request is ₹6,50,000.',
        offeredTerms: [
          { label: 'Revised Infra Budget', value: '₹6,50,000' },
          { label: 'SOC-2 Compliance', value: '100% Protected' },
        ],
        sentiment: 'collaborative',
        leverageScore: 86,
      };
    } else {
      return {
        id: `turn-${round}-${agent.id}`,
        round,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: agent.id,
        agentName: agent.name,
        roleTitle: agent.roleTitle,
        personality: agent.personality,
        speechText:
          'Approved! ₹7,50,000 for Product Innovation and ₹6,50,000 for Infrastructure. Total allocation is exactly ₹14,00,000, leaving our ₹1,00,000 contingency reserve intact. Both projects proceed on phased tranches.',
        offeredTerms: [
          { label: 'Product Allocation', value: '₹7,50,000 (53.6%)' },
          { label: 'Infra Allocation', value: '₹6,50,000 (46.4%)' },
          { label: 'Reserve Buffer', value: '₹1,00,000 Preserved' },
        ],
        sentiment: 'mediating',
        leverageScore: 95,
      };
    }
  }

  // Fallback turn
  return {
    id: `turn-${round}-${agent.id}`,
    round,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    agentId: agent.id,
    agentName: agent.name,
    roleTitle: agent.roleTitle,
    personality: agent.personality,
    speechText: `As ${agent.roleTitle}, I propose structuring terms according to our ${agent.personality.toLowerCase()} stance, protecting our core constraints while working toward agreement.`,
    sentiment: 'collaborative',
    leverageScore: 75,
  };
}

/**
 * Generates an intelligent counter-response from an AI agent when the human user submits their own input.
 */
export function generateAIResponseToUserInput(
  scenario: ScenarioTemplate,
  agents: AgentConfig[],
  counterpartAgentId: string,
  userMessage: string,
  userTerms: { label: string; value: string }[] | undefined,
  currentRound: number,
  previousTurns: NegotiationTurn[]
): NegotiationTurn {
  const agent = agents.find((a) => a.id === counterpartAgentId) || agents[1] || agents[0];
  const userAgent = agents.find((a) => a.id !== agent.id) || agents[0];
  const p = agent.personality;
  const maxRounds = scenario.orchestrator.maxRounds;
  const isFinalRound = currentRound >= maxRounds;

  // 1. Extract numerical values and terms from user input
  const effectiveUserTerms: { label: string; value: string }[] = userTerms && userTerms.length > 0
    ? [...userTerms]
    : [];

  const rawUserAmounts = amounts(`${effectiveUserTerms.map((t) => `${t.label} ${t.value}`).join(' ')} ${userMessage}`);
  const userAmount = rawUserAmounts.length > 0 ? rawUserAmounts[0] : null;

  if (effectiveUserTerms.length === 0 && userAmount !== null) {
    effectiveUserTerms.push({ label: 'Proposed Amount', value: `₹${userAmount.toLocaleString('en-IN')}` });
  }

  // 2. Synthesize user turn for formal boundary & constraint evaluation
  const userTurn: NegotiationTurn = {
    id: `turn-user-eval-${Date.now()}`,
    round: currentRound,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    agentId: userAgent.id,
    agentName: userAgent.name,
    roleTitle: userAgent.roleTitle,
    personality: userAgent.personality,
    speechText: userMessage,
    offeredTerms: effectiveUserTerms.length > 0 ? effectiveUserTerms : undefined,
    sentiment: 'collaborative',
    leverageScore: 70,
  };

  const evalResult = evaluateCounteroffer(agent, userTurn, {
    round: currentRound,
    maxRounds,
    turns: previousTurns,
    scenarioId: scenario.id,
    isFinalRound,
  });

  // 3. Analyze previous context & human negotiation strategy
  const previousUserTurns = previousTurns.filter((t) => t.agentId === userAgent.id || t.agentName.includes('(You)'));
  const previousUserAmounts = previousUserTurns.flatMap((t) =>
    amounts(`${t.offeredTerms?.map((item) => item.value).join(' ') || ''} ${t.speechText}`)
  );
  const lastUserAmount = previousUserAmounts.length > 0 ? previousUserAmounts[previousUserAmounts.length - 1] : null;

  // Repetition / stall check
  let isRepeating = false;
  if (userAmount !== null && lastUserAmount !== null && userAmount === lastUserAmount && previousUserTurns.length >= 1) {
    isRepeating = true;
  }

  // Backtracking check
  let isBacktracking = false;
  const isCostMinimizer = /buyer|procurement|cfo/i.test(`${userAgent.id} ${userAgent.roleTitle}`);
  if (userAmount !== null && lastUserAmount !== null && userAmount !== lastUserAmount) {
    if (isCostMinimizer && userAmount < lastUserAmount) {
      isBacktracking = true; // Buyer lowered offer
    } else if (!isCostMinimizer && userAmount > lastUserAmount) {
      isBacktracking = true; // Seller/candidate raised asking price
    }
  }

  // Strategy detection from language and concessions
  const lowerMsg = userMessage.toLowerCase();
  const hasAcceptIntent = /accept|agree|deal|done|close|finalize|sign|settle/i.test(lowerMsg);
  const isCooperative = /cooperat|collaborat|win-win|middle|compromise|flexib|mutual|partner|work together|fair|share/i.test(lowerMsg);
  const isAggressive = /must|take it or leave it|non-negotiable|final offer|walk away|unacceptable|demand|refuse|or else|hard line|insist/i.test(lowerMsg);
  const hasGrossViolation = evalResult.signals.some((s) => s.state === 'violated');
  const isUnreasonable = hasGrossViolation || evalResult.score < 35;

  let decision: 'accept' | 'counter' | 'reject' = evalResult.decision;
  if (hasAcceptIntent && !hasGrossViolation && evalResult.score >= 50) {
    decision = 'accept';
  } else if (isFinalRound && (hasGrossViolation || evalResult.score < 60)) {
    decision = 'reject';
  } else if (!isFinalRound && decision === 'reject') {
    decision = 'counter';
  }

  let responseSpeech = '';
  let counterTerms: { label: string; value: string }[] = [];
  let concessionNote = '';
  let sentiment: 'assertive' | 'collaborative' | 'defensive' | 'mediating' = 'collaborative';
  let leverageScore = 75;

  // 4. Scenario & Role Tailored Generation
  if (scenario.id === 'vendor-pricing') {
    const isVendor = /seller|supplier|vendor/i.test(`${agent.id} ${agent.roleTitle}`);
    if (isVendor) {
      // AI IS VENDOR
      if (decision === 'accept') {
        sentiment = 'collaborative';
        leverageScore = 90;
        concessionNote = 'Mutually acceptable agreement reached on price floor and multi-year commitment.';
        responseSpeech = `Thank you for working constructively with CloudScale. At ₹${(userAmount || 800000).toLocaleString('en-IN')}/year on a 2-year contract with enterprise support and Net-45 terms, we have reached full alignment. I am confirming our agreement.`;
        counterTerms = [
          { label: 'Agreed ARR', value: `₹${(userAmount || 800000).toLocaleString('en-IN')}/yr` },
          { label: 'Contract Term', value: '2 Years' },
          { label: 'Warranty & Support', value: '1-Year Enterprise Warranty' },
          { label: 'Deal Status', value: 'ACCEPTED' },
        ];
      } else if (decision === 'reject') {
        sentiment = 'assertive';
        leverageScore = 65;
        concessionNote = 'Offer rejected due to margin floor violation at deadline.';
        responseSpeech = `Our minimum viable operational floor is ₹8,00,000. Your offer of ₹${(userAmount || 0).toLocaleString('en-IN')} falls below our non-negotiable cost baseline. As we have reached the round limit without resolving this boundary, we must respectfully decline.`;
        counterTerms = [
          { label: 'Status', value: 'REJECTED' },
          { label: 'Reason', value: 'Below ₹8,00,000 margin floor' },
        ];
      } else {
        // Counter
        if (isUnreasonable) {
          sentiment = 'assertive';
          leverageScore = 82;
          concessionNote = 'Holding firm on ₹8,00,000 floor against unreasonable down-pricing.';
          responseSpeech = `Your proposed rate of ₹${(userAmount || 0).toLocaleString('en-IN')} is significantly below our non-negotiable floor of ₹8,00,000. At that level, enterprise infrastructure cannot be sustained. If you can meet our baseline at ₹8,20,000 on a 2-year term, we will bundle premium support and 99.99% uptime SLA.`;
          counterTerms = [
            { label: 'Revised Price', value: '₹8,20,000/yr' },
            { label: 'Term Length', value: '2-Year Agreement' },
            { label: 'Support SLA', value: '99.99% Premium Support' },
          ];
        } else if (isRepeating) {
          sentiment = 'defensive';
          leverageScore = 78;
          concessionNote = 'Cautioning against deadlock on repeated unchanged price.';
          responseSpeech = `You have maintained the same proposal of ₹${(userAmount || 800000).toLocaleString('en-IN')} across multiple exchanges. Without movement from both sides, this negotiation risks reaching an impasse. In the spirit of closing, we can move to ₹8,10,000 if paired with Net-45 terms.`;
          counterTerms = [
            { label: 'Bridging Price', value: '₹8,10,000/yr' },
            { label: 'Payment Terms', value: 'Net-45' },
            { label: 'Contract Term', value: '2 Years' },
          ];
        } else if (isBacktracking) {
          sentiment = 'assertive';
          leverageScore = 80;
          concessionNote = 'Calling out backward step in procurement proposal.';
          responseSpeech = `We noticed your revised position of ₹${(userAmount || 0).toLocaleString('en-IN')} steps back from your previous offer of ₹${lastUserAmount?.toLocaleString('en-IN')}. To maintain momentum towards a final agreement in Round ${currentRound}, we need consistent forward progress.`;
          counterTerms = [
            { label: 'Firm Anchor', value: '₹8,25,000/yr' },
            { label: 'Term Length', value: '2 Years' },
          ];
        } else if (isAggressive) {
          sentiment = 'assertive';
          leverageScore = 85;
          concessionNote = 'Pushing back assertively against aggressive procurement pressure.';
          responseSpeech = `CloudScale infrastructure processed 40 million transactions for OmniTrans this quarter without failure. We cannot accept your demand of ₹${(userAmount || 0).toLocaleString('en-IN')}, which cuts below our operational floor of ₹8,00,000. Our counter-proposal is ₹8,25,000/year for a 2-year commitment, which already represents a significant discount off our standard list rate.`;
          counterTerms = [
            { label: 'Proposed Price', value: '₹8,25,000/yr' },
            { label: 'Term Length', value: '24 Months' },
            { label: 'Support SLA', value: 'Enterprise Support' },
          ];
        } else {
          // Cooperative / Standard
          sentiment = 'collaborative';
          leverageScore = 80;
          concessionNote = 'Reciprocating cooperative move with a balanced price bridge.';
          responseSpeech = `We appreciate your collaborative approach. In Round ${currentRound}, we are prepared to meet you in the middle at ₹8,10,000/year on a 2-year agreement, bundling our Predictive AI Suite and full 1-year warranty.`;
          counterTerms = [
            { label: 'Compromise Price', value: '₹8,10,000/yr' },
            { label: 'Contract Duration', value: '2 Years' },
            { label: 'Included Value', value: 'Predictive AI Suite + 1-Yr Warranty' },
          ];
        }
      }
    } else {
      // AI IS BUYER (Procurement Manager)
      if (decision === 'accept') {
        sentiment = 'collaborative';
        leverageScore = 88;
        concessionNote = 'Approved: proposal meets procurement budget cap and warranty requirements.';
        responseSpeech = `OmniTrans Procurement approves these terms. At ₹${(userAmount || 800000).toLocaleString('en-IN')}/year with mandatory warranty and 2-year continuity, our audit requirements are satisfied. We have an agreement.`;
        counterTerms = [
          { label: 'Agreed Price', value: `₹${(userAmount || 800000).toLocaleString('en-IN')}/yr` },
          { label: 'Duration', value: '2 Years' },
          { label: 'Warranty & Support', value: '1 Year Full Coverage' },
          { label: 'Deal Status', value: 'ACCEPTED' },
        ];
      } else if (decision === 'reject') {
        sentiment = 'assertive';
        leverageScore = 65;
        concessionNote = 'Rejected: offer exceeds procurement ceiling at round limit.';
        responseSpeech = `Our board has established an absolute budget cap of ₹8,00,000. Your proposal of ₹${(userAmount || 0).toLocaleString('en-IN')} exceeds our spending mandate. As we have reached the round limit, we must conclude without agreement.`;
        counterTerms = [
          { label: 'Status', value: 'REJECTED' },
          { label: 'Reason', value: 'Exceeds ₹8,00,000 budget cap' },
        ];
      } else {
        if (isUnreasonable) {
          sentiment = 'assertive';
          leverageScore = 82;
          concessionNote = 'Defending strict ₹8,00,000 budget ceiling against inflated vendor quote.';
          responseSpeech = `A renewal quote of ₹${(userAmount || 0).toLocaleString('en-IN')} is completely outside our fiscal parameters. Our approved budget ceiling is ₹8,00,000 with mandatory warranty. If you cannot meet our cap, we will be forced to transition secondary workloads to alternative vendors.`;
          counterTerms = [
            { label: 'Budget Cap', value: '₹8,00,000/yr' },
            { label: 'Warranty Requirement', value: 'Mandatory 1 Year' },
            { label: 'Payment Terms', value: 'Net-60' },
          ];
        } else if (isRepeating) {
          sentiment = 'defensive';
          leverageScore = 78;
          concessionNote = 'Noting vendor price stagnation and demanding reciprocal movement.';
          responseSpeech = `You have held firm on ₹${(userAmount || 800000).toLocaleString('en-IN')} without making a meaningful concession. To prevent this negotiation from stalling into deadlock, we can offer Net-45 payment terms if you bring the annual rate to ₹7,90,000.`;
          counterTerms = [
            { label: 'Counter Price', value: '₹7,90,000/yr' },
            { label: 'Payment Cadence', value: 'Net-45' },
          ];
        } else if (isAggressive) {
          sentiment = 'assertive';
          leverageScore = 80;
          concessionNote = 'Holding firm against vendor aggressive pricing stance.';
          responseSpeech = `We cannot be pressured into exceeding our approved fiscal limits. Our cap is ₹8,00,000 with mandatory 1-year warranty and enterprise SLA credits. That is our position.`;
          counterTerms = [
            { label: 'Budget Cap', value: '₹8,00,000/yr' },
            { label: 'Warranty Requirement', value: '1 Year Mandatory' },
          ];
        } else {
          sentiment = 'collaborative';
          leverageScore = 80;
          concessionNote = 'Offering 2-year commitment in exchange for matching price ceiling.';
          responseSpeech = `Thank you for the revised proposal. We want to maintain our partnership with CloudScale. If you can meet us at ₹8,00,000/year, we will agree to a 24-month commitment with Net-45 payment terms and mandatory warranty coverage.`;
          counterTerms = [
            { label: 'Target Price', value: '₹8,00,000/yr' },
            { label: 'Commitment', value: '2-Year Agreement' },
            { label: 'Warranty', value: '1 Year Included' },
          ];
        }
      }
    }
  } else if (scenario.id === 'job-offer') {
    const isRecruiter = /recruiter|employer|vp/i.test(`${agent.id} ${agent.roleTitle}`);
    if (isRecruiter) {
      // AI IS RECRUITER
      if (decision === 'accept') {
        sentiment = 'collaborative';
        leverageScore = 90;
        concessionNote = 'Offer accepted: candidate package within approved department band.';
        responseSpeech = `We are thrilled to welcome you to Apex Robotics! A base salary of ₹${(userAmount || 860000).toLocaleString('en-IN')} paired with signing bonus and remote flexibility aligns perfectly with our team. We are formalizing the offer letter now.`;
        counterTerms = [
          { label: 'Agreed Base Salary', value: `₹${(userAmount || 860000).toLocaleString('en-IN')}` },
          { label: 'Signing Bonus', value: '₹40,000 Upfront' },
          { label: 'Work Arrangement', value: 'Hybrid (2 Days WFH)' },
          { label: 'Offer Status', value: 'ACCEPTED' },
        ];
      } else if (decision === 'reject') {
        sentiment = 'assertive';
        leverageScore = 65;
        concessionNote = 'Rejected: compensation demand exceeds corporate salary band ceiling.';
        responseSpeech = `Our Grade L6 engineering band strictly caps base salary at ₹9,00,000 to maintain internal equity. Your requested package of ₹${(userAmount || 0).toLocaleString('en-IN')} exceeds what we can approve. At the round deadline, we must withdraw.`;
        counterTerms = [
          { label: 'Status', value: 'REJECTED' },
          { label: 'Reason', value: 'Exceeds ₹9,00,000 band cap' },
        ];
      } else {
        if (isUnreasonable) {
          sentiment = 'assertive';
          leverageScore = 80;
          concessionNote = 'Protecting salary band parity while offering non-base incentives.';
          responseSpeech = `We recognize your exceptional skill set, but ₹${(userAmount || 0).toLocaleString('en-IN')} exceeds our engineering salary band ceiling of ₹9,00,000. To bridge the cash difference without distorting team parity, we can offer ₹8,60,000 base with an upfront ₹50,000 signing bonus and 3 days remote flexibility.`;
          counterTerms = [
            { label: 'Base Salary Cap', value: '₹8,60,000' },
            { label: 'Signing Bonus', value: '₹50,000 Upfront' },
            { label: 'Work Model', value: 'Hybrid (3 Days WFH)' },
          ];
        } else if (isRepeating) {
          sentiment = 'defensive';
          leverageScore = 76;
          concessionNote = 'Addressing repeated candidate anchor with equity and bonus sweetener.';
          responseSpeech = `You have reiterated your ask of ₹${(userAmount || 900000).toLocaleString('en-IN')}. While we cannot breach the base cap, we can enhance the total Year-1 package to exceed your target by increasing the equity grant to ₹1,40,000.`;
          counterTerms = [
            { label: 'Base Salary', value: '₹8,70,000' },
            { label: 'Signing Bonus', value: '₹40,000' },
            { label: 'Equity Grant', value: '₹1,40,000 / 4-yr' },
          ];
        } else {
          sentiment = 'collaborative';
          leverageScore = 82;
          concessionNote = 'Balancing candidate salary goals with company remote flexibility guidelines.';
          responseSpeech = `Thank you for the thoughtful proposal. In Round ${currentRound}, we can offer ₹8,60,000 base with a ₹40,000 signing bonus and 3 days remote flexibility per week, plus full compute cluster access for your research.`;
          counterTerms = [
            { label: 'Offered Base', value: '₹8,60,000' },
            { label: 'Signing Bonus', value: '₹40,000' },
            { label: 'Work Model', value: '3 Days Remote' },
          ];
        }
      }
    } else {
      // AI IS CANDIDATE
      if (decision === 'accept') {
        sentiment = 'collaborative';
        leverageScore = 90;
        concessionNote = 'Accepted: offer fulfills compensation expectations and remote flexibility.';
        responseSpeech = `I appreciate your partnership and flexibility. A package of ₹${(userAmount || 900000).toLocaleString('en-IN')} with remote flexibility and research compute quota meets my career objectives. I am excited to accept and join Apex Robotics!`;
        counterTerms = [
          { label: 'Total Package', value: `₹${(userAmount || 900000).toLocaleString('en-IN')}` },
          { label: 'Work Arrangement', value: 'Remote with quarterly on-site' },
          { label: 'Offer Status', value: 'ACCEPTED' },
        ];
      } else if (decision === 'reject') {
        sentiment = 'assertive';
        leverageScore = 65;
        concessionNote = 'Rejected: compensation offer falls short of minimum viable floor.';
        responseSpeech = `An offer of ₹${(userAmount || 0).toLocaleString('en-IN')} falls significantly short of my competing opportunities and minimum career threshold of ₹9,00,000. As we have reached the round limit without alignment, I must respectfully decline.`;
        counterTerms = [
          { label: 'Status', value: 'REJECTED' },
          { label: 'Reason', value: 'Below ₹9,00,000 floor' },
        ];
      } else {
        if (isUnreasonable) {
          sentiment = 'assertive';
          leverageScore = 80;
          concessionNote = 'Declining below-market offer while reiterating competing lab leverage.';
          responseSpeech = `A base offer of ₹${(userAmount || 0).toLocaleString('en-IN')} is below my competing market offers. Given my specialized expertise in model engineering, I can only consider joining Apex if total Year-1 compensation reaches at least ₹9,00,000, combined with remote work flexibility.`;
          counterTerms = [
            { label: 'Target Base', value: '₹8,80,000' },
            { label: 'Signing Bonus', value: '₹40,000' },
            { label: 'Remote Flexibility', value: 'Full Remote / 4 Days WFH' },
          ];
        } else {
          sentiment = 'collaborative';
          leverageScore = 82;
          concessionNote = 'Showing willingness to trade cash for equity and remote flexibility.';
          responseSpeech = `I appreciate the offer. If we can adjust the package to ₹8,70,000 base with a ₹50,000 signing bonus and 80% remote flexibility with quarterly hardware test weeks on-site, I am ready to commit today.`;
          counterTerms = [
            { label: 'Requested Base', value: '₹8,70,000' },
            { label: 'Signing Bonus', value: '₹50,000' },
            { label: 'Work Arrangement', value: '80% Remote' },
          ];
        }
      }
    }
  } else {
    // SCENARIO 3: BUDGET ALLOCATION
    const isCFO = /cfo|finance|chair/i.test(`${agent.id} ${agent.roleTitle}`);
    const isProduct = /product/i.test(`${agent.id} ${agent.roleTitle}`);
    const isInfra = /infra|security/i.test(`${agent.id} ${agent.roleTitle}`);

    if (isCFO) {
      if (decision === 'accept') {
        sentiment = 'mediating';
        leverageScore = 95;
        concessionNote = 'Capital expenditure allocation approved within corporate fiscal boundaries.';
        responseSpeech = `The Corporate Budget Committee decrees approval for this allocation. Total expenditure is contained within ₹14,00,000, preserving our mandatory ₹1,00,000 reserve buffer. Both initiatives proceed on phased milestone disbursements.`;
        counterTerms = [
          { label: 'Total Capex', value: '₹14,00,000' },
          { label: 'Reserve Buffer', value: '₹1,00,000 Preserved' },
          { label: 'Disbursement', value: '50% Upfront, 50% Post-Q3' },
          { label: 'Committee Status', value: 'APPROVED' },
        ];
      } else if (decision === 'reject') {
        sentiment = 'assertive';
        leverageScore = 65;
        concessionNote = 'Rejected: combined department requests exceed board-mandated capex ceiling.';
        responseSpeech = `The combined request of ₹${(userAmount || 0).toLocaleString('en-IN')} exceeds our absolute board ceiling of ₹15,00,000. Because the teams have not identified necessary synergies at the round deadline, the committee must reject this request.`;
        counterTerms = [
          { label: 'Status', value: 'REJECTED' },
          { label: 'Reason', value: 'Exceeds ₹15,00,000 ceiling' },
        ];
      } else {
        if (isUnreasonable) {
          sentiment = 'assertive';
          leverageScore = 85;
          concessionNote = 'Enforcing strict ₹14,00,000 capex pool and mandatory ₹1,00,000 buffer.';
          responseSpeech = `Your requested allocation of ₹${(userAmount || 0).toLocaleString('en-IN')} leaves insufficient buffer for corporate solvency. The maximum available pool is ₹14,00,000 total. Product Innovation must cap at ₹7,50,000 and Infrastructure at ₹6,50,000. Both departments must phase non-critical features.`;
          counterTerms = [
            { label: 'Capex Pool Cap', value: '₹14,00,000' },
            { label: 'Reserve Requirement', value: '₹1,00,000 Mandatory' },
            { label: 'Structure', value: 'Phased Tranches' },
          ];
        } else {
          sentiment = 'collaborative';
          leverageScore = 88;
          concessionNote = 'Proposing balanced allocation with phased tranches.';
          responseSpeech = `Thank you for reviewing your department requirements. In Round ${currentRound}, we propose authorizing ₹7,50,000 for Product Innovation and ₹6,50,000 for Infrastructure, with 50% disbursed upfront and 50% unlocked upon Q3 audit completion.`;
          counterTerms = [
            { label: 'Product Allocation', value: '₹7,50,000' },
            { label: 'Infra Allocation', value: '₹6,50,000' },
            { label: 'Reserve Buffer', value: '₹1,00,000 Intact' },
          ];
        }
      }
    } else if (isProduct) {
      if (decision === 'accept') {
        sentiment = 'collaborative';
        responseSpeech = `Product Innovation agrees! With ₹${(userAmount || 750000).toLocaleString('en-IN')}, we can hit our Q4 conversational banking launch on schedule while keeping design partners onboard.`;
        counterTerms = [
          { label: 'Product Budget', value: `₹${(userAmount || 750000).toLocaleString('en-IN')}` },
          { label: 'Launch Window', value: 'Q4 Consumer Peak' },
          { label: 'Status', value: 'ACCEPTED' },
        ];
      } else {
        sentiment = 'assertive';
        responseSpeech = `We require at least ₹7,50,000 to launch our generative banking assistant on time. Below ₹6,50,000, we would be forced to cancel core contractor squads. We can phase custom avatars to next fiscal year if we secure ₹7,50,000 today.`;
        counterTerms = [
          { label: 'Required Allocation', value: '₹7,50,000' },
          { label: 'Phasing', value: 'Avatars deferred to next FY' },
        ];
      }
    } else {
      // Infra Lead
      if (decision === 'accept') {
        sentiment = 'collaborative';
        responseSpeech = `Infrastructure accepts! An allocation of ₹${(userAmount || 650000).toLocaleString('en-IN')} fully secures our mandatory SOC-2 Type II audit remediation and multi-region database failover.`;
        counterTerms = [
          { label: 'Infra Budget', value: `₹${(userAmount || 650000).toLocaleString('en-IN')}` },
          { label: 'SOC-2 Audit', value: '100% Protected' },
          { label: 'Status', value: 'ACCEPTED' },
        ];
      } else {
        sentiment = 'defensive';
        responseSpeech = `Our SOC-2 audit remediation requires ₹2,50,000 legally by November. With database clustering, our absolute operational floor is ₹5,50,000. By leveraging 3-year reserved cloud instances, we can reduce our request from ₹7,00,000 to ₹6,50,000.`;
        counterTerms = [
          { label: 'Revised Infra Request', value: '₹6,50,000' },
          { label: 'SOC-2 Compliance', value: '₹2,50,000 Protected' },
        ];
      }
    }
  }

  return {
    id: `turn-${currentRound}-${agent.id}-${Date.now()}`,
    round: currentRound,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    agentId: agent.id,
    agentName: agent.name,
    roleTitle: agent.roleTitle,
    personality: agent.personality,
    speechText: responseSpeech,
    offeredTerms: counterTerms,
    concessionNote,
    sentiment,
    leverageScore,
    decision,
    decisionRationale: evalResult.decisionRationale,
    evaluationScore: evalResult.score,
    respondingToTurnId: previousTurns.length > 0 ? previousTurns[previousTurns.length - 1].id : undefined,
  };
}

/**
 * Generates final settlement terms and constraint compliance verification.
 */
export function generateSettlementSummary(
  scenario: ScenarioTemplate,
  agents: AgentConfig[]
): SettlementSummary {
  if (scenario.id === 'vendor-pricing') {
    return {
      status: 'settled',
      title: 'Bilateral SaaS Enterprise Renewal Agreement Executed',
      agreementScore: 94,
      keyTerms: [
        { term: 'Annual Contract Value', agreedValue: '₹8,00,000 / year (Total ₹16,00,000)', satisfaction: 'High' },
        { term: 'Contract Duration', agreedValue: '2 Years with Annual Review Clause', satisfaction: 'High' },
        { term: 'Service Level Agreement', agreedValue: '99.99% Availability with Penalty Rebates', satisfaction: 'High' },
        { term: 'Payment Cadence', agreedValue: 'Net-45 Invoicing', satisfaction: 'Acceptable' },
        { term: 'Included Enterprise Value', agreedValue: 'Dedicated CSM + 2 Years Warranty', satisfaction: 'High' },
      ],
      constraintCompliance: [
        {
          agentName: agents[0]?.name || 'Elena Rostova',
          compliant: true,
          notes: 'Met budget cap (₹8,00,000 ≤ ₹8,00,000 ceiling), secured 99.99% SLA and warranty.',
        },
        {
          agentName: agents[1]?.name || 'Marcus Vance',
          compliant: true,
          notes: 'Preserved ARR at ₹8,00,000 floor, secured 2-year commitment, bundled premium tier.',
        },
      ],
      executiveSummary:
        'The Orchestrator concluded a successful 2-year enterprise agreement at ₹8,00,000/yr. Procurement realized ₹1,50,000 in recurring annual savings vs list, while CloudScale locked in ₹16,00,000 total contract value with high retention certainty.',
    };
  }

  if (scenario.id === 'job-offer') {
    return {
      status: 'settled',
      title: 'Senior Staff AI Engineer Employment Package Finalized',
      agreementScore: 96,
      keyTerms: [
        { term: 'Base Annual Salary', agreedValue: '₹8,70,000 / year', satisfaction: 'High' },
        { term: 'Upfront Signing Bonus', agreedValue: '₹50,000 lump sum', satisfaction: 'High' },
        { term: 'Equity (RSUs)', agreedValue: '₹1,40,000 grant over 4-year schedule', satisfaction: 'High' },
        { term: 'Work Model', agreedValue: '80% Remote with quarterly on-site hardware test weeks', satisfaction: 'High' },
        { term: 'Research Compute Grant', agreedValue: 'Priority GPU cluster access', satisfaction: 'High' },
      ],
      constraintCompliance: [
        {
          agentName: agents[0]?.name || 'Dr. Zachary Chen',
          compliant: true,
          notes: 'Total Year-1 compensation reaches ₹9,20,000 cash + equity, compute resources guaranteed, remote flexibility granted.',
        },
        {
          agentName: agents[1]?.name || 'Sarah Jenkins',
          compliant: true,
          notes: 'Base salary (₹8,70,000) stayed strictly within compensation band (₹7,00,000 - ₹9,00,000), signing bonus within budget.',
        },
      ],
      executiveSummary:
        'Apex Robotics successfully closed the candidate by bridging the cash gap via a ₹50,000 signing bonus and compute guarantees while keeping base pay within Grade L6 equity constraints.',
    };
  }

  // Budget Allocation
  return {
    status: 'settled',
    title: 'Tripartite Capital Expenditure Allocation Decreed',
    agreementScore: 92,
    keyTerms: [
      { term: 'Product Innovation Allocation', agreedValue: '₹7,50,000 (Phase 1 AI & Mobile)', satisfaction: 'Acceptable' },
      { term: 'Infrastructure & Security Allocation', agreedValue: '₹6,50,000 (SOC-2 Audit + Multi-Region)', satisfaction: 'High' },
      { term: 'Total Disbursed Capex', agreedValue: '₹14,00,000 (Within ₹15,00,000 cap)', satisfaction: 'High' },
      { term: 'Corporate Contingency Reserve', agreedValue: '₹1,00,000 Unallocated Safety Buffer', satisfaction: 'High' },
      { term: 'Disbursement Structure', agreedValue: 'Two milestone tranches contingent on Q3 audit', satisfaction: 'Acceptable' },
    ],
    constraintCompliance: [
      {
        agentName: agents[0]?.name || 'Jordan Rivera',
        compliant: true,
        notes: 'Secured ₹7,50,000 (above ₹6,50,000 operational viability floor) to deploy conversational AI on time.',
      },
      {
        agentName: agents[1]?.name || 'Devon Takahashi',
        compliant: true,
        notes: 'Guaranteed 100% of ₹2,50,000 required for regulatory SOC-2 compliance plus reserved database instances.',
      },
      {
        agentName: agents[2]?.name || 'Claire Kensington',
        compliant: true,
        notes: 'Maintained total expenditure under ₹14,00,000 and preserved ₹1,00,000 contingency buffer.',
      },
    ],
    executiveSummary:
      'The Corporate Budget Committee successfully balanced competitive innovation with mission-critical compliance, staying ₹1,00,000 under the board ceiling of ₹15,00,000.',
  };
}
