export type PublicUrlEntry = {
  description: string
  path: string
  priority: number
  section: 'product' | 'trust'
  title: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}

export const PUBLIC_URLS: PublicUrlEntry[] = [
  {
    path: '/',
    title: 'CREEDA Home',
    description:
      'CREEDA overview for athletes, coaches, and healthier everyday living in India.',
    section: 'product',
    priority: 1,
    changeFrequency: 'weekly',
  },
  {
    path: '/features',
    title: 'CREEDA Features',
    description:
      'Feature overview for sports science workflows, coach tools, and healthy-living guidance.',
    section: 'product',
    priority: 0.9,
    changeFrequency: 'weekly',
  },
  {
    path: '/mission',
    title: 'CREEDA Mission',
    description:
      'Company mission for expanding access to sports science across India.',
    section: 'product',
    priority: 0.8,
    changeFrequency: 'monthly',
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description: 'Public terms governing CREEDA platform use.',
    section: 'trust',
    priority: 0.5,
    changeFrequency: 'monthly',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'Public privacy policy for account, athlete, and wellness data.',
    section: 'trust',
    priority: 0.5,
    changeFrequency: 'monthly',
  },
  {
    path: '/disclaimer',
    title: 'Medical & Performance Disclaimer',
    description:
      'Decision-support and non-medical-positioning disclaimer for CREEDA.',
    section: 'trust',
    priority: 0.5,
    changeFrequency: 'monthly',
  },
  {
    path: '/consent',
    title: 'Consent Acknowledgement',
    description:
      'Explicit consent and minors safeguards behind CREEDA account use.',
    section: 'trust',
    priority: 0.6,
    changeFrequency: 'monthly',
  },
  {
    path: '/ai-transparency',
    title: 'AI Transparency',
    description:
      'Public explanation of CREEDA AI-assisted and rule-based decision support.',
    section: 'trust',
    priority: 0.6,
    changeFrequency: 'monthly',
  },
  {
    path: '/data-ownership',
    title: 'Data Ownership & B2B Terms',
    description:
      'Data ownership, portability, deletion, and organization responsibility details.',
    section: 'trust',
    priority: 0.5,
    changeFrequency: 'monthly',
  },
  {
    path: '/sla',
    title: 'Service Level Agreement',
    description:
      'Service availability, incident handling, and support-response commitments.',
    section: 'trust',
    priority: 0.4,
    changeFrequency: 'monthly',
  },
  {
    path: '/security',
    title: 'Security Overview',
    description:
      'Public overview of CREEDA security controls, hosting, and incident handling.',
    section: 'trust',
    priority: 0.4,
    changeFrequency: 'monthly',
  },
  {
    path: '/refund-policy',
    title: 'Refund Policy',
    description: 'Refund and billing support policy for CREEDA purchases.',
    section: 'trust',
    priority: 0.4,
    changeFrequency: 'monthly',
  },
  {
    path: '/cookies',
    title: 'Cookie Policy',
    description:
      'Cookie and analytics-consent policy for public and authenticated surfaces.',
    section: 'trust',
    priority: 0.4,
    changeFrequency: 'monthly',
  },
]
