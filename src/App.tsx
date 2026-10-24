/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

import {
  CheckCircle2,
  AlertCircle,
  Info,
  Menu,
  X,
  Calendar,
} from 'lucide-react';
import { AgentConfig, PersonalityType, ScenarioTemplate } from './types.ts';
import { PREBUILT_SCENARIOS } from './data/scenarios.ts';
import { validateConfiguration } from './services/negotiationEngine.ts';
import {
  initAuth,
  googleSignIn,
  googleCalendarSignIn,
  demoSignIn,
  logout,
  CalendarUser,
  getGoogleAuthErrorMessage,
  getGoogleIdentityToken,
} from './services/authService.ts';
import { syncGoogleUser } from './services/apiService';
import {
  CalendarEventPayload,
  createCalendarEvent,
} from './services/calendarService.ts';

import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Stepper } from './components/Stepper.tsx';
import { ScenarioSelectionScreen } from './components/ScenarioSelectionScreen.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { AgentConfigurationScreen } from './components/AgentConfigurationScreen.tsx';
import { ReviewStartScreen } from './components/ReviewStartScreen.tsx';
import { NegotiationArena } from './components/NegotiationArena.tsx';
import { ReportsScreen } from './components/ReportsScreen.tsx';
import { CalendarScheduleModal } from './components/CalendarScheduleModal.tsx';
import { CalendarConfirmModal } from './components/CalendarConfirmModal.tsx';
import { CalendarEventListModal } from './components/CalendarEventListModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';

const DEFAULT_JOB_ROLE = 'Software Engineer';
const DEFAULT_JOB_LEVEL = 'Senior';

const withJobProfile = (scenario: ScenarioTemplate, role: string, level: string): ScenarioTemplate => {
  if (scenario.id !== 'job-offer') return scenario;
  const baseScenario = PREBUILT_SCENARIOS.find((item) => item.id === 'job-offer') || scenario;
  const fullRole = `${level} ${role}`;
  return {
    ...baseScenario,
    detailedContext: baseScenario.detailedContext.replace(/Senior Engineer/g, fullRole),
    agentRolesText: `${fullRole}, Recruiter`,
    orchestrator: {
      ...baseScenario.orchestrator,
      arbitrationRules: baseScenario.orchestrator.arbitrationRules.map((rule) =>
        rule.replace('Grade L6 salary band', `${level} ${role} salary band`)
      ),
    },
    defaultAgents: baseScenario.defaultAgents.map((agent) => agent.id === 'candidate-ai-lead'
      ? {
          ...agent,
          roleTitle: fullRole,
          roleDescription: `Negotiates an offer for a ${fullRole} position, weighing compensation, career growth, benefits, and work flexibility.`,
        }
      : agent),
  };
};

export default function App() {
  // Scenario & Agents State
  const [selectedScenario, setSelectedScenario] = useState<ScenarioTemplate>(
    PREBUILT_SCENARIOS[0]
  );
  const [configuredAgents, setConfiguredAgents] = useState<AgentConfig[]>(
    JSON.parse(JSON.stringify(PREBUILT_SCENARIOS[0].defaultAgents))
  );
  const [jobRole, setJobRole] = useState(DEFAULT_JOB_ROLE);
  const [jobLevel, setJobLevel] = useState(DEFAULT_JOB_LEVEL);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Mobile sidebar open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Google Calendar Auth State
  const [user, setUser] = useState<CalendarUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isCalendarGranted, setIsCalendarGranted] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Calendar Modal States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEventListModalOpen, setIsEventListModalOpen] = useState(false);
  const [pendingCalendarEvent, setPendingCalendarEvent] =
    useState<CalendarEventPayload | null>(null);
  const [scheduledCalendarEvent, setScheduledCalendarEvent] =
    useState<CalendarEventPayload | null>(null);
  const [isSubmittingCalendar, setIsSubmittingCalendar] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Restore the in-memory Google identity session on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token, calendarGranted) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsCalendarGranted(calendarGranted);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsCalendarGranted(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Scenario Selection (Dynamic Loading & Mapping)
  const handleSelectScenario = (scenario: ScenarioTemplate) => {
    setScheduledCalendarEvent(null);
    if (scenario.id === 'job-offer') {
      setJobRole(DEFAULT_JOB_ROLE);
      setJobLevel(DEFAULT_JOB_LEVEL);
    }
    const nextScenario = scenario.id === 'job-offer'
      ? withJobProfile(scenario, DEFAULT_JOB_ROLE, DEFAULT_JOB_LEVEL)
      : scenario;
    setSelectedScenario(nextScenario);
    setConfiguredAgents(JSON.parse(JSON.stringify(nextScenario.defaultAgents)));
    showToast('info', `Loaded "${scenario.title}" with ${scenario.defaultAgents.length} agents.`);
  };

  const handleUpdateJobRole = (role: string, level: string) => {
    setJobRole(role);
    setJobLevel(level);
    const nextScenario = withJobProfile(selectedScenario, role, level);
    setSelectedScenario(nextScenario);
    setConfiguredAgents((previous) => previous.map((agent) => agent.id === 'candidate-ai-lead'
      ? {
          ...agent,
          roleTitle: `${level} ${role}`,
          roleDescription: `Negotiates an offer for a ${level} ${role} position, weighing compensation, career growth, benefits, and work flexibility.`,
        }
      : agent));
  };

  // Modify personality for an agent
  const handleUpdatePersonality = (agentId: string, personality: PersonalityType) => {
    setConfiguredAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId ? { ...agent, personality } : agent
      )
    );
    showToast('info', `Updated personality to ${personality}.`);
  };

  // Modify primary goal for an agent
  const handleUpdateGoal = (agentId: string, newGoal: string, newMetric: string) => {
    setConfiguredAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? { ...agent, primaryGoal: newGoal, targetMetric: newMetric }
          : agent
      )
    );
    showToast('success', 'Agent objective updated.');
  };

  // Add a constraint to an agent
  const handleAddConstraint = (agentId: string, constraint: string) => {
    setConfiguredAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? { ...agent, keyConstraints: [...agent.keyConstraints, constraint] }
          : agent
      )
    );
    showToast('info', 'New negotiation boundary added.');
  };

  // Remove a constraint from an agent
  const handleRemoveConstraint = (agentId: string, index: number) => {
    setConfiguredAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              keyConstraints: agent.keyConstraints.filter((_, i) => i !== index),
            }
          : agent
      )
    );
  };

  // Google Sign-In Flow
  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    try {
      const result = await googleSignIn();
      if (result) {
        const identityToken = getGoogleIdentityToken();
        if (identityToken) {
          // Sync user profile to the backend DB. This is best-effort — a missing
          // API server (e.g. local dev without Docker) should not block sign-in.
          try {
            await syncGoogleUser(identityToken);
          } catch (apiErr: any) {
            console.warn('Could not sync user to backend API (is the server running?):', apiErr?.message);
          }
        }
        setUser(result.user);
        setAccessToken(result.accessToken);
        setIsCalendarGranted(true); // Calendar scope granted alongside Google sign-in
        showToast('success', `Signed in as ${result.user.displayName || result.user.email}. Google Calendar is connected.`);
      }
    } catch (err: any) {
      // Do not keep a browser session if Google auth itself fails.
      await logout();
      console.error(err);
      showToast('error', getGoogleAuthErrorMessage(err));
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Demo Sign-In Flow for offline testing and evaluation
  const handleDemoSignIn = () => {
    const result = demoSignIn();
    setUser(result.user);
    setAccessToken(result.accessToken);
    setIsCalendarGranted(true); // Demo mode activates calendar features
    showToast('success', 'Demo Calendar Mode activated! You can test session scheduling.');
  };

  // Google Sign-Out Flow
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setIsCalendarGranted(false);
    showToast('info', 'Signed out from Google Calendar.');
  };

  // Open the schedule form immediately; refresh Calendar access on confirm if needed.
  const handleOpenScheduleFlow = () => {
    setIsEventListModalOpen(false);
    setIsScheduleModalOpen(true);
  };

  const ensureGoogleAccessToken = async (): Promise<string | null> => {
    setIsLoadingAuth(true);
    try {
      const result = await googleCalendarSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setIsCalendarGranted(true);
        showToast('success', `Signed in as ${result.user.displayName || result.user.email}`);
        return result.accessToken;
      }
      return null;
    } catch (err: any) {
      console.error(err);
      showToast('error', getGoogleAuthErrorMessage(err));
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleOpenCalendarEvents = async () => {
    const token = await ensureGoogleAccessToken();
    if (token) setIsEventListModalOpen(true);
  };

  // Handler when schedule modal submits and needs explicit user confirmation
  const handleTriggerConfirmation = (event: CalendarEventPayload) => {
    setPendingCalendarEvent(event);
    setIsScheduleModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  // Confirmed Google Calendar event mutation
  const handleConfirmCalendarCreation = async () => {
    if (!pendingCalendarEvent) return;

    const token = await ensureGoogleAccessToken();
    if (!token) return;

    setIsSubmittingCalendar(true);
    try {
      const createdEvent = await createCalendarEvent(token, pendingCalendarEvent);
      setScheduledCalendarEvent(pendingCalendarEvent);
      setIsConfirmModalOpen(false);
      setPendingCalendarEvent(null);
      showToast(
        'success',
        `Scheduled "${createdEvent.summary}" successfully in Google Calendar!`
      );
    } catch (err: any) {
      console.error(err);
      showToast('error', `Failed to schedule event: ${err.message}`);
    } finally {
      setIsSubmittingCalendar(false);
    }
  };

  // Validate configuration in real-time
  const validation = validateConfiguration(selectedScenario, configuredAgents);

  // Stepper step resolver
  const currentStepperStep: 1 | 2 | 3 =
    activeTab === 'home' || activeTab === 'scenarios'
      ? 1
      : activeTab === 'config'
      ? 2
      : 3;

  const handleSelectStepperStep = (step: 1 | 2 | 3) => {
    if (step === 1) setActiveTab('scenarios');
    else if (step === 2) setActiveTab('config');
    else if (step === 3) setActiveTab('review');
  };

  if (!user) {
    return (
      <LoginScreen
        isLoading={isLoadingAuth}
        errorMessage={toast?.type === 'error' ? toast.message : undefined}
        onGoogleSignIn={handleSignIn}
        onDemoSignIn={handleDemoSignIn}
      />
    );
  }

  return (
    <div className="pn-shell min-h-screen bg-[#f6f7fb] text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-[#101a32] text-white p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#a6f36a] text-[#12251c] flex items-center justify-center font-extrabold text-sm">
            PN
          </div>
          <span className="font-bold text-sm">ParleyNet</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Sidebar */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block z-30`}>
        <Sidebar
          activeTab={activeTab}
          isCalendarConnected={isCalendarGranted}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isLoadingAuth={isLoadingAuth}
          onOpenCalendarEvents={handleOpenCalendarEvents}
          onDemoSignIn={handleDemoSignIn}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f5f7f6]">
        <div className="hidden md:block border-b border-[#e6e9f0] bg-white/85 backdrop-blur-sm">
          <div className="mx-auto flex h-[62px] max-w-7xl items-center justify-between px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#101a32] text-[10px] font-black tracking-tight text-[#a6f36a]">PN</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">ParleyNet <span className="mx-1.5 text-slate-300">/</span> Workspace</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:block max-w-[240px] truncate text-xs font-semibold text-slate-500">{selectedScenario.title}</div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe7d3] bg-[#f2f8ed] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#3e672e]"><span className="h-1.5 w-1.5 rounded-full bg-[#73be4f]" /> Workspace ready</span>
              <button onClick={handleOpenCalendarEvents} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-teal-300 hover:text-teal-800" aria-label="Open calendar"><Calendar className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="pn-content flex-1 max-w-7xl w-full mx-auto px-4 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-12 lg:px-10 lg:pt-14 space-y-8">
          {/* Top Stepper (Rendered during workflow views) */}
          {(activeTab === 'scenarios' ||
            activeTab === 'config' ||
            activeTab === 'review') && (
            <Stepper
              currentStep={currentStepperStep}
              onSelectStep={handleSelectStepperStep}
              selectedScenario={selectedScenario}
              onSelectScenario={handleSelectScenario}
            />
          )}

          {/* Screen 1: Choose Negotiation Scenario */}
          {activeTab === 'home' && (
            <HomeDashboard
              selectedScenario={selectedScenario}
              onSelectScenario={handleSelectScenario}
              onStart={() => setActiveTab('config')}
              onViewScenarios={() => setActiveTab('scenarios')}
            />
          )}

          {activeTab === 'scenarios' && (
            <ScenarioSelectionScreen
              selectedScenario={selectedScenario}
              onSelectScenario={handleSelectScenario}
              onProceedToConfig={() => setActiveTab('config')}
            />
          )}

          {/* Screen 2: Configure Agents */}
          {activeTab === 'config' && (
            <AgentConfigurationScreen
              scenario={selectedScenario}
              agents={configuredAgents}
              jobRole={jobRole}
              jobLevel={jobLevel}
              onUpdateJobRole={handleUpdateJobRole}
              validation={validation}
              onUpdatePersonality={handleUpdatePersonality}
              onUpdateGoal={handleUpdateGoal}
              onAddConstraint={handleAddConstraint}
              onRemoveConstraint={handleRemoveConstraint}
              onProceedToReview={() => setActiveTab('review')}
              onStartNegotiation={() => setActiveTab('negotiation')}
            />
          )}

          {/* Screen 3: Review & Start / Loaded Preview */}
          {activeTab === 'review' && (
            <ReviewStartScreen
              scenario={selectedScenario}
              agents={configuredAgents}
              onBackToConfig={() => setActiveTab('config')}
              onStartNegotiation={() => setActiveTab('negotiation')}
              onUpdatePersonality={handleUpdatePersonality}
            />
          )}

          {/* Screen 4: Live Negotiation Arena */}
          {activeTab === 'negotiation' && (
            <NegotiationArena
              scenario={selectedScenario}
              agents={configuredAgents}
              onBackToConfig={() => setActiveTab('config')}
              onOpenScheduleModal={handleOpenScheduleFlow}
              isCalendarConnected={isCalendarGranted}
            />
          )}

          {/* Screen 5: Reports */}
          {activeTab === 'reports' && (
            <ReportsScreen
              scenario={selectedScenario}
              agents={configuredAgents}
              scheduledEvent={scheduledCalendarEvent}
              onStartNegotiation={() => setActiveTab('negotiation')}
              onOpenScheduleModal={handleOpenScheduleFlow}
              isCalendarConnected={isCalendarGranted}
            />
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 max-w-md animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-teal-50 border-teal-400 text-teal-900'
          }`}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-teal-700 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
        </div>
      )}

      {/* Google Calendar Modals */}
      <CalendarScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        scenario={selectedScenario}
        agents={configuredAgents}
        onTriggerConfirmation={handleTriggerConfirmation}
      />

      <CalendarConfirmModal
        isOpen={isConfirmModalOpen}
        eventDetails={pendingCalendarEvent}
        onConfirm={handleConfirmCalendarCreation}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setPendingCalendarEvent(null);
        }}
        isSubmitting={isSubmittingCalendar}
      />

      <CalendarEventListModal
        isOpen={isEventListModalOpen}
        onClose={() => setIsEventListModalOpen(false)}
        accessToken={accessToken}
        onOpenScheduleModal={handleOpenScheduleFlow}
      />
    </div>
  );
}
