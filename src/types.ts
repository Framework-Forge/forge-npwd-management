export type Page =
  | 'home'
  | 'members'
  | 'member'
  | 'hire'
  | 'candidates'
  | 'candidate'
  | 'grades'
  | 'finance'
  | 'permissions'
  | 'settings';

export interface Member {
  citizenid: string;
  id?: number | string;
  name: string;
  grade: string;
  level: number;
  online: boolean;
  initials: string;
  joinedAt?: string;
  salary?: number;
}

export interface NearbyPlayer {
  id: number;
  name: string;
  citizenid?: string;
  distance: number;
}

export interface RegisterItem {
  id: string;
  label: string;
  stationTitle?: string;
  balance: number;
}

export interface GradeItem {
  name: string;
  level: number;
  count: number;
  salary?: number;
  isboss?: boolean;
  isrecruiter?: boolean;
}

export interface CandidateAnswer {
  question: string;
  answer: string | number;
}

export interface CandidateSubmission {
  id: string | number;
  citizenid: string;
  name: string;
  phone?: string;
  score?: number;
  passed?: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt?: string;
  stationId?: string;
  stationTitle?: string;
  applicationId?: string;
  applicationLabel?: string;
  answers?: CandidateAnswer[];
}

export interface Transaction {
  id: string | number;
  title: string;
  date: string;
  amount: number;
  isDeposit: boolean;
  sender?: string;
  reason?: string;
}

export interface PermissionItem {
  id: string;
  name: string;
  description: string;
  enabled?: boolean;
}

export interface PermissionsData {
  currentUser?: Record<string, boolean>;
  byGrade?: Record<string, Record<string, boolean>>;
  byIndividual?: Record<string, Record<string, boolean>>;
  items?: PermissionItem[];
}

export interface OrganizationInfo {
  name: string;
  label: string;
  groupType: 'job' | 'gang';
  motto: string;
  badge: string;
  balance: number;
  playerGradeLevel: number;
  playerGradeName: string;
  playerCitizenId?: string;
  isBoss: boolean;
  canManage: boolean;
  totalMembers: number;
  onlineMembers: number;
}

export interface ManagementData {
  authorized: boolean;
  reason?: string;
  organization: OrganizationInfo;
  members: Member[];
  grades: GradeItem[];
  candidates: CandidateSubmission[];
  transactions: Transaction[];
  registers?: RegisterItem[];
  permissions: PermissionsData;
  availableJobs?: {
    name: string;
    label: string;
    gradeLevel: number;
    gradeName: string;
    isBoss: boolean;
    active?: boolean;
  }[];
}
