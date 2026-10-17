export type ComplaintStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Resolved'
  | 'Closed';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface StatusStyleConfig {
  label: ComplaintStatus;
  bgClass: string;
  textClass: string;
  borderClass: string;
}
