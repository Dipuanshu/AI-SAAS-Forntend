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
  backendStack?: string | null;
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

// ---------------------------------------------------------------------------------------------- AI assistant
export interface GuideStep {
  id: string;
  title: string;
  text: string;
  code?: string;
}

export interface ConnectorInfo {
  id: string;
  online: boolean;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  authMode: 'none' | 'static' | 'login';
  specSource: string | null;
  version: string | null;
  hostname: string | null;
  createdAt: string;
}

export interface AiSettings {
  about: string;
  allowDelete: boolean;
  redactFields: string[];
}

export interface AiOverview {
  stack: string | null;
  stackLabel: string;
  guide: GuideStep[];
  stacks: { id: string; label: string }[];
  connector: ConnectorInfo | null;
  tools: { total: number; enabled: number; needsReview: number; stale: number };
  knowledgeDocs: number;
  settings: AiSettings;
  llm: { configured: boolean; provider: string; model: string | null };
  checklist: { id: string; title: string; done: boolean }[];
}

export type ToolRisk = 'read' | 'write' | 'delete';

export interface ApiTool {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  customDescription: string | null;
  effectiveDescription: string;
  tags: string[];
  risk: ToolRisk;
  enabled: boolean;
  allowedRoles: string[];
  source: 'openapi' | 'postman' | 'recorded' | 'manual';
  stale: boolean;
  needsReview: boolean;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface AiLog {
  id: number;
  userName: string | null;
  tool: string;
  method: string;
  path: string;
  args: string;
  status: string;
  httpStatus: number | null;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
}

export interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  steps: { tool: string; label: string; ok: boolean }[];
  createdAt: string;
}

export interface PendingAction {
  id: string;
  tool: string;
  label: string;
  method: string;
  path: string;
  summary: string;
  args: Record<string, unknown>;
  expiresAt: string;
}

export interface ChatView {
  conversation: { id: string; title: string };
  items: ChatItem[];
  pending: PendingAction[];
  needsConnect: boolean;
}

export interface ChatStatus {
  llmConfigured: boolean;
  connector: { online: boolean; authMode: 'none' | 'static' | 'login' } | null;
  connected: boolean;
  needsConnect: boolean;
  toolCount: number;
  helpDocs: number;
  ready: boolean;
}
