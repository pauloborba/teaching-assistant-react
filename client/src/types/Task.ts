export interface Task {
  id: string;
  statement?: string;
}

export interface CreateTaskRequest {
  statement?: string;
}

export interface UpdateTaskRequest {
  statement?: string;
}

export const isValidJSON = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};
