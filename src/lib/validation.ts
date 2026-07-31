const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com'];
      
export function isValidEmail(email: string): boolean {
  const trimmedEmail = email.trim()
  if (!EMAIL_RE.test(trimmedEmail)) {
    return false
  }
  const domain = trimmedEmail.split('@')[1]
  return allowedDomains.includes(domain)
}
