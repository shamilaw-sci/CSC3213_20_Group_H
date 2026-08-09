export interface Session {
  id: number;
  appointment_id: number;

  appointment_date?: string;

  start_time: string;
  end_time: string;

  status:
    | "Scheduled"
    | "Active"
    | "Completed"
    | "Missed";

  notes?: string;
}