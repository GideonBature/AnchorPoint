import { useState } from 'react';
import { ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RequirementList } from './RequirementList';
import type { UiConfig } from '../types';

const STEP_LABELS = [
  'Select Asset',
  'Identity Verification',
  'Transaction Complete',
] as const;

export const SEP24Flow = ({ type, uiConfig }: { type: 'deposit' | 'withdraw'; uiConfig: UiConfig }) => {
  const [step, setStep] = useState(1);
  const transactionFields = uiConfig.fieldRequirements[type];
  const flowLabel = type === 'deposit' ? 'Deposit' : 'Withdrawal';

  return (
    <div className="mx-auto max-w-4xl glass-card p-6 sm:p-8">
      {/* Live region announces step changes to screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Step ${step} of 3: ${STEP_LABELS[step - 1]}`}
      </div>

      {/* Step indicator */}
      <nav
        className="mb-8 flex justify-between"
        aria-label={`${flowLabel} progress`}
      >
        <ol className="flex w-full justify-between list-none p-0 m-0">
          {([1, 2, 3] as const).map((s) => (
            <li key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all ${
                  step >= s
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-slate-800 text-slate-500'
                }`}
                aria-label={`Step ${s} of 3: ${STEP_LABELS[s - 1]}${
                  step === s ? ' (current)' : step > s ? ' (completed)' : ''
                }`}
                aria-current={step === s ? 'step' : undefined}
              >
                <span aria-hidden="true">{s}</span>
              </div>
              {s < 3 && (
                <div
                  className={`mx-2 h-1 w-20 rounded bg-slate-800 transition-colors ${step > s ? 'bg-primary' : ''}`}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-select-asset"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
          >
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">{flowLabel} Assets</h2>
              <p className="text-slate-400">
                The anchor is supplying the field requirements for this flow from the backend configuration.
              </p>
              <div
                className="grid grid-cols-1 gap-3"
                role="list"
                aria-label={`Available assets for ${flowLabel.toLowerCase()}`}
              >
                {(['USDC', 'EURT', 'ARST'] as const).map((asset) => (
                  <button
                    key={asset}
                    role="listitem"
                    onClick={() => setStep(2)}
                    aria-label={`Select ${asset} for ${flowLabel.toLowerCase()}`}
                    className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-4 transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary"
                        aria-hidden="true"
                      >
                        {asset[0]}
                      </div>
                      <span>{asset}</span>
                    </div>
                    <ArrowUpRight size={18} className="text-slate-500" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <RequirementList
              title={`${flowLabel} Requirements`}
              fields={transactionFields}
            />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-kyc"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Identity Verification</h2>
              <p className="text-slate-400">
                KYC requirements are also backend-driven, so each anchor can tighten or relax the form without redeploying the dashboard.
              </p>
              <div className="aspect-video rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
                <div className="flex h-full flex-col items-center justify-center">
                  <ShieldCheck size={48} className="mb-4 text-primary" aria-hidden="true" />
                  <p className="font-medium text-slate-300">{uiConfig.brandName} Secure KYC</p>
                  <p className="mt-2 text-sm text-slate-500">Placeholder for SEP-12 interactive webview</p>
                  <button
                    onClick={() => setStep(3)}
                    className="btn-primary mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label="Launch KYC verification portal"
                  >
                    Launch KYC Portal
                  </button>
                </div>
              </div>
            </div>

            <RequirementList title="KYC Requirements" fields={uiConfig.fieldRequirements.kyc} />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500"
              role="img"
              aria-label="Transaction submitted successfully"
            >
              <CheckCircle2 size={40} aria-hidden="true" />
            </div>
            <h2 className="mb-2 font-display text-3xl font-bold">Transaction Initiated</h2>
            <p className="mb-8 text-slate-400">
              Your {flowLabel.toLowerCase()} request has been submitted with {uiConfig.brandName} branding and field
              rules pulled from the backend.
            </p>
            <button
              onClick={() => setStep(1)}
              className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Back to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SEP24Flow;
