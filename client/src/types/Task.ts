export interface Task {
  id: string;
  statement?: string;
  attachments?: any;
}

export interface CreateTaskRequest {
  statement?: string;
  attachments?: any;
}

export interface UpdateTaskRequest {
  statement?: string;
  attachments?: any;
}

export const isValidJSON = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};
