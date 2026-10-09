export interface LegalContact {
  name: string
  street: string
  postalCodeCity: string
  country: string
  email: string
  phone?: string
}

export const LEGAL = {
  pricingNotice:
    'Global Audience Pulse ist derzeit kostenlos nutzbar. Umfang, Funktionen und Bedingungen können sich künftig ändern.',
  contact: {
    name: 'Belkis Aslani',
    street: 'Vogelsangstr. 32',
    postalCodeCity: '71691 Freiberg am Neckar',
    country: 'Deutschland',
    email: 'nullmesh@protonmail.com',
  } as LegalContact,
  repository: 'https://github.com/BEKO2210/global-audience-pulse',
  githubPrivacy:
    'https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement',
  wikimediaPrivacy: 'https://foundation.wikimedia.org/wiki/Policy:Privacy_policy/de',
} as const
