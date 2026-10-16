export type Role = 'super_admin' | 'company_admin' | 'manager' | 'employee' | 'viewer';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'none';

export interface User {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  jobTitle: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  logoUrl: string | null;
  status: 'active' | 'suspended';
  suspendedReason: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  maxUsers: number;
  features: string[];
  currency: string;
  kind: 'trial' | 'paid' | 'complimentary';
  billingCycle: 'monthly' | 'yearly' | 'custom';
  startsAt: string;
  expiresAt: string;
  amount: number;
  notes: string | null;
  status: SubscriptionStatus;
  daysLeft: number;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxUsers: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  companies?: number;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
  company: Company | null;
  subscription: Subscription | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminCompany extends Company {
  userCount: number;
  subscription: Subscription | null;
}

export interface AdminStats {
  totalCompanies: number;
  suspended: number;
  newLast30Days: number;
  onTrial: number;
  paying: number;
  expired: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  totalUsers: number;
  monthlyRecurringRevenue: number;
  totalBilled: number;
  companiesByPlan: { code: string; name: string; companies: number }[];
}

export interface AuditItem {
  id: number;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown>;
  userName: string | null;
  userEmail: string | null;
  companyName?: string | null;
  createdAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  manager: 'Manager',
  employee: 'Employee',
  viewer: 'Viewer',
};

export const COMPANY_ROLES: Exclude<Role, 'super_admin'>[] = ['company_admin', 'manager', 'employee', 'viewer'];
