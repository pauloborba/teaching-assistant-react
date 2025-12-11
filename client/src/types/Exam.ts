export interface Exam {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  grade ?: number;
}