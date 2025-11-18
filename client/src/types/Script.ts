import { Task } from "./Task";
export interface Script {
  id: string;
  title?: string;
  tasks?: Task[]
}

export interface CreateScriptRequest {
  title?: string;
  tasks?: Task[];
}

export interface UpdateScriptRequest {
  title?: string;
  tasks?: Task[];
}

export const isValidJSON = (text: string): boolean => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};
