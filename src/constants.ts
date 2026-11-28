import type { MemberName, ProjectCategory, TeamMember } from './types';

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Shajitha',
    initials: 'SJ',
    defaultEmailHint: 'Shajitha@...',
    accentHex: '#0A5386',
  },
  {
    name: 'Dhani',
    initials: 'DH',
    defaultEmailHint: 'dhani@...',
    accentHex: '#8B1E1E',
  },
];

export function getMemberColor(name: MemberName): string {
  return TEAM_MEMBERS.find((m) => m.name === name)?.accentHex ?? '#0A5386';
}

export const MEMBER_NAMES: MemberName[] = ['Shajitha', 'Dhani'];

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  'Core',
  'Elective',
  'Lab',
  'Certification',
  'Self-Study',
  'Other',
];

export const JOURNAL_TAGS = [
  'Lecture',
  'Summary',
  'Formula',
  'Code',
  'Exam Prep',
  'Concept',
  'Revision',
  'Doubt',
];

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function formatInr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatDateShort(isoOrDate: string): string {
  if (!isoOrDate) return 'No date';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getDeadlineUrgency(dateStr: string): {
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'upcoming' | 'none';
  daysLeft: number | null;
} {
  if (!dateStr) return { label: 'No date', tone: 'none', daysLeft: null };
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) {
    return { label: dateStr, tone: 'none', daysLeft: null };
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((targetStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, tone: 'overdue', daysLeft: diffDays };
  }
  if (diffDays === 0) {
    return { label: 'Due today', tone: 'today', daysLeft: 0 };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}d left`, tone: 'soon', daysLeft: diffDays };
  }
  return { label: `${diffDays}d left`, tone: 'upcoming', daysLeft: diffDays };
}

export function getMemberInitials(name: MemberName): string {
  return TEAM_MEMBERS.find((m) => m.name === name)?.initials ?? name.slice(0, 2).toUpperCase();
}
