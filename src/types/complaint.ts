import type { UserProfile } from './roles';
import type { ComplaintPriority, ComplaintStatus } from './status';

export interface ComplaintCategory {
  id: string;
  name: string;
  description: string;
  default_sla_hours: number;
  created_at: string;
}

export interface ComplaintAssignment {
  id: string;
  complaint_id: string;
  assigned_to_id: string;
  assigned_by_id: string;
  assigned_at: string;
  agent?: UserProfile;
}

export interface ComplaintResolution {
  id: string;
  complaint_id: string;
  resolved_by_id: string;
  resolution_notes: string;
  root_cause?: string;
  resolved_at: string;
  customer_accepted?: boolean;
  customer_feedback?: string;
}

export interface ComplaintActivityLog {
  id: string;
  complaint_id: string;
  actor_id: string;
  actor?: UserProfile;
  action_type: string;
  previous_status?: ComplaintStatus;
  new_status?: ComplaintStatus;
  comment?: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category_id: string;
  category?: ComplaintCategory;
  customer_id: string;
  customer?: UserProfile;
  assigned_agent_id?: string;
  assigned_agent?: UserProfile;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  created_at: string;
  updated_at: string;
  target_resolution_date?: string;
  resolution?: ComplaintResolution;
  activities?: ComplaintActivityLog[];
}

export interface ComplaintFilterParams {
  status?: ComplaintStatus | 'All';
  priority?: ComplaintPriority | 'All';
  category_id?: string;
  search_query?: string;
  page?: number;
  limit?: number;
}
