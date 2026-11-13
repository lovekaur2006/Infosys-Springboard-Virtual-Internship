/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PersonalityDefinition, PersonalityType, ScenarioTemplate } from '../types.ts';

export const PERSONALITY_DEFINITIONS: Record<PersonalityType, PersonalityDefinition> = {
  Aggressive: {
    type: 'Aggressive',
    title: 'Firm / Assertive Negotiator',
    tagline: 'Principled anchoring, clear boundary defense, value-focused',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    borderColor: 'border-indigo-400 dark:border-indigo-600',
    bgLight: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    description:
      'Negotiates with firm, disciplined positions on core priorities while maintaining professional respect, calm communication, and constructive problem-solving.',
    tactics: [
      'Establishes clear, value-backed opening anchors',
      'Articulates business rationale and operational boundaries calmly',
      'Packages concessions strictly contingent on reciprocal high-value trades',
      'Maintains professional composure and seeks constructive mutual alignment',
    ],
    riskTolerance: 'Medium',
    compromiseSpeed: 'Moderate',
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
      batnaBuyer: 'Switch secondary analytics workloads to open-source self-hosted cluster with ₹40,000 transition cost.',
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
          'Disciplined anchoring on price floor while maintaining polite, professional dialogue and value-driven bundling.',
        openingStance:
          'Our platform delivers substantial ROI. Our opening proposal is ₹9,50,000 for a 2-year commitment bundling 3 years premium support and enterprise SLA.',
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
    id: 'project-negotiation',
    title: 'Project-Based Negotiation',
    badge: 'Delivery & Scope',
    category: 'Enterprise Sales',
    shortDescription:
      'A client and delivery partner reconcile project scope, budget, timeline, responsibilities, and measurable deliverables.',
    detailedContext:
      'A client is commissioning a customer portal from a delivery partner. The client needs a fixed launch date and predictable spend, while the partner must protect delivery quality and a sustainable project margin. The parties must trade scope, schedule, responsibilities, and acceptance criteria rather than solving the conflict with price alone.',
    stakeholdersCount: 2,
    estimatedRounds: 4,
    complexity: 'High',
    participatingAgentsText: 'Client Sponsor + Delivery Partner',
    agentRolesText: 'Project Sponsor, Delivery Lead',
    keyGoalsText: 'Hit the launch date within budget  |  Protect delivery quality and margin',
    constraintsText: 'Budget ceiling, launch date, staffing ownership, acceptance criteria',
    accentColor: 'blue',
    orchestrator: {
      name: 'Project Governance Mediator',
      roleTitle: 'Orchestrator Agent',
      description:
        'Separates scope, schedule, cost, responsibility, and acceptance criteria so concessions are explicit and enforceable.',
      arbitrationRules: [
        'Identify conflicts between budget, schedule, scope, and delivery quality',
        'Keep the client package at or below the approved project ceiling',
        'Require named ownership for discovery, testing, launch, and post-launch support',
        'Confirm milestone deliverables and acceptance criteria before declaring agreement',
      ],
      maxRounds: 4,
    },
    dealZoneSummary: {
      batnaBuyer: 'Defer non-critical reporting features to a later phase and seek a smaller delivery partner.',
      batnaSeller: 'Decline the fixed-date commitment and prioritize a better-margin client engagement.',
      targetOverlaps: 'Viable settlement at ₹11,50,000 with a 16-week launch, shared testing responsibilities, and a defined Phase 2 scope.',
    },
    defaultAgents: [
      {
        id: 'project-sponsor',
        name: 'Client Sponsor',
        roleTitle: 'Project Sponsor',
        organization: 'Northstar Retail',
        avatarIcon: 'Target',
        themeColor: 'blue',
        roleDescription:
          'Owns the business outcome and must protect the approved budget and launch commitment.',
        primaryGoal: 'Deliver the core customer portal by the fixed launch date without exceeding the approved budget.',
        targetMetric: 'Budget ceiling: ₹12,00,000; launch target: 16 weeks',
        keyConstraints: [
          'Maximum project budget: ₹12,00,000',
          'Core launch must happen within 16 weeks',
          'Partner must own production deployment',
          'Acceptance testing and named deliverables required',
        ],
        personality: 'Risk-Averse',
        tacticalNotes:
          'Protects the launch date and budget, but can defer non-critical scope when ownership and acceptance criteria are clear.',
        openingStance:
          'We need the core portal live in 16 weeks within our ₹12,00,000 approval. Reporting enhancements can move to Phase 2, but deployment ownership and acceptance criteria must be explicit.',
      },
      {
        id: 'delivery-partner',
        name: 'Delivery Partner',
        roleTitle: 'Delivery Lead',
        organization: 'BluePeak Digital',
        avatarIcon: 'Layers',
        themeColor: 'purple',
        roleDescription:
          'Protects implementation quality, staffing capacity, and a sustainable delivery plan.',
        primaryGoal: 'Deliver a high-quality portal with realistic staffing, milestones, and commercial terms.',
        targetMetric: 'Minimum project value: ₹11,50,000; delivery window: 16 weeks',
        keyConstraints: [
          'Minimum project value: ₹11,50,000',
          'No compressed schedule below 16 weeks without scope reduction',
          'Client must provide product decisions and acceptance testers',
          'Two milestone payments required',
        ],
        personality: 'Collaborative',
        tacticalNotes:
          'Trades optional scope and shared responsibilities for a fixed date, realistic staffing, and milestone payment certainty.',
        openingStance:
          'We can commit to the 16-week launch for ₹14,00,000 with dedicated staffing. To reach the target budget, we need a phased scope, client-side acceptance testers, and milestone payments.',
      },
    ],
  },
];
