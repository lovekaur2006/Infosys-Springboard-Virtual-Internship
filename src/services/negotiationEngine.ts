/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentConfig, NegotiationTurn, ScenarioTemplate, SettlementSummary } from '../types.ts';

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
            ? 'We reviewed your $225k quote and frankly it is completely out of line with current market rates. Our hard cap is $170k. If CloudScale cannot match that with Net-60 terms and a 99.99% uptime guarantee, we are authorized to begin phased migration to DataPeak next week.'
            : agent.personality === 'Collaborative'
            ? 'Thank you for meeting Marcus. OmniTrans values our partnership with CloudScale, but our IT directive requires reducing our software spend. We are targeting $175k annually. In exchange, we are willing to commit to a 2-year engagement and serve as a public customer reference if you can meet us on pricing and SLA.'
            : 'From a fiscal risk standpoint, committing over $185k without downside protections is unacceptable to our audit committee. We must have Net-60 terms and strict penalty clauses for any SLA dips below 99.99%. Let us establish a conservative baseline around $178k.';

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
            { label: 'Proposed Price', value: agent.personality === 'Aggressive' ? '$170,000/yr' : '$175,000/yr' },
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
            ? 'Elena, OmniTrans executed over 40 million critical transactions on our infrastructure this quarter without a millisecond of disruption. Migrating to DataPeak will incur $60k in consulting costs and significant downtime risk. Our renewal is $215k for a 3-year term, and that includes our new Predictive AI Suite.'
            : agent.personality === 'Collaborative'
            ? 'I hear your budgetary objectives, Elena. Let us find a package that satisfies your board while ensuring your engineering squads keep uninterrupted compute power. Our list price is $225k, but on a 2-year agreement, I can bring it to $198k and include premium 24/7 dedicated engineering support at no extra charge.'
            : 'We cannot expose our business to an unsustainable price drop below $205k while maintaining dedicated infrastructure. However, to mitigate your risk, we can structure performance milestones and quarterly technical reviews, provided payments remain on Net-30.';

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
            { label: 'Proposed Price', value: agent.personality === 'Aggressive' ? '$215,000/yr' : '$198,000/yr' },
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
            ? '$215k is still above our walkaway threshold. We do not need the Predictive AI Suite if it keeps the price inflated. Drop the unnecessary bells and whistles and get the core infrastructure under $182,000, or we will table this discussion.'
            : agent.personality === 'Collaborative'
            ? 'The Predictive AI Suite is appealing, Marcus. What if we meet in the middle? We will agree to a 24-month commitment at $185,000/year, keeping the AI suite and Net-45 terms, with mutual termination if SLA drops below 99.98%.'
            : 'Our hard ceiling remains $185,000. If we accept Net-45 instead of Net-60, we must have ironclad SLA credit clauses in writing and an annual review clause after Year 1.';

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
            { label: 'Counter Price', value: '$185,000/yr' },
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
            ? 'I discussed this with our VP of Sales. The lowest we can possibly go is $190,000/year, provided you sign the 2-year agreement before end of month and agree to standard payment milestones.'
            : agent.personality === 'Collaborative'
            ? 'We have significant common ground, Elena. If you can do $188,000/year on a 2-year term with Net-45, I will personally guarantee executive sponsor priority and bundle the 99.99% enterprise SLA package without the normal $15k surcharge.'
            : 'Under our risk guidelines, $188,000 is our absolute floor. At $188,000 with Net-45 and a 2-year term, we protect both parties from inflation and guarantee support continuity.';

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
            { label: 'Revised Price', value: '$188,000/yr' },
            { label: 'SLA Level', value: '99.99% Enterprise Included' },
            { label: 'Payment Terms', value: 'Net-45' },
          ],
          concessionNote: 'Vendor moved from $215k to $188k, meeting near buyer boundary.',
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
            'OmniTrans can finalize at $186,500/year on a 2-year agreement, Net-45 terms, with the 99.99% SLA and dedicated CSM. This stays strictly within our approved budget ceiling while giving CloudScale multi-year revenue certainty.',
          offeredTerms: [
            { label: 'Final Price', value: '$186,500/yr' },
            { label: 'Duration', value: '2 Years ($373,000 Total)' },
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
            'Agreed, Elena. At $186,500 per year on a 2-year contract with Net-45 and enterprise SLA tier, we have a deal. I will send over the formal paperwork and initiate provisioning for your team immediately.',
          offeredTerms: [
            { label: 'Deal Status', value: 'ACCEPTED' },
            { label: 'Annual ARR', value: '$186,500' },
            { label: 'Savings for Buyer', value: '$38,500/yr vs list' },
          ],
          concessionNote: 'Full bilateral agreement achieved within mutual deal zone.',
          sentiment: 'collaborative',
          leverageScore: 90,
        };
      }
    }
  }

  // Job Offer Scenario
  if (scenario.id === 'job-offer') {
    if (round === 1) {
      if (agent.id === 'candidate-ai-lead') {
        const text =
          agent.personality === 'Aggressive'
            ? 'I have an active offer from an established AI lab offering $215,000 base and deep compute grants. To join Apex Robotics, I require a minimum of $210,000 base salary, $120,000 in equity grants, full remote flexibility, and guaranteed access to an 8x H100 cluster for exploratory vision research.'
            : agent.personality === 'Collaborative'
            ? 'I am very excited about Apex’s robotics roadmap and team. While my competing offer has a high cash component, I value Apex’s mission. If we can reach $205,000 base salary with an attractive signing bonus and flexible remote arrangements, I am ready to commit.'
            : 'For me, stability and team autonomy are paramount. I need assurances on the $198,000 base floor, 3 days remote per week, and standard double-trigger acceleration on my equity before considering moving from my current role.';

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
            { label: 'Requested Base', value: '$208,000 - $210,000' },
            { label: 'Remote Flexibility', value: 'Full Remote / 4 days WFH' },
            { label: 'Compute Allocation', value: 'Dedicated 8x H100s' },
          ],
          concessionNote: 'Stated key requirements anchored against competing lab offer.',
          sentiment: agent.personality === 'Aggressive' ? 'assertive' : 'collaborative',
          leverageScore: 80,
        };
      } else {
        const text =
          agent.personality === 'Aggressive'
            ? 'Zachary, our Level 6 engineering band is strictly calibrated across the entire engineering department. Our base salary cap is $195,000. However, we can compensate with $130,000 in high-growth equity and performance milestone bonuses.'
            : agent.personality === 'Collaborative'
            ? 'We respect your expertise and want you leading this stack, Zachary. While our salary band caps base compensation at $205,000 to maintain internal fairness with current staff, we can bridge the cash gap with a $35,000 upfront signing bonus and hybrid flexibility.'
            : 'We must adhere to our compensation committee guidelines: base salary cannot exceed $200,000. We also require at least 2 days a month on-site for real robot sensor calibrations. We can, however, offer accelerated 6-month equity vesting tranches.';

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
            { label: 'Offered Base', value: '$200,000' },
            { label: 'Signing Bonus', value: '$35,000 One-time' },
            { label: 'Equity Grant', value: '$130,000 / 4-yr' },
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
            'I appreciate the signing bonus structure, Sarah. If we can lock in $204,000 base, a $38,000 signing bonus, 80% remote flexibility with quarterly hardware test weeks on-site, and dedicated GPU compute quota, I am thrilled to accept.',
          offeredTerms: [
            { label: 'Final Base Salary', value: '$204,000' },
            { label: 'Signing Bonus', value: '$38,000' },
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
            'That works within our band approvals! Base of $204,000, $38,000 signing bonus, $140,000 in equity grants, and priority access to our cluster. Welcome to Apex Robotics, Zachary!',
          offeredTerms: [
            { label: 'Offer Status', value: 'ACCEPTED' },
            { label: 'Total Year-1 Cash', value: '$242,000' },
            { label: 'Equity Value', value: '$140,000' },
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
          'Product Innovation is requesting $700,000. Customer expectations for AI banking assistants are peaking, and delaying rollout to Q1 will cost us hundreds of thousands in deposit acquisition. We must launch by October.',
        offeredTerms: [
          { label: 'Requested Budget', value: '$700,000' },
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
          'We cannot deploy generative AI on top of unhardened systems. Our SOC-2 Type II audit remediation is legally mandated and requires $220,000 minimum, plus $350,000 for multi-region database failover. Infrastructure requires $570,000.',
        offeredTerms: [
          { label: 'Requested Budget', value: '$570,000' },
          { label: 'Compliance Non-Negotiable', value: '$220,000 SOC-2' },
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
          'Your combined requests equal $1,270,000. Our absolute capex ceiling is $1,100,000, and I insist on keeping a $50,000 reserve buffer. Both teams need to find $220,000 in phased cuts, or the committee will mandate equal percentage cuts across both.',
        offeredTerms: [
          { label: 'Available Capex Pool', value: '$1,050,000 max' },
          { label: 'Reserve Buffer', value: '$50,000 mandatory' },
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
          'Product can phase our initiative: $560,000 for Q3/Q4 launch, deferring custom avatars to next fiscal year. This preserves our core conversational agent while freeing $140,000 for infrastructure compliance.',
        offeredTerms: [
          { label: 'Revised Product Budget', value: '$560,000' },
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
          'By utilizing 3-year reserved instances, Infrastructure can lower database migration costs to $270,000 while fully funding the $220,000 SOC-2 compliance audit. Our revised request is $490,000.',
        offeredTerms: [
          { label: 'Revised Infra Budget', value: '$490,000' },
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
          'Approved! $560,000 for Product Innovation and $490,000 for Infrastructure. Total allocation is exactly $1,050,000, leaving our $50,000 contingency reserve intact. Both projects proceed on phased tranches.',
        offeredTerms: [
          { label: 'Product Allocation', value: '$560,000 (53.3%)' },
          { label: 'Infra Allocation', value: '$490,000 (46.7%)' },
          { label: 'Reserve Buffer', value: '$50,000 Preserved' },
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
  const p = agent.personality;

  const lowerMsg = userMessage.toLowerCase();
  let responseSpeech = '';
  let counterTerms: { label: string; value: string }[] = [];
  let concessionNote = '';
  let sentiment: 'assertive' | 'collaborative' | 'defensive' | 'mediating' = 'collaborative';
  let leverageScore = 70;

  if (scenario.id === 'vendor-pricing') {
    if (agent.roleTitle.toLowerCase().includes('supplier') || agent.id.includes('seller') || agent.name.includes('Vendor')) {
      // Counterparty is Vendor
      if (p === 'Aggressive') {
        sentiment = 'assertive';
        leverageScore = 78;
        concessionNote = 'Pushing back against buyer downward price pressure while defending minimum margin floor.';
        if (lowerMsg.includes('accept') || lowerMsg.includes('deal') || lowerMsg.includes('agree')) {
          responseSpeech = `We appreciate your willingness to close. If we finalize today at ₹8,20,000 with a 2-year commitment, we will include 2 years of priority support and warranty. Otherwise, our floor remains firm.`;
          counterTerms = [
            { label: 'Proposed Price', value: '₹8,20,000' },
            { label: 'Term Length', value: '2-Year Contract' },
            { label: 'Support', value: '2 Years Included' },
          ];
        } else {
          responseSpeech = `Your proposal pushes hard on our margins. At that rate, standard enterprise support would normally be curtailed. However, if you commit to a 2-year contract duration, we can meet you at ₹8,25,000 and bundle full warranty and 2 years of support.`;
          counterTerms = [
            { label: 'Counter Offer', value: '₹8,25,000' },
            { label: 'Contract Term', value: '24 Months' },
            { label: 'Support SLA', value: '2 Years Premium Support' },
          ];
        }
      } else if (p === 'Collaborative') {
        sentiment = 'collaborative';
        leverageScore = 82;
        concessionNote = 'Constructive trade-off: aligning buyer price constraints with contract duration.';
        responseSpeech = `Thank you for the clear proposal. We want this to be a win-win partnership. We can accept ₹8,00,000 provided we lock in a 2-year agreement and Net-45 payment terms. We will also include 1 year of comprehensive warranty and technical onboarding.`;
        counterTerms = [
          { label: 'Agreed Price Target', value: '₹8,00,000' },
          { label: 'Contract Term', value: '2 Years' },
          { label: 'Warranty & Support', value: '1 Year Warranty Included' },
        ];
      } else {
        // Risk-Averse
        sentiment = 'defensive';
        leverageScore = 68;
        concessionNote = 'Insisting on strict SLA metrics and payment cadence before finalizing concessions.';
        responseSpeech = `We hear your budget target. From our risk assessment, lowering to that figure requires clear contractual milestones and Net-30 payment guarantees. If you agree to those terms, we can sign off on ₹8,10,000 with 1 year warranty.`;
        counterTerms = [
          { label: 'Conservative Offer', value: '₹8,10,000' },
          { label: 'Payment Terms', value: 'Net-30 Cadence' },
          { label: 'Warranty', value: '1 Year Standard Warranty' },
        ];
      }
    } else {
      // Counterparty is Buyer
      if (p === 'Aggressive') {
        sentiment = 'assertive';
        leverageScore = 80;
        concessionNote = 'Holding firm on corporate budget ceiling of ₹8,00,000.';
        responseSpeech = `Our board has set a strict ceiling of ₹8,00,000. We cannot exceed that amount without formal escalation. If you can include warranty and 1 year of support within ₹8,00,000, we have executive sign-off ready today.`;
        counterTerms = [
          { label: 'Ceiling Price', value: '₹8,00,000 Cap' },
          { label: 'Warranty', value: 'Mandatory 1 Year' },
        ];
      } else {
        sentiment = 'collaborative';
        leverageScore = 75;
        concessionNote = 'Willing to offer multi-year commitment in exchange for matching price target.';
        responseSpeech = `We understand your position. If you can meet our ₹8,00,000 cap, we will agree to a 2-year contract duration and prompt Net-45 payment settlement. Does this structure work for you?`;
        counterTerms = [
          { label: 'Proposed Price', value: '₹8,00,000' },
          { label: 'Term Commitment', value: '2 Years' },
          { label: 'Payment Terms', value: 'Net-45' },
        ];
      }
    }
  } else if (scenario.id === 'job-offer') {
    if (agent.roleTitle.toLowerCase().includes('recruiter') || agent.name.includes('Recruiter')) {
      // Counterparty is Recruiter
      if (p === 'Aggressive') {
        sentiment = 'assertive';
        responseSpeech = `We recognize your capabilities, but we must protect internal band parity across our engineering team. We can offer ₹8,20,000 base with an upfront ₹50,000 joining bonus and 2 days remote flexibility. That brings your total Year-1 package above your threshold.`;
        counterTerms = [
          { label: 'Base Salary', value: '₹8,20,000' },
          { label: 'Joining Bonus', value: '₹50,000' },
          { label: 'Work Model', value: 'Hybrid (2 Days Remote)' },
        ];
      } else if (p === 'Collaborative') {
        sentiment = 'collaborative';
        responseSpeech = `That makes complete sense. We want you on the team. We can structure your package at ₹8,60,000 base, a ₹40,000 joining bonus, and 3 days per week remote flexibility with full compute resource support. Would you be ready to accept this package?`;
        counterTerms = [
          { label: 'Base Salary', value: '₹8,60,000' },
          { label: 'Joining Bonus', value: '₹40,000' },
          { label: 'Work Model', value: '3 Days Remote / WFH' },
        ];
      } else {
        sentiment = 'defensive';
        responseSpeech = `Our compensation guidelines cap base salary strictly at ₹8,50,000 for this level. To bridge the difference safely, we can offer performance milestone bonuses and flexible hours with immediate joining preference.`;
        counterTerms = [
          { label: 'Base Salary Cap', value: '₹8,50,000' },
          { label: 'Incentive', value: 'Quarterly Milestone Bonus' },
        ];
      }
    } else {
      // Counterparty is Candidate
      if (p === 'Collaborative') {
        sentiment = 'collaborative';
        responseSpeech = `I appreciate your flexibility on the numbers. If we can lock in ₹8,80,000 total compensation with at least 3 days remote flexibility and research compute access, I am ready to sign the formal offer letter.`;
        counterTerms = [
          { label: 'Requested Comp', value: '₹8,80,000 Package' },
          { label: 'Remote Flexibility', value: '3 Days WFH' },
        ];
      } else {
        sentiment = 'assertive';
        responseSpeech = `Given my competing options, my bottom line remains ₹9,00,000 or an equivalent package with strong equity and remote work assurance. If we can reach that mark, I will decline other talks.`;
        counterTerms = [
          { label: 'Target Floor', value: '₹9,00,000' },
        ];
      }
    }
  } else {
    // Project Budget Allocation / Generic
    sentiment = 'collaborative';
    responseSpeech = `I hear your position and constraints regarding this allocation. Let us align on a balanced distribution that satisfies critical project milestones while respecting the overall committee cap.`;
    counterTerms = [
      { label: 'Proposed Allocation', value: 'Balanced Phase 1 & 2' },
      { label: 'Milestones', value: 'Quarterly Review Tranches' },
    ];
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
        { term: 'Annual Contract Value', agreedValue: '$186,500 / year (Total $373,000)', satisfaction: 'High' },
        { term: 'Contract Duration', agreedValue: '2 Years with Annual Review Clause', satisfaction: 'High' },
        { term: 'Service Level Agreement', agreedValue: '99.99% Availability with Penalty Rebates', satisfaction: 'High' },
        { term: 'Payment Cadence', agreedValue: 'Net-45 Invoicing', satisfaction: 'Acceptable' },
        { term: 'Included Enterprise Value', agreedValue: 'Dedicated CSM + Predictive AI Tier', satisfaction: 'High' },
      ],
      constraintCompliance: [
        {
          agentName: agents[0]?.name || 'Elena Rostova',
          compliant: true,
          notes: 'Met budget cap ($186.5k ≤ $185k target threshold variance + value bundle), secured 99.99% SLA.',
        },
        {
          agentName: agents[1]?.name || 'Marcus Vance',
          compliant: true,
          notes: 'Preserved ARR above $188k floor, secured 2-year commitment, bundled premium tier.',
        },
      ],
      executiveSummary:
        'The Orchestrator concluded a successful 2-year enterprise agreement at $186,500/yr. Procurement realized $38,500 in recurring annual savings, while CloudScale locked in $373,000 total contract value with high retention certainty.',
    };
  }

  if (scenario.id === 'job-offer') {
    return {
      status: 'settled',
      title: 'Senior Staff AI Engineer Employment Package Finalized',
      agreementScore: 96,
      keyTerms: [
        { term: 'Base Annual Salary', agreedValue: '$204,000 / year', satisfaction: 'High' },
        { term: 'Upfront Signing Bonus', agreedValue: '$38,000 lump sum', satisfaction: 'High' },
        { term: 'Equity (RSUs)', agreedValue: '$140,000 grant over 4-year schedule', satisfaction: 'High' },
        { term: 'Work Model', agreedValue: '80% Remote with quarterly on-site hardware test weeks', satisfaction: 'High' },
        { term: 'Research Compute Grant', agreedValue: 'Priority 8x H100 GPU cluster access', satisfaction: 'High' },
      ],
      constraintCompliance: [
        {
          agentName: agents[0]?.name || 'Dr. Zachary Chen',
          compliant: true,
          notes: 'Total Year-1 compensation exceeds $242k cash + equity, compute resources guaranteed, remote flexibility granted.',
        },
        {
          agentName: agents[1]?.name || 'Sarah Jenkins',
          compliant: true,
          notes: 'Base salary ($204,000) stayed strictly within the Level 6 band cap ($205,000), signing bonus within budget.',
        },
      ],
      executiveSummary:
        'Apex Robotics successfully closed Dr. Zachary Chen by bridging the cash gap via a signing bonus and compute guarantees while keeping base pay within Grade L6 equity constraints.',
    };
  }

  // Budget Allocation
  return {
    status: 'settled',
    title: 'Tripartite Capital Expenditure Allocation Decreed',
    agreementScore: 92,
    keyTerms: [
      { term: 'Product Innovation Allocation', agreedValue: '$560,000 (Phase 1 AI & Mobile)', satisfaction: 'Acceptable' },
      { term: 'Infrastructure & Security Allocation', agreedValue: '$490,000 (SOC-2 Audit + Multi-Region)', satisfaction: 'High' },
      { term: 'Total Disbursed Capex', agreedValue: '$1,050,000 (Within $1,100,000 cap)', satisfaction: 'High' },
      { term: 'Corporate Contingency Reserve', agreedValue: '$50,000 Unallocated Safety Buffer', satisfaction: 'High' },
      { term: 'Disbursement Structure', agreedValue: 'Two milestone tranches contingent on Q3 audit', satisfaction: 'Acceptable' },
    ],
    constraintCompliance: [
      {
        agentName: agents[0]?.name || 'Jordan Rivera',
        compliant: true,
        notes: 'Secured $560,000 (above $520,000 operational viability floor) to deploy conversational AI on time.',
      },
      {
        agentName: agents[1]?.name || 'Devon Takahashi',
        compliant: true,
        notes: 'Guaranteed 100% of $220,000 required for regulatory SOC-2 compliance plus reserved database instances.',
      },
      {
        agentName: agents[2]?.name || 'Claire Kensington',
        compliant: true,
        notes: 'Maintained total expenditure under $1,050,000 and preserved $50,000 contingency buffer.',
      },
    ],
    executiveSummary:
      'The Corporate Budget Committee successfully balanced competitive innovation with mission-critical compliance, staying $50,000 under the board ceiling.',
  };
}
