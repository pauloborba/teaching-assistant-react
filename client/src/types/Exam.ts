export interface Exam {
  id: string;
  subject: string;
  date: string;
  durationMinutes: number;
  grade ?: number;
}