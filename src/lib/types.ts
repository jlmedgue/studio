export type TaskStatus = 'Pending' | 'Completed';

export interface Task {
  id: string;
  date: Date;
  description: string;
  link?: string;
  status: TaskStatus;
}
