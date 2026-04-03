'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, Trash2, FileDown, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { updateMarketingConsent, submitDataRightsRequest } from '@/app/legal/actions'
import { LEGAL_POLICY_VERSION } from '@/lib/legal/constants'

type Role = 'athlete' | 'coach' | 'individual'

type LegalControlsPanelProps = {
  role: Role
  profile: {
    email?: string | null
    legal_policy_version?: string | null
    privacy_policy_version?: string | null
    consent_policy_version?: string | null
    legal_consent_at?: string | null
    medical_disclaimer_accepted_at?: string | null
    data_processing_consent_at?: string | null
    ai_acknowledgement_at?: string | null
    marketing_consent?: boolean | null
    consent_updated_at?: string | null
  }
}

const REQUEST_TYPES = [
  { value: 'access', label: 'Access my data' },
  { value: 'correction', label: 'Correct data' },
  { value: 'deletion', label: 'Delete my data' },
  { value: 'portability', label: 'Export portable copy' },
  { value: 'withdraw_consent', label: 'Withdraw consent' },
  { value: 'grievance', label: 'Submit grievance' },
] as const

const JURISDICTION_OPTIONS = [
  { value: 'india_dpdp', label: 'India (DPDP Act)' },
  { value: 'gdpr', label: 'GDPR region' },
  { value: 'global', label: 'Global policy' },
] as const

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return date.toLocaleString()
}

export function LegalControlsPanel({ role, profile }: LegalControlsPanelProps) {
  const [marketingConsent, setMarketingConsent] = useState(Boolean(profile.marketing_consent))
  const [requestType, setRequestType] = useState<(typeof REQUEST_TYPES)[number]['value']>('access')
  const [jurisdiction, setJurisdiction] = useState<(typeof JURISDICTION_OPTIONS)[number]['value']>('india_dpdp')
  const [details, setDetails] = useState('')
  const [isPending, startTransition] = useTransition()

  const saveMarketingPreference = () => {
    startTransition(async () => {
      const result = await updateMarketingConsent(marketingConsent)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Marketing preference saved.')
    })
  }

  const submitRequest = (nextType?: (typeof REQUEST_TYPES)[number]['value'], nextDetails?: string) => {
    startTransition(async () => {
      const result = await submitDataRightsRequest({
        requestType: nextType || requestType,
        jurisdiction,
        details: (nextDetails || details).trim(),
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      if (!nextType) setDetails('')
      toast.success('Rights request submitted. We will follow up by email.')
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-white">Compliance Snapshot</h2>
        </div>
        <p className="mt-2 text-xs text-white/50">
          Role: <span className="uppercase font-semibold">{role}</span> • Current legal policy bundle:{' '}
          <strong>{profile.legal_policy_version || LEGAL_POLICY_VERSION}</strong>
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Legal consent</p>
            <p className="mt-1 text-sm text-white/80">{formatTimestamp(profile.legal_consent_at)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Medical disclaimer</p>
            <p className="mt-1 text-sm text-white/80">{formatTimestamp(profile.medical_disclaimer_accepted_at)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Data processing consent</p>
            <p className="mt-1 text-sm text-white/80">{formatTimestamp(profile.data_processing_consent_at)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">AI acknowledgement</p>
            <p className="mt-1 text-sm text-white/80">{formatTimestamp(profile.ai_acknowledgement_at)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Communication Consent</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(event) => setMarketingConsent(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-primary accent-primary"
          />
          <span className="text-sm text-white/65">
            I want optional product updates and educational communication. This does not affect core product access.
          </span>
        </label>
        <Button onClick={saveMarketingPreference} disabled={isPending} className="h-10 px-4 rounded-xl bg-primary text-black font-bold">
          Save communication preference
        </Button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Data Rights Request</h2>
        <p className="text-sm text-white/60">
          Submit requests for access, correction, export, deletion, or consent withdrawal.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">Request type</span>
            <select
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as (typeof REQUEST_TYPES)[number]['value'])}
              className="w-full h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
            >
              {REQUEST_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">Jurisdiction</span>
            <select
              value={jurisdiction}
              onChange={(event) =>
                setJurisdiction(event.target.value as (typeof JURISDICTION_OPTIONS)[number]['value'])
              }
              className="w-full h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"
            >
              {JURISDICTION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 block">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">Details</span>
          <textarea
            rows={4}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-white/30"
            placeholder="Add details for your request."
          />
        </label>

        <Button onClick={() => submitRequest()} disabled={isPending} className="h-11 px-5 rounded-xl bg-primary text-black font-bold">
          Submit rights request
        </Button>
      </section>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-300">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-bold">Critical actions</h2>
        </div>
        <p className="text-sm text-red-100/80">
          Use these shortcuts if you need urgent legal processing. These actions create tracked requests.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => submitRequest('portability', 'Requesting export of my personal data in portable format.')}
            disabled={isPending}
            className="h-10 border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Request export
          </Button>
          <Button
            variant="outline"
            onClick={() => submitRequest('deletion', 'Requesting deletion of my account and linked personal data.')}
            disabled={isPending}
            className="h-10 border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Request deletion
          </Button>
        </div>
      </section>
    </div>
  )
}

