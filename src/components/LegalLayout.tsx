import Link from 'next/link'
import React from 'react'

import {
  CREEDA_LEGAL_ENTITY,
  CREEDA_LEGAL_ENTITY_TYPE,
  CREEDA_OWNER_NAME,
  CREEDA_REGISTERED_ADDRESS,
  CREEDA_SHOPS_ESTABLISHMENT_APPLICATION_ID,
  CREEDA_UDYAM_REGISTRATION_NUMBER,
  CORE_MEDICAL_DISCLAIMER,
  LEGAL_DOC_PATHS,
  LEGAL_LAST_UPDATED_LABEL,
} from '@/lib/legal/constants'

const LEGAL_LINKS = [
  { href: LEGAL_DOC_PATHS.terms, label: 'Terms' },
  { href: LEGAL_DOC_PATHS.privacy, label: 'Privacy' },
  { href: LEGAL_DOC_PATHS.disclaimer, label: 'Disclaimer' },
  { href: LEGAL_DOC_PATHS.consent, label: 'Consent' },
  { href: LEGAL_DOC_PATHS.aiTransparency, label: 'AI Transparency' },
  { href: LEGAL_DOC_PATHS.dataOwnership, label: 'Data Ownership' },
  { href: LEGAL_DOC_PATHS.sla, label: 'SLA' },
  { href: LEGAL_DOC_PATHS.security, label: 'Security' },
  { href: LEGAL_DOC_PATHS.cookies, label: 'Cookies' },
  { href: LEGAL_DOC_PATHS.refund, label: 'Refund Policy' },
]

const LegalLayout = ({
  title,
  children,
  lastUpdated = LEGAL_LAST_UPDATED_LABEL,
}: {
  title: string
  children: React.ReactNode
  lastUpdated?: string
}) => (
  <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 font-sans text-foreground">
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Legal Notice</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-100">{CORE_MEDICAL_DISCLAIMER}</p>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-8 sm:p-10 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mb-6">
          <span className="font-semibold uppercase tracking-[0.18em]">Last Updated</span>
          <span>{lastUpdated}</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8 border-b pb-4">{title}</h1>

        <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
          {children}
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Legal Documents
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {LEGAL_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>© 2026 {CREEDA_LEGAL_ENTITY} — {CREEDA_LEGAL_ENTITY_TYPE}. All rights reserved.</p>
            <p>Owner: {CREEDA_OWNER_NAME}</p>
            <p>Udyam Registration: {CREEDA_UDYAM_REGISTRATION_NUMBER}</p>
            <p>Shops &amp; Establishment Application ID: {CREEDA_SHOPS_ESTABLISHMENT_APPLICATION_ID}</p>
            <p>{CREEDA_REGISTERED_ADDRESS}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
)

export default LegalLayout
