import { DISPLAY_NAME_KEY, EMAIL_KEY, LOCAL_ACCOUNTS_KEY } from './constants'

/**
 * Lightweight local "account book" used only when Supabase isn't configured.
 * Lets the Sign Up (sign-in) tab recall the name captured by the Login
 * (account-creation) tab earlier — no passwords are stored.
 */
type LocalAccounts = Record<string, { name: string }>

function readAccounts(): LocalAccounts {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function rememberLocalAccount(email: string, name: string) {
  const accounts = readAccounts()
  accounts[email.toLowerCase()] = { name }
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function lookupLocalAccountName(email: string): string | null {
  return readAccounts()[email.toLowerCase()]?.name ?? null
}

export function persistIdentity(name: string, email: string) {
  localStorage.setItem(DISPLAY_NAME_KEY, name)
  localStorage.setItem(EMAIL_KEY, email)
}

export function readStoredName(): string | null {
  return localStorage.getItem(DISPLAY_NAME_KEY)
}

export function readStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY)
}

export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Athlete'
}
