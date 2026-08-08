export interface Appointment {
  id?: number;
  professional_id: number;
  client_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status?: string;
}