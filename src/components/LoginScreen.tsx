import React from 'react';
import { ArrowRight, Bot, Check, ShieldCheck, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  isLoading: boolean;
  errorMessage?: string;
  onGoogleSignIn: () => void;
  onDemoSignIn: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  isLoading,
  errorMessage,
  onGoogleSignIn,
  onDemoSignIn,
}) => (
  <main className="pn-login min-h-screen bg-[#f6f7fb] p-4 text-[#17213a] sm:p-8">
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[#e5e8f0] bg-white shadow-[0_32px_90px_-48px_rgba(16,26,50,0.45)] sm:min-h-[calc(100dvh-4rem)] lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative flex min-h-[340px] flex-col justify-between overflow-hidden bg-[#101a32] p-7 text-white sm:p-10 lg:p-12">
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute bottom-12 right-24 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#a6f36a] text-[#12251c]"><Bot className="h-6 w-6" /></span>
          <span><span className="block text-base font-extrabold tracking-tight">ParleyNet</span><span className="block text-xs text-slate-300">Negotiation workspace</span></span>
        </div>
        <div className="relative mt-12 max-w-xl lg:mt-0">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c5d2ff]"><Sparkles className="h-3.5 w-3.5" /> Think clearly. Negotiate confidently.</div>
          <h1 className="max-w-lg text-4xl font-extrabold leading-[1.08] tracking-[-0.055em] sm:text-5xl">Make room for a better deal.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">Build a negotiation, give every participant a clear point of view, and see where the conversation can lead.</p>
          <div className="mt-8 grid gap-3 text-xs font-medium text-slate-200 sm:grid-cols-2">
            {['Scenario playbooks', 'Custom AI participants', 'Live negotiation arena', 'Clear outcome reports'].map((item) => <div key={item} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[#a6f36a]"><Check className="h-3 w-3" /></span>{item}</div>)}
          </div>
        </div>
        <div className="relative mt-10 flex items-center gap-2 text-[11px] text-slate-400 lg:mt-0"><ShieldCheck className="h-4 w-4 text-[#a6f36a]" /> Your workspace is ready when you are.</div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Welcome to ParleyNet</div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-[#17213a]">Sign in to continue</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Use your Google account to enter the workspace and connect calendar scheduling.</p>

          {errorMessage && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800">{errorMessage}</div>}

          <button type="button" onClick={onGoogleSignIn} disabled={isLoading} className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-[#101a32] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-[#1b2948] disabled:cursor-wait disabled:opacity-60">
            <svg className="h-5 w-5 rounded-full bg-white p-0.5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78z"/><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/></svg>
            {isLoading ? 'Connecting to Google…' : 'Continue with Google'}
            {!isLoading && <ArrowRight className="ml-auto h-4 w-4 text-[#a6f36a]" />}
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /> Or try it out <span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" onClick={onDemoSignIn} className="w-full rounded-xl border border-[#dfe3ed] bg-white px-4 py-3 text-sm font-bold text-[#17213a] transition hover:border-[#c5cce0] hover:bg-[#f8f9fc]">Enter demo workspace</button>
          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">Sign-in requests basic profile access. Calendar permission is requested separately when you use scheduling. Demo access works without Google setup.</p>
        </div>
      </section>
    </div>
  </main>
);
