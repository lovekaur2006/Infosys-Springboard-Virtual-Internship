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
} from 'lucide-react';
import { AgentConfig, PersonalityType, ScenarioTemplate } from './types.ts';
import { PREBUILT_SCENARIOS } from './data/scenarios.ts';
import { validateConfiguration } from './services/negotiationEngine.ts';
import {
  initAuth,
  googleSignIn,
  demoSignIn,
  logout,
  CalendarUser,
} from './services/authService.ts';
import {
  CalendarEventPayload,
  createCalendarEvent,
} from './services/calendarService.ts';

import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Stepper } from './components/Stepper.tsx';
import { ScenarioSelectionScreen } from './components/ScenarioSelectionScreen.tsx';
import { AgentConfigurationScreen } from './components/AgentConfigurationScreen.tsx';
import { ReviewStartScreen } from './components/ReviewStartScreen.tsx';
import { NegotiationArena } from './components/NegotiationArena.tsx';
import { ReportsScreen } from './components/ReportsScreen.tsx';
import { CalendarScheduleModal } from './components/CalendarScheduleModal.tsx';
import { CalendarConfirmModal } from './components/CalendarConfirmModal.tsx';
import { CalendarEventListModal } from './components/CalendarEventListModal.tsx';

export default function App() {
  // Scenario & Agents State
  const [selectedScenario, setSelectedScenario] = useState<ScenarioTemplate>(
    PREBUILT_SCENARIOS[0]
  );
  const [configuredAgents, setConfiguredAgents] = useState<AgentConfig[]>(
    JSON.parse(JSON.stringify(PREBUILT_SCENARIOS[0].defaultAgents))
  );

  // Active View Tab
  const [activeTab, setActiveTab] = useState<NavTab>('scenarios');

  // Mobile sidebar open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Google Calendar Auth State
  const [user, setUser] = useState<CalendarUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Calendar Modal States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEventListModalOpen, setIsEventListModalOpen] = useState(false);
  const [pendingCalendarEvent, setPendingCalendarEvent] =
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

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Scenario Selection (Dynamic Loading & Mapping)
  const handleSelectScenario = (scenario: ScenarioTemplate) => {
    setSelectedScenario(scenario);
    setConfiguredAgents(JSON.parse(JSON.stringify(scenario.defaultAgents)));
    showToast('info', `Loaded "${scenario.title}" with ${scenario.defaultAgents.length} agents.`);
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
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast('success', `Signed in as ${result.user.displayName || result.user.email}`);
      }
    } catch (err: any) {
      console.error(err);
      const code = err?.code || '';
      const message =
        code === 'auth/popup-blocked'
          ? 'Google sign-in popup was blocked. Allow popups for this site and try again.'
          : code === 'auth/popup-closed-by-user'
          ? 'Google sign-in was cancelled.'
          : code === 'auth/access-denied'
          ? 'Access Blocked: Authorization Error. In Google Cloud Console, add your Gmail under OAuth Consent Screen > Test Users, and add http://localhost:3000 to Authorized JavaScript Origins. Alternatively, click "Demo Mode" below.'
          : code === 'auth/unauthorized-domain'
          ? 'Domain not authorized. Add localhost to Authorized JavaScript Origins.'
          : err?.message || 'Google Sign-In failed.';
      showToast('error', message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Demo Sign-In Flow for offline testing and evaluation
  const handleDemoSignIn = () => {
    const result = demoSignIn();
    setUser(result.user);
    setAccessToken(result.accessToken);
    showToast('success', 'Demo Calendar Mode activated! You can test session scheduling.');
  };

  // Google Sign-Out Flow
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('info', 'Signed out from Google Calendar.');
  };

  // Open the schedule form immediately; Google sign-in happens on confirm if needed.
  const handleOpenScheduleFlow = () => {
    setIsEventListModalOpen(false);
    setIsScheduleModalOpen(true);
  };

  const ensureGoogleAccessToken = async (): Promise<string | null> => {
    if (accessToken) return accessToken;

    setIsLoadingAuth(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast('success', `Signed in as ${result.user.displayName || result.user.email}`);
        return result.accessToken;
      }
      return null;
    } catch (err: any) {
      console.error(err);
      const code = err?.code || '';
      const message =
        code === 'auth/popup-blocked'
          ? 'Google sign-in popup was blocked. Allow popups for this site and try again.'
          : code === 'auth/popup-closed-by-user'
          ? 'Google sign-in was cancelled before Calendar access was granted.'
          : code === 'auth/access-denied'
          ? 'Access blocked: The OAuth client is not configured for this origin. Add http://localhost:3000 to Authorized JavaScript Origins in Google Cloud Console > APIs & Services > Credentials.'
          : code === 'auth/unauthorized-domain'
          ? 'This domain is not authorized. Add localhost in authorized domains.'
          : err?.message || 'Google Sign-In failed.';
      showToast('error', message);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-[#0A1628] text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
            MA
          </div>
          <span className="font-bold text-sm">Negotiation Simulator</span>
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
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isLoadingAuth={isLoadingAuth}
          onOpenCalendarEvents={() => setIsEventListModalOpen(true)}
          onDemoSignIn={handleDemoSignIn}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 lg:p-10 space-y-8">
          {/* Top Stepper (Rendered during workflow views) */}
          {(activeTab === 'scenarios' ||
            activeTab === 'config' ||
            activeTab === 'review' ||
            activeTab === 'home') && (
            <Stepper
              currentStep={currentStepperStep}
              onSelectStep={handleSelectStepperStep}
              selectedScenario={selectedScenario}
              onSelectScenario={handleSelectScenario}
            />
          )}

          {/* Screen 1: Choose Negotiation Scenario */}
          {(activeTab === 'scenarios' || activeTab === 'home') && (
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
              isCalendarConnected={Boolean(accessToken)}
            />
          )}

          {/* Screen 5: Reports */}
          {activeTab === 'reports' && (
            <ReportsScreen
              scenario={selectedScenario}
              agents={configuredAgents}
              onStartNegotiation={() => setActiveTab('negotiation')}
              onOpenScheduleModal={handleOpenScheduleFlow}
              isCalendarConnected={Boolean(accessToken)}
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
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
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
