export interface SystemComponentStatus {
  name: string;
  status: 'Available' | 'Issue' | 'Outage' | 'Disabled';
  message?: string;
} 