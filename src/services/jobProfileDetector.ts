/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentConfig, ScenarioTemplate, PersonalityType } from '../types.ts';
import { PREBUILT_SCENARIOS } from '../data/scenarios.ts';

export interface JobBenchmark {
  candidateFloor: number;
  candidateTarget: number;
  recruiterMin: number;
  recruiterMax: number;
  signingBonus: number;
  equitySummary: string;
  currency: string;
}

export interface JobRoleProfile {
  role: string;
  level: string;
  fullTitle: string;
  department: string;
  domain: string;
  benchmarks: JobBenchmark;
  candidateRoleDescription: string;
  candidateGoal: string;
  candidateTargetMetric: string;
  candidateConstraints: string[];
  candidateOpeningStance: string;
  recruiterRoleTitle: string;
  recruiterRoleDescription: string;
  recruiterGoal: string;
  recruiterTargetMetric: string;
  recruiterConstraints: string[];
  recruiterOpeningStance: string;
  dealZoneSummary: {
    batnaBuyer: string;
    batnaSeller: string;
    targetOverlaps: string;
  };
  arbitrationRules: string[];
  suggestedCandidatePersonality: PersonalityType;
  suggestedRecruiterPersonality: PersonalityType;
}

export const STANDARD_JOB_ROLES = [
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'UX/UI Designer',
  'Cybersecurity Analyst',
  'Marketing Manager',
  'Sales Executive',
  'HR Specialist',
  'Finance Analyst',
  'Operations Manager',
  'Customer Support Specialist',
] as const;

export const STANDARD_JOB_LEVELS = [
  'Intern',
  'Entry-level',
  'Mid-level',
  'Senior',
  'Lead / Principal',
  'Manager',
  'Director',
  'Vice President',
  'Executive / C-suite',
] as const;

interface DomainInfo {
  department: string;
  domain: string;
  baseSalary: number; // For Senior level benchmark
  factor: number;
  perks: {
    candidate: string[];
    recruiter: string[];
    specialTerms: string[];
  };
}

const DOMAIN_CATALOG: Record<string, DomainInfo> = {
  'Software Engineer': {
    department: 'Engineering & Technology',
    domain: 'Software Architecture & Cloud Systems',
    baseSalary: 10_00_000,
    factor: 1.0,
    perks: {
      candidate: [
        'Remote / Hybrid work flexibility (minimum 2 days WFH)',
        'Dedicated workstation and cloud lab infrastructure',
        'Annual tech conference and certification budget',
      ],
      recruiter: [
        'Hybrid collaboration (at least 2 days on-site for architecture reviews)',
        'Standard 30-day notice period joining timeline',
        'Commitment to production on-call rotation schedule',
      ],
      specialTerms: ['Annual tech learning stipend: ₹50,000', 'Home office setup: ₹25,000'],
    },
  },
  'Data Scientist': {
    department: 'AI & Data Intelligence',
    domain: 'Machine Learning & Predictive Modeling',
    baseSalary: 11_00_000,
    factor: 1.1,
    perks: {
      candidate: [
        'Dedicated GPU compute cluster quota for model development',
        'Remote work flexibility with quarterly research offsites',
        'Academic publication and open-source contribution rights',
      ],
      recruiter: [
        'Demonstrated experience shipping production ML/LLM pipelines',
        'Hybrid office alignment for sprint demo cycles',
        'IP protection and proprietary algorithm non-disclosure',
      ],
      specialTerms: ['Dedicated GPU quota: 200 hours/mo', 'Research conference allowance: ₹60,000'],
    },
  },
  'Product Manager': {
    department: 'Product & Growth',
    domain: 'Product Strategy & Customer Experience',
    baseSalary: 10_50_000,
    factor: 1.05,
    perks: {
      candidate: [
        'Product roadmap ownership and direct squad leadership',
        'Quarterly performance-linked bonus milestones',
        'Flexible working hours and travel allowance',
      ],
      recruiter: [
        'On-site stakeholder alignment with sales and executive teams',
        'Demonstrable track record hitting ARR expansion OKRs',
        'Customer visit travel requirement (up to 20%)',
      ],
      specialTerms: ['Quarterly performance bonus: up to 15%', 'Travel allowance covered'],
    },
  },
  'UX/UI Designer': {
    department: 'Design & Customer Experience',
    domain: 'Design Systems & User Research',
    baseSalary: 9_00_000,
    factor: 0.9,
    perks: {
      candidate: [
        'High-performance design hardware and tablet setup',
        'Flexible hybrid schedule with remote design focus days',
        'Design community & Figma enterprise conference sponsorship',
      ],
      recruiter: [
        'Portfolio alignment with enterprise design tokens and accessibility',
        'In-person usability testing observation sessions',
        'Immediate joining preference within 30 days',
      ],
      specialTerms: ['Hardware stipend: ₹40,000', 'Design license suite fully paid'],
    },
  },
  'Cybersecurity Analyst': {
    department: 'Security & Infrastructure',
    domain: 'Information Security & Compliance',
    baseSalary: 10_50_000,
    factor: 1.05,
    perks: {
      candidate: [
        'Sponsorship for CISSP, CISM, or CEH professional credentials',
        'Compensatory off and shift allowance for incident response drills',
        'Remote-friendly security operations center (SOC) tooling',
      ],
      recruiter: [
        'Strict adherence to SOC-2 Type II and ISO-27001 regulatory frameworks',
        'Available on-call roster during critical security vulnerabilities',
        'Verified background check and clearance validation',
      ],
      specialTerms: ['Certification allowance: ₹75,000', 'On-call standby allowance: ₹20,000/mo'],
    },
  },
  'Marketing Manager': {
    department: 'Brand & Growth',
    domain: 'Demand Generation & Brand Marketing',
    baseSalary: 8_50_000,
    factor: 0.85,
    perks: {
      candidate: [
        'Campaign creative ownership and growth experiment budget',
        'Performance bonus linked to qualified pipeline growth (MQLs)',
        'Hybrid schedule with 2-3 days work from home',
      ],
      recruiter: [
        'Demonstrable CAC reduction and conversion optimization metrics',
        'Attendance at key industry expos and brand launches',
        'Immediate joining timeline for Q3 campaign rollout',
      ],
      specialTerms: ['Pipeline commission bonus: 10% OTE', 'Marketing tool subscriptions provided'],
    },
  },
  'Sales Executive': {
    department: 'Commercial & Revenue',
    domain: 'Enterprise Sales & Business Development',
    baseSalary: 8_50_000,
    factor: 0.85,
    perks: {
      candidate: [
        'Aggressive uncapped commission structure with quarterly accelerators',
        'Client entertainment and corporate travel expense allowance',
        'Flexible field hours and remote deal management',
      ],
      recruiter: [
        'Verified quota attainment history (min 100% of target)',
        'In-person attendance at major enterprise client pitches',
        'Strict milestone pipeline tracking in CRM',
      ],
      specialTerms: ['Uncapped commission: 40% OTE split', 'Corporate travel expense card'],
    },
  },
  'HR Specialist': {
    department: 'People & Culture',
    domain: 'Talent Acquisition & Employee Operations',
    baseSalary: 8_00_000,
    factor: 0.8,
    perks: {
      candidate: [
        'People analytics tooling and modern HRIS stack access',
        'Work-life wellness stipend and continuous learning benefits',
        'Hybrid working flexibility with 2 days remote',
      ],
      recruiter: [
        'Proven time-to-hire and employee retention improvement records',
        'On-site presence during campus hiring and quarterly onboarding weeks',
        'Discretion and compliance with labor regulations',
      ],
      specialTerms: ['HR certification subsidy: ₹30,000', 'Wellness stipend: ₹15,000'],
    },
  },
  'Finance Analyst': {
    department: 'Corporate Finance',
    domain: 'Financial Planning & Quantitative Analysis',
    baseSalary: 9_50_000,
    factor: 0.95,
    perks: {
      candidate: [
        'Chartered / CFA exam preparation support and study leave',
        'Annual retention performance bonus',
        'Flexible hours during non-close fiscal periods',
      ],
      recruiter: [
        'Mandatory on-site attendance during month-end and quarterly financial closes',
        'High proficiency in financial modeling and ERP systems',
        'Clearance for confidential financial reporting',
      ],
      specialTerms: ['CFA/CPA tuition grant: ₹60,000', 'Year-end financial close bonus'],
    },
  },
  'Operations Manager': {
    department: 'Global Operations',
    domain: 'Process Optimization & Supply Chain',
    baseSalary: 8_50_000,
    factor: 0.85,
    perks: {
      candidate: [
        'Operational efficiency budget and software automation mandate',
        'Quarterly throughput improvement bonus',
        'Hybrid scheduling with on-site facility supervision balance',
      ],
      recruiter: [
        'Strict SLA enforcement and vendor turnaround benchmarks',
        'Crisis management availability for logistics disruptions',
        'Demonstrated Six Sigma or Lean operational certification',
      ],
      specialTerms: ['Operational efficiency bonus: 12%', 'Site travel allowance included'],
    },
  },
  'Customer Support Specialist': {
    department: 'Customer Experience',
    domain: 'Client Success & Technical Support',
    baseSalary: 6_50_000,
    factor: 0.65,
    perks: {
      candidate: [
        'Fully remote working arrangement with broadband stipend',
        'Structured 40-hour rotational shifts with overtime pay',
        'CSAT excellence rewards and quarterly skill progression bonus',
      ],
      recruiter: [
        'Commitment to guaranteed First Response Time and CSAT > 90%',
        'Rotational weekend coverage capability',
        'Immediate joining readiness within 14 calendar days',
      ],
      specialTerms: ['Broadband & home office allowance: ₹18,000/yr', 'CSAT quarterly incentive'],
    },
  },
};

const LEVEL_MULTIPLIERS: Record<string, { multiplier: number; signingBonus: number; equityTier: string }> = {
  Intern: {
    multiplier: 0.35,
    signingBonus: 10_000,
    equityTier: 'No equity; full-time pre-placement offer (PPO) consideration',
  },
  'Entry-level': {
    multiplier: 0.60,
    signingBonus: 25_000,
    equityTier: 'Standard employee stock options (₹50,000 over 4 years)',
  },
  'Mid-level': {
    multiplier: 0.85,
    signingBonus: 40_000,
    equityTier: 'Grant of ₹1,00,000 equity options vesting over 4 years',
  },
  Senior: {
    multiplier: 1.00,
    signingBonus: 50_000,
    equityTier: 'Grant of ₹1,40,000 - ₹2,00,000 in equity stock units',
  },
  'Lead / Principal': {
    multiplier: 1.45,
    signingBonus: 1_00_000,
    equityTier: 'Significant grant: ₹3,50,000 - ₹5,00,000 equity with 1-year cliff',
  },
  Manager: {
    multiplier: 1.35,
    signingBonus: 80_000,
    equityTier: 'Management equity pool: ₹3,00,000 over 4-year schedule',
  },
  Director: {
    multiplier: 1.95,
    signingBonus: 1_50_000,
    equityTier: 'Senior leadership equity: ₹8,00,000 with performance accelerators',
  },
  'Vice President': {
    multiplier: 2.60,
    signingBonus: 2_50_000,
    equityTier: 'Executive equity package: ₹15,00,000 with change-of-control vesting',
  },
  'Executive / C-suite': {
    multiplier: 3.50,
    signingBonus: 4_00_000,
    equityTier: 'C-Suite equity allocation: ₹30,00,000+ with board acceleration clauses',
  },
};

/**
 * Intelligent parser: extracts job role and seniority level from free-form text or structured input.
 */
export function detectJobProfile(input: string | { role: string; level: string }): JobRoleProfile {
  let matchedRole = 'Software Engineer';
  let matchedLevel = 'Senior';

  if (typeof input === 'object' && input !== null) {
    matchedRole = input.role || 'Software Engineer';
    matchedLevel = input.level || 'Senior';
  } else if (typeof input === 'string') {
    const text = input.trim();
    const lower = text.toLowerCase();

    // 1. Detect Level
    if (/intern|student|trainee|apprentice/i.test(lower)) {
      matchedLevel = 'Intern';
    } else if (/entry|junior|jr|graduate|associate|fresh/i.test(lower)) {
      matchedLevel = 'Entry-level';
    } else if (/mid|intermediate|experienced/i.test(lower)) {
      matchedLevel = 'Mid-level';
    } else if (/c-suite|cfo|cto|ceo|coo|chief|executive/i.test(lower)) {
      matchedLevel = 'Executive / C-suite';
    } else if (/\bvp\b|vice president|evp|svp/i.test(lower)) {
      matchedLevel = 'Vice President';
    } else if (/director|head of/i.test(lower)) {
      matchedLevel = 'Director';
    } else if (/manager|mgmt|lead manager/i.test(lower) && !/product manager/i.test(lower)) {
      matchedLevel = 'Manager';
    } else if (/lead|principal|staff|distinguished|architect/i.test(lower)) {
      matchedLevel = 'Lead / Principal';
    } else if (/senior|sr/i.test(lower)) {
      matchedLevel = 'Senior';
    }

    // 2. Detect Role
    if (/data scientist|data science|ai|machine learning|ml|deep learning|nlp|llm/i.test(lower)) {
      matchedRole = 'Data Scientist';
    } else if (/product manager|product management|pm|product lead/i.test(lower)) {
      matchedRole = 'Product Manager';
    } else if (/ux|ui|designer|design|interaction|visual designer/i.test(lower)) {
      matchedRole = 'UX/UI Designer';
    } else if (/security|cyber|infosec|soc|penetration|compliance/i.test(lower)) {
      matchedRole = 'Cybersecurity Analyst';
    } else if (/marketing|growth|seo|brand|content|campaign/i.test(lower)) {
      matchedRole = 'Marketing Manager';
    } else if (/sales|account exec|bd|business dev|commercial/i.test(lower)) {
      matchedRole = 'Sales Executive';
    } else if (/hr|talent|people|human resources|recruiting|recruiter/i.test(lower)) {
      matchedRole = 'HR Specialist';
    } else if (/finance|financial|accountant|accounting|fp&a|analyst/i.test(lower)) {
      matchedRole = 'Finance Analyst';
    } else if (/operation|supply chain|logistics|process/i.test(lower)) {
      matchedRole = 'Operations Manager';
    } else if (/support|customer service|customer success|csat|client care/i.test(lower)) {
      matchedRole = 'Customer Support Specialist';
    } else if (/software|developer|engineer|devops|sre|frontend|backend|fullstack|cloud/i.test(lower)) {
      matchedRole = 'Software Engineer';
    }
  }

  // Fallback defaults if unmatched
  const domainInfo = DOMAIN_CATALOG[matchedRole] || DOMAIN_CATALOG['Software Engineer'];
  const levelInfo = LEVEL_MULTIPLIERS[matchedLevel] || LEVEL_MULTIPLIERS['Senior'];

  // Compute calculated benchmarks
  const baseSalary = domainInfo.baseSalary * levelInfo.multiplier;
  const candidateTarget = Math.round(baseSalary * 1.05 / 10_000) * 10_000;
  const candidateFloor = Math.round(baseSalary * 0.90 / 10_000) * 10_000;
  const recruiterMin = Math.round(baseSalary * 0.85 / 10_000) * 10_000;
  const recruiterMax = Math.round(baseSalary * 1.05 / 10_000) * 10_000;
  const signingBonus = levelInfo.signingBonus;
  const fullTitle = `${matchedLevel} ${matchedRole}`;

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  // Build tailored Candidate Profile
  const candidateRoleDescription = `Negotiates compensation and career development for a ${fullTitle} position at Apex Robotics, balancing base salary, equity incentives, signing bonus, and workplace flexibility.`;
  const candidateGoal = `Secure competitive compensation of at least ${fmt(candidateFloor)} (target: ${fmt(candidateTarget)}) with joining bonus and work arrangement flexibility.`;
  const candidateTargetMetric = `Target: ${fmt(candidateTarget)} package (Floor: ${fmt(candidateFloor)})`;

  const candidateConstraints = [
    `Minimum expected salary: ${fmt(candidateFloor)}`,
    ...domainInfo.perks.candidate,
    `Joining bonus: ${fmt(signingBonus)} (preferred)`,
  ];

  const candidateOpeningStance = `I am enthusiastic about the ${fullTitle} position at Apex Robotics. Given my background and current market benchmarks for this caliber of role, my expectation is ${fmt(candidateTarget)} base with flexible work arrangements and standard equity participation.`;

  // Build tailored Recruiter Profile
  const recruiterRoleTitle = matchedLevel.includes('Executive') || matchedLevel.includes('Director') || matchedLevel.includes('Vice President')
    ? 'VP of Talent & People'
    : 'Talent Acquisition Partner';

  const recruiterRoleDescription = `Hires top talent for the ${fullTitle} requisition while adhering strictly to department compensation band guidelines and company timeline.`;
  const recruiterGoal = `Hire the right ${fullTitle} candidate within the approved department budget band of ${fmt(recruiterMin)} - ${fmt(recruiterMax)}.`;
  const recruiterTargetMetric = `Band: ${fmt(recruiterMin)} - ${fmt(recruiterMax)}`;

  const recruiterConstraints = [
    `Salary range: ${fmt(recruiterMin)} - ${fmt(recruiterMax)}`,
    ...domainInfo.perks.recruiter,
  ];

  const recruiterOpeningStance = `We are excited about your candidacy for the ${fullTitle} opening! Our approved department compensation band for this grade is ${fmt(recruiterMin)} to ${fmt(recruiterMax)}, accompanied by comprehensive healthcare, equity grants, and performance incentives.`;

  // Deal Zone & Arbitration
  const dealZoneSummary = {
    batnaBuyer: `Consider alternative qualified candidates in pipeline with 2-3 weeks onboarding delay.`,
    batnaSeller: `Explore competing offers from other technology firms offering comparable compensation stability.`,
    targetOverlaps: `Viable agreement between ${fmt(candidateFloor)} and ${fmt(recruiterMax)}, optimized with ${fmt(signingBonus)} signing bonus and hybrid work schedule.`,
  };

  const arbitrationRules = [
    `Moderate compensation discussion across Base Salary, Signing Bonus (${fmt(signingBonus)} standard), and Remote Flexibility`,
    `Check base salary ceiling against corporate Grade for ${fullTitle} (Cap: ${fmt(recruiterMax)})`,
    `Ensure candidate satisfaction clears minimum viability floor (${fmt(candidateFloor)}) to maintain long-term retention`,
    `Synthesize formal employment letter of intent upon bilateral agreement`,
  ];

  const suggestedCandidatePersonality: PersonalityType = 'Collaborative';
  const suggestedRecruiterPersonality: PersonalityType = 'Risk-Averse';

  return {
    role: matchedRole,
    level: matchedLevel,
    fullTitle,
    department: domainInfo.department,
    domain: domainInfo.domain,
    benchmarks: {
      candidateFloor,
      candidateTarget,
      recruiterMin,
      recruiterMax,
      signingBonus,
      equitySummary: levelInfo.equityTier,
      currency: 'INR',
    },
    candidateRoleDescription,
    candidateGoal,
    candidateTargetMetric,
    candidateConstraints,
    candidateOpeningStance,
    recruiterRoleTitle,
    recruiterRoleDescription,
    recruiterGoal,
    recruiterTargetMetric,
    recruiterConstraints,
    recruiterOpeningStance,
    dealZoneSummary,
    arbitrationRules,
    suggestedCandidatePersonality,
    suggestedRecruiterPersonality,
  };
}

