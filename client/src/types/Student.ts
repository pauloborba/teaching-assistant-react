import { Exam } from "./Exam";

export interface Student {
  name: string;
  cpf: string;
  email: string;
}

export interface CreateStudentRequest {
  name: string;
  cpf: string;
  email: string;
}

export interface UpdateStudentRequest {
  name?: string;
  email?: string;
}