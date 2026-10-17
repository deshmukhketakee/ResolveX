export type UserRole = 'customer' | 'agent' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  department?: string;
  created_at: string;
  updated_at?: string;
}

export interface RoleMetadata {
  key: UserRole;
  label: string;
  description: string;
  badgeVariant: 'blue' | 'purple' | 'amber';
}
