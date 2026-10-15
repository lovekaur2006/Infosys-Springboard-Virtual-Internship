/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PersonalityDefinition, PersonalityType, ScenarioTemplate } from '../types.ts';

export const PERSONALITY_DEFINITIONS: Record<PersonalityType, PersonalityDefinition> = {
  Aggressive: {
    type: 'Aggressive',
    title: 'Aggressive Negotiator',
    tagline: 'High anchoring, assertive pushback, minimizes early concessions',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    borderColor: 'border-rose-400 dark:border-rose-600',
    bgLight: 'bg-rose-50/50 dark:bg-rose-950/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    description:
      'Establishes an aggressive opening anchor, questions the counterpart’s cost models or alternative offers, and firmly insists on favorable terms before granting any concessions.',
    tactics: [
      'Bold opening anchor to pull bargaining envelope',
      'Challenges counterparty claims and alternative options',
      'Packages concessions strictly contingent on reciprocal high-value trades',
      'Willing to signal readiness to walk away if terms stay unfavorable',
    ],
    riskTolerance: 'High',
    compromiseSpeed: 'Reluctant',
  },
  Collaborative: {
    type: 'Collaborative',
    title: 'Collaborative Negotiator',
    tagline: 'Win-win orientation, transparent trade-offs, value creation',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    borderColor: 'border-emerald-400 dark:border-emerald-600',
    bgLight: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    description:
      'Focuses on integrative bargaining by identifying underlying interests, trading non-essential items for core priorities, and crafting multi-variable packages that benefit both sides.',
    tactics: [
      'Explores priorities across price, term length, and service tiers',
      'Offers creative bundling and flexible payment milestones',
      'Builds trust through transparent rationale and shared upside',
      'Seeks mutually beneficial middle ground without sacrificing critical thresholds',
    ],
    riskTolerance: 'Medium',
    compromiseSpeed: 'Moderate',
  },
  'Risk-Averse': {
    type: 'Risk-Averse',
    title: 'Risk-Averse Negotiator',
    tagline: 'Downside protection, strict contractual safeguards, cautious steps',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    borderColor: 'border-amber-400 dark:border-amber-600',
    bgLight: 'bg-amber-50/50 dark:bg-amber-950/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    description:
      'Prioritizes risk mitigation, contractual predictability, and defensive limits over speculative upside. Insists on compliance clauses, safety buffers, and conservative baselines.',
    tactics: [
      'Focuses on SLA guarantees, audit rights, and penalty clauses',
      'Resists long multi-year commitments without clear exit ramps',
      'Counter-offers incrementally with small, measured adjustments',
      'Defends downside budget ceilings rigorously',
    ],
    riskTolerance: 'Low',
    compromiseSpeed: 'Reluctant',
  },
};

