export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatMoney(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export function describeAction(action: string): string {
  const map: Record<string, string> = {
    'company.registered': 'Company registered',
    'company.profile_updated': 'Company profile updated',
    'auth.login': 'Logged in',
    'auth.admin_login': 'Super admin logged in',
    'auth.password_changed': 'Password changed',
    'user.created': 'User created',
    'user.updated': 'User updated',
    'user.deleted': 'User deleted',
    'user.password_reset': 'User password reset',
    'admin.company_updated': 'Company edited',
    'admin.company_suspended': 'Company suspended',
    'admin.company_activated': 'Company activated',
    'admin.company_deleted': 'Company deleted',
    'admin.subscription_assigned': 'Subscription assigned',
    'admin.subscription_extended': 'Subscription extended',
    'admin.plan_created': 'Plan created',
    'admin.plan_updated': 'Plan updated',
  };
  return map[action] ?? action;
}