/**
 * Automatically updates both the ScenarioTemplate and configured AgentConfigs based on the detected JobRoleProfile.
 */
export function generateJobOfferConfig(
  baseScenario: ScenarioTemplate,
  currentAgents: AgentConfig[],
  profile: JobRoleProfile
): { scenario: ScenarioTemplate; agents: AgentConfig[] } {
  const scenarioTemplate = PREBUILT_SCENARIOS.find((s) => s.id === 'job-offer') || baseScenario;

  const updatedScenario: ScenarioTemplate = {
    ...scenarioTemplate,
    detailedContext: `Apex Robotics is negotiating employment terms with an incoming ${profile.fullTitle}. The candidate brings specialized expertise in ${profile.domain}, while the department maintains internal equity within approved compensation bands for ${profile.department}.`,
    agentRolesText: `${profile.fullTitle}, ${profile.recruiterRoleTitle}`,
    dealZoneSummary: profile.dealZoneSummary,
    orchestrator: {
      ...scenarioTemplate.orchestrator,
      arbitrationRules: profile.arbitrationRules,
    },
  };

  const updatedAgents: AgentConfig[] = currentAgents.map((agent) => {
    if (agent.id === 'candidate-ai-lead') {
      return {
        ...agent,
        roleTitle: profile.fullTitle,
        roleDescription: profile.candidateRoleDescription,
        primaryGoal: profile.candidateGoal,
        targetMetric: profile.candidateTargetMetric,
        keyConstraints: profile.candidateConstraints,
        openingStance: profile.candidateOpeningStance,
      };
    }
    if (agent.id === 'employer-vp-eng') {
      return {
        ...agent,
        roleTitle: profile.recruiterRoleTitle,
        roleDescription: profile.recruiterRoleDescription,
        primaryGoal: profile.recruiterGoal,
        targetMetric: profile.recruiterTargetMetric,
        keyConstraints: profile.recruiterConstraints,
        openingStance: profile.recruiterOpeningStance,
      };
    }
    return agent;
  });

  return {
    scenario: updatedScenario,
    agents: updatedAgents,
  };
}

