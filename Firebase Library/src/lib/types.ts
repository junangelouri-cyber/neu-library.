import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  college?: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: Timestamp;
}

export interface Visit {
  id:string;
  userId: string;
  fullName: string;
  studentNumber?: string;
  educationLevel?: string;
  collegeName?: string;
  purposeOfVisitName: string;
  date: string;
  time: string;
  createdAt: Timestamp;
  isGuest?: boolean;
  method: 'web' | 'qr_code';
  visitorType: 'Student' | 'Employee';
}

export interface College {
  id: string;
  name: string;
  level: 'Undergraduate' | 'Graduate Studies';
}

export interface Purpose {
    id: string;
    name: string;
}
