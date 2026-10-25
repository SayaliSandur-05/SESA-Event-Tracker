export type UserRole = "super_admin" | "organizer" | "volunteer" | "student";

export interface Profile {
  id: string;
  auth_user_id?: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerAccount {
  id: string;
  username: string; // e.g. volunteer1, volunteer2
  full_name: string;
  email?: string;
  phone?: string;
  role: "volunteer" | "lead" | "super_admin";
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = "paid" | "pending" | "unpaid";

export interface Membership {
  id: string;
  prn: string; // Normalized uppercase string (e.g. MIT2024001)
  full_name: string;
  email?: string;
  contact?: string;
  branch?: string;
  academic_year?: string;
  payment_status: PaymentStatus;
  fee_amount?: number; // SESA annual membership fee (₹1,000)
  payment_mode?: string; // UPI, Cash, Bank Transfer, Bulk Excel
  verified_at: string | null;
  verified_by: string | null; // Profile ID or name of volunteer/organizer
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

export type EventStatus =
  | "draft"
  | "published"
  | "registration_closed"
  | "completed"
  | "cancelled"
  | "archived";

export interface EventItem {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  venue: string;
  starts_at: string; // ISO 8601
  ends_at: string;
  registration_opens_at: string;
  registration_closes_at: string;
  capacity: number | null; // null represents unlimited
  walk_ins_enabled: boolean;
  status: EventStatus;
  banner_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type RegistrationType = "online" | "walk_in";
export type RegistrationStatus = "confirmed" | "cancelled";

export interface EventRegistration {
  id: string;
  event_id: string;
  membership_id: string;
  prn: string;
  student_name_snapshot: string;
  email: string;
  contact?: string;
  registration_type: RegistrationType;
  registered_at: string;
  registration_status: RegistrationStatus;
  created_by?: string;
}

export type AttendanceMethod = "lookup" | "walk_in";

export interface AttendanceRecord {
  id: string;
  event_id: string;
  registration_id: string;
  prn: string;
  checked_in_at: string;
  checked_in_by: string; // Profile id / username
  checked_in_by_name: string;
  method: AttendanceMethod;
  created_at: string;
}

export interface EventStaffAssignment {
  id: string;
  event_id: string;
  profile_id: string;
  assigned_role: "lead" | "volunteer";
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  totalEvents: number;
  activeEventsCount: number;
  totalRegistrations: number;
  totalCheckedIn: number;
  totalWalkIns: number;
  totalPaidMembers: number;
  totalPendingMembers: number;
  recentActivity: AuditLog[];
}

export interface EventDetailedStats {
  event: EventItem;
  totalRegistered: number;
  totalConfirmed: number;
  totalWalkIns: number;
  totalPresent: number;
  totalAbsent: number;
  remainingCapacity: number | null;
  attendancePercentage: number;
  assignedVolunteers: Profile[];
}
