export type MemberName = 'Sajitha' | 'Dhani';
export type OwnerScope = MemberName | 'Both';

export interface TeamMember {
  name: MemberName;
  initials: string;
  defaultEmailHint: string;
  accentHex: string;
}

export type ProjectCategory = 'Core' | 'Elective' | 'Lab' | 'Certification' | 'Self-Study' | 'Other';
export type ProjectStatus = 'Planning' | 'Active' | 'Review' | 'Completed' | 'Archived';
export type EnquiryStatus = 'New' | 'Discussing' | 'Quoted' | 'Won' | 'Dropped';
export type ExpenseCategory = 'Development' | 'Infrastructure' | 'Hardware' | 'Operations' | 'Other';
export type DocType = 'PDF' | 'Slides' | 'Notes' | 'Syllabus' | 'Spec' | 'Proposal' | 'Quotation' | 'Other';
export type JournalKind = 'Idea' | 'Learning';

export interface WorkflowStep {
  id: string;
  projectId: string;
  stepOrder: number;
  title: string;
  assignee: MemberName;
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  author: MemberName;
  content: string;
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  projectId: string;
  label: string;
  category: ExpenseCategory;
  amountInr: number;
  date: string;
  addedBy: MemberName;
}

export interface QuotationLineItem {
  id: string;
  description: string;
  qty: number;
  unitPriceInr: number;
}

export interface QuotationDoc {
  id: string;
  projectId?: string;
  enquiryId?: string;
  number: string;
  title: string;
  clientName: string;
  type: 'Quotation' | 'Proposal';
  items: QuotationLineItem[];
  taxPercent: number;
  notes: string;
  validUntil: string;
  createdBy: MemberName;
  createdAt: string;
}

export interface UploadedDocument {
  id: string;
  projectId?: string;
  enquiryId?: string;
  name: string;
  docType: DocType;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: MemberName;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  clientName: string; // Instructor / Course Code
  category: ProjectCategory;
  status: ProjectStatus;
  requirements: string; // Course Overview / Syllabus Summary
  teamIdea: string;
  liveNotebookText: string;
  deadline: string; // Target Completion / Final Exam Date
  quotedAmountInr: number;
  budgetNotes: string;
  createdBy: MemberName;
  createdAt: string;
  updatedAt: string;
}

export interface Enquiry {
  id: string;
  clientName: string;
  contactInfo: string;
  category: ProjectCategory;
  scopeSummary: string;
  estimatedBudgetInr: number;
  targetDate: string;
  status: EnquiryStatus;
  notes: string;
  convertedProjectId?: string;
  createdBy: MemberName;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  kind: JournalKind;
  title: string;
  content: string;
  tags: string[];
  projectId?: string;
  author: MemberName;
  createdAt: string;
  updatedAt: string;
}

export type SyllabusStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface SyllabusTopic {
  id: string;
  projectId: string;
  unitNumber: number;
  title: string;
  description: string;
  targetDate: string;
  status: SyllabusStatus;
  owner: OwnerScope;
  estimatedMinutes: number;
  createdAt: string;
}

export type TimetableKind = 'Class' | 'Study' | 'Lab' | 'Revision' | 'Break';

export interface TimetableSlot {
  id: string;
  dayOfWeek: number; // 0 = Monday .. 6 = Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  title: string;
  projectId?: string;
  kind: TimetableKind;
  locationOrLink: string;
  owner: OwnerScope;
  colorHex: string;
}

export type AssignmentStatus = 'Pending' | 'In Progress' | 'Submitted' | 'Graded';
export type PriorityLevel = 'Low' | 'Medium' | 'High';

export interface Assignment {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  dueDate: string;
  status: AssignmentStatus;
  priority: PriorityLevel;
  submissionLink: string;
  owner: OwnerScope;
  createdAt: string;
}

export interface Exam {
  id: string;
  projectId?: string;
  title: string;
  examDate: string;
  startTime: string;
  durationMinutes: number;
  venueOrLink: string;
  syllabusScope: string;
  prepProgress: number; // 0-100
  owner: OwnerScope;
  createdAt: string;
}

export type ResourceKind = 'Bookmark' | 'PDF' | 'Video' | 'Snippet';

export interface ResourceItem {
  id: string;
  projectId?: string;
  kind: ResourceKind;
  title: string;
  url: string;
  content: string;
  tags: string[];
  addedBy: MemberName;
  owner: OwnerScope;
  createdAt: string;
}

export interface StudyGoal {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
  owner: OwnerScope;
  createdAt: string;
}

export interface LiveTypingState {
  targetKey: string;
  author: MemberName;
  text: string;
  updatedAt: number;
}

export interface LiveCursorState {
  projectId: string;
  member: MemberName;
  x: number;
  y: number;
  updatedAt: number;
}

export type ActiveTab =
  | 'dashboard'
  | 'subjects'
  | 'timetable'
  | 'exams'
  | 'notebooks'
  | 'resources';