export const PREBUILT_SCENARIOS: ScenarioTemplate[] = [
  {
    id: 'vendor-pricing',
    title: 'Vendor Pricing Negotiation',
    badge: 'Enterprise Procurement',
    category: 'Enterprise Sales',
    shortDescription:
      'A buyer and a vendor negotiate on product/service pricing, delivery terms, support and contract duration.',
    detailedContext:
      'Global logistics corporation "OmniTrans" is renewing its 500-seat cloud infrastructure & analytics license with SaaS provider "CloudScale Systems". OmniTrans has a strict IT fiscal mandate to contain software inflation, while CloudScale needs to expand contract value into a 3-year multi-product commitment to meet fiscal revenue quotas.',
    stakeholdersCount: 2,
    estimatedRounds: 4,
    complexity: 'High',
    participatingAgentsText: 'Buyer (Procurement Manager) + Vendor (Supplier)',
    agentRolesText: 'Buyer, Vendor',
    keyGoalsText: 'Get the best price & terms  |  Maximize profit',
    constraintsText: 'Budget limit, minimum price, support duration, etc.',
    accentColor: 'blue',
    orchestrator: {
      name: 'Executive Commercial Arbitrator',
      roleTitle: 'Orchestrator Agent',
      description:
        'Enforces structured negotiation protocol, manages conversational turns, tracks concession velocity, and verifies constraint compliance.',
      arbitrationRules: [
        'Enforce turn-taking between Procurement Buyer and Vendor AE',
        'Verify contract pricing stays within allowable fiscal bounds',
        'Monitor red-line constraints (SLA thresholds, term durations, payment cadences)',
        'Summarize agreement terms or declare impasse if walkaway criteria are met',
      ],
      maxRounds: 4,
    },
    dealZoneSummary: {
      batnaBuyer: 'Switch secondary analytics workloads to open-source self-hosted cluster with $40k transition cost.',
      batnaSeller: 'Keep contract at standard rack rate without dedicated CSM and reallocate tier-1 engineering support.',
      targetOverlaps: 'Viable settlement zone between ₹7,50,000 - ₹8,00,000 with 2-year commitment and SLA upgrade.',
    },
    defaultAgents: [
      {
        id: 'buyer-procurement',
        name: 'Buyer Agent',
        roleTitle: 'Procurement Manager',
        organization: 'OmniTrans Global',
        avatarIcon: 'Building2',
        themeColor: 'blue',
        roleDescription:
          'Represents the buying company and negotiates for the best price, terms and support.',
        primaryGoal: 'Get the lowest possible price and favorable terms.',
        targetMetric: 'Budget limit: ₹8,00,000',
        keyConstraints: [
          'Maximum budget: ₹8,00,000',
          'Minimum support: 1 year',
          'Must include warranty',
        ],
        personality: 'Risk-Averse',
        tacticalNotes:
          'Prefers stability, avoids unnecessary risks, and makes cautious concessions.',
        openingStance:
          'We value the solution, but our company has placed a hard cap of ₹8,00,000 with mandatory 1-year support and warranty included.',
      },
      {
        id: 'seller-account-exec',
        name: 'Vendor Agent',
        roleTitle: 'Supplier',
        organization: 'CloudScale Systems',
        avatarIcon: 'TrendingUp',
        themeColor: 'purple',
        roleDescription:
          'Represents the vendor and aims to maximize profit and secure long-term business.',
        primaryGoal: 'Maximize contract value and long-term partnership.',
        targetMetric: 'Price floor: ₹8,00,000',
        keyConstraints: [
          'Minimum price: ₹8,00,000',
          'Maximum support: 3 years',
          'Want 2 year contract minimum',
        ],
        personality: 'Aggressive',
        tacticalNotes:
          'Starts with strong demands, makes smaller concessions, pressures for better terms.',
        openingStance:
          'Our platform delivers substantial ROI. Our opening proposal is ₹9,50,000 for a 2-year commitment bundling 3 years premium support.',
      },
    ],
  },
  {
    id: 'job-offer',
    title: 'Job Offer Negotiation',
    badge: 'Talent & Compensation',
    category: 'Talent & HR',
    shortDescription:
      'A candidate and a recruiter negotiate on salary, benefits, work model and joining terms.',
    detailedContext:
      'Fast-growing tech company is extending an offer to a Senior Engineer. The candidate possesses scarce model engineering expertise and holds competing interest, while the company needs to maintain internal equity with existing bands.',
    stakeholdersCount: 2,
    estimatedRounds: 4,
    complexity: 'Moderate',
    participatingAgentsText: 'Candidate + Recruiter',
    agentRolesText: 'Job Seeker, Recruiter',
    keyGoalsText: 'Maximize salary & benefits  |  Hire the right candidate',
    constraintsText: 'Budget range, company policies, joining timeline, etc.',
    accentColor: 'purple',
    orchestrator: {
      name: 'Talent Acquisition Partner',
      roleTitle: 'Orchestrator Agent',
      description:
        'Coordinates interview wrap-up, ensures transparent compensation discussions, and validates company equity benchmarks.',
      arbitrationRules: [
        'Moderate compensation discussion across Base Salary, Signing Bonus, and Remote Flexibility',
        'Check base salary ceiling against corporate Grade L6 salary band',
        'Maintain candidate satisfaction while protecting team internal equity',
        'Synthesize formal letter of intent upon agreement',
      ],
      maxRounds: 4,
    },
    dealZoneSummary: {
      batnaBuyer: 'Extend alternative candidate with 2 weeks delay.',
      batnaSeller: 'Explore competing offers with higher cash stability.',
      targetOverlaps: 'Viable agreement between ₹8,20,000 - ₹8,80,000 + hybrid balance + performance bonus.',
    },
    defaultAgents: [
      {
        id: 'candidate-ai-lead',
        name: 'Candidate Agent',
        roleTitle: 'Job Seeker',
        organization: 'Independent Candidate',
        avatarIcon: 'Brain',
        themeColor: 'emerald',
        roleDescription:
          'Evaluates compensation packages and seeks high career growth, compensation and work flexibility.',
        primaryGoal: 'Get the best salary, benefits and work flexibility.',
        targetMetric: 'Expected: ₹9,00,000+ package',
        keyConstraints: [
          'Minimum expected salary: ₹9,00,000',
          'Remote work preference',
          'Joining bonus (preferred)',
        ],
        personality: 'Collaborative',
        tacticalNotes:
          'Explores priorities across base, bonus and flexibility to find a mutually rewarding outcome.',
        openingStance:
          'I am excited about this opportunity. Given my skillset and competing market offers, my expectation is ₹9,00,000 with remote flexibility.',
      },
      {
        id: 'employer-vp-eng',
        name: 'Recruiter Agent',
        roleTitle: 'Recruiter',
        organization: 'Apex Robotics',
        avatarIcon: 'Briefcase',
        themeColor: 'amber',
        roleDescription:
          'Hires top talent while adhering strictly to department compensation bands and company timeline.',
        primaryGoal: 'Hire the right candidate within budget.',
        targetMetric: 'Band: ₹7,00,000 - ₹9,00,000',
        keyConstraints: [
          'Salary range: ₹7,00,000 - ₹9,00,000',
          'Hybrid/Office work (preferred)',
          'Immediate joining (preferred)',
        ],
        personality: 'Risk-Averse',
        tacticalNotes:
          'Balances internal equity and provides non-salary perks like equity and learning allowance.',
        openingStance:
          'We would love to welcome you to the team. Our standard compensation band for this role is ₹7,50,000 to ₹8,50,000 with strong performance incentives.',
      },
    ],
  },
  {
    id: 'budget-allocation',
    title: 'Project Budget Allocation',
    badge: 'Capital Planning',
    category: 'Corporate Finance',
    shortDescription:
      'Multiple departments negotiate to get the best allocation from a limited project budget.',
    detailedContext:
      'Annual capital expenditure review at enterprise fintech "FinCore Global". The total available expansion capex is capped at ₹15,00,000. Departments compete for resources while the committee chair must enforce fiscal balance.',
    stakeholdersCount: 3,
    estimatedRounds: 5,
    complexity: 'Expert',
    participatingAgentsText: 'Project Manager + AI Team + Marketing + Operations',
    agentRolesText: 'Project Manager, Department Heads',
    keyGoalsText: 'Maximize department needs  |  Fair allocation',
    constraintsText: 'Total budget limit, priority order, dependencies, etc.',
    accentColor: 'emerald',
    orchestrator: {
      name: 'Corporate Budget Committee Chair',
      roleTitle: 'Orchestrator Agent',
      description:
        'Moderates tripartite fiscal hearings, maintains aggregate expenditure limits, and ensures strategic alignment with 2027 board directives.',
      arbitrationRules: [
        'Enforce aggregate capital expenditure ceiling of ₹15,00,000 max',
        'Verify both departments receive minimum operational viability thresholds ($450k and $400k)',
        'Evaluate phased rollout milestones across Q3 and Q4',
        'Document final capital allocation decree with ROI milestones',
      ],
      maxRounds: 5,
    },
    dealZoneSummary: {
      batnaBuyer: 'Product defers international mobile app launch and relies on off-the-shelf third-party widgets.',
      batnaSeller: 'Infrastructure delays multi-region hot-standby, accepting single-region disaster recovery risk.',
      targetOverlaps: 'Product gets $560,000; Infrastructure gets $490,000; total $1,050,000 with $50,000 contingency buffer.',
    },
    defaultAgents: [
      {
        id: 'product-lead',
        name: 'Jordan Rivera',
        roleTitle: 'Head of Product Innovation',
        organization: 'FinCore Product Studio',
        avatarIcon: 'Sparkles',
        themeColor: 'purple',
        roleDescription:
          'Drives customer-facing digital transformation, retail mobile experiences, and AI assistant engagement metrics.',
        primaryGoal:
          'Secure at least $650,000 to launch conversational generative banking, personalized financial health agents, and UI revamp before Q4 consumer holiday peak.',
        targetMetric: 'Target: $750,000 (Floor: $520,000)',
        keyConstraints: [
          'Absolute minimum viable budget of $520,000 to avoid cancelling core engineering contractor squads',
          'Must commence Phase 1 development within 30 calendar days to hit Q4 launch marketing windows',
          'Requires low-latency LLM inference tier; cannot accept shared slow model pools',
          'Must retain design partner agency retainer ($80,000 committed)',
        ],
        personality: 'Aggressive',
        tacticalNotes:
          'Argues that product innovation generates the revenue that funds all other departments, pointing to 40% projected user engagement growth.',
        openingStance:
          'Competitors are rolling out AI banking agents this quarter. We require the full $750,000 allocation to preserve market share and drive an estimated $2.8M in net new deposits.',
      },
      {
        id: 'infra-lead',
        name: 'Devon Takahashi',
        roleTitle: 'VP of Infrastructure & Security',
        organization: 'FinCore Core Platform',
        avatarIcon: 'ShieldAlert',
        themeColor: 'blue',
        roleDescription:
          'Guardian of 99.999% banking availability, regulatory SOC-2 compliance, database encryption, and disaster recovery infrastructure.',
        primaryGoal:
          'Secure $550,000 to complete multi-region database failover, implement zero-trust cybersecurity posture, and mitigate legacy database vulnerabilities.',
        targetMetric: 'Target: $600,000 (Floor: $460,000)',
        keyConstraints: [
          'Regulatory compliance requires SOC-2 Type II audit remediation by November (non-negotiable $220k)',
          'Absolute operational floor of $460,000; below this, critical disaster recovery must be halted',
          'Cannot defer multi-region failover tests past September due to payment network audit',
          'Requires dedicated cloud reserve fund of $60,000 for unexpected peak traffic spikes',
        ],
        personality: 'Risk-Averse',
        tacticalNotes:
          'Warns of catastrophic regulatory fines, downtime penalties, and audit failures if infrastructure is underfunded in favor of speculative features.',
        openingStance:
          'A single security breach or 15-minute banking outage erases all product gains. We must allocate $600,000 immediately to complete zero-trust hardening and database clustering.',
      },
      {
        id: 'cfo-finance',
        name: 'Claire Kensington',
        roleTitle: 'Chief Financial Officer',
        organization: 'FinCore Executive Committee',
        avatarIcon: 'DollarSign',
        themeColor: 'emerald',
        roleDescription:
          'Maintains fiscal discipline, corporate solvency, investor guidance, and capital return on investment.',
        primaryGoal:
          'Constrain total combined Q3/Q4 capital allocation to under $1,050,000, preserving at least $50,000 unallocated buffer while financing both mission-critical initiatives.',
        targetMetric: 'Target: Total ≤ $1,050,000 (Hard Cap: $1,100,000)',
        keyConstraints: [
          'Strict board ceiling of $1,100,000 total across both projects combined',
          'Requires milestone-based tranche disbursements (50% upfront, 50% upon Q3 audit/launch review)',
          'Requires demonstrable 18-month break-even ROI on the product AI investment',
          'Demands that infrastructure cloud commitments leverage 3-year reserved instances for 25% savings',
        ],
        personality: 'Collaborative',
        tacticalNotes:
          'Mediates between revenue growth and operational safety, challenging inflated estimates while proposing phased disbursement tranches.',
        openingStance:
          'Your combined requests total $1,350,000 against our maximum pool of $1,100,000. Both projects have merit, but you must find $300,000 in synergies and phased tranches today.',
      },
    ],
  },
];
