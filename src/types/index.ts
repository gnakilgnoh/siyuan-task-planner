export interface ITask {
    id: string;
    content: string;
    startTime: number; // timestamp
    endTime: number;   // timestamp
    priority: 'high' | 'medium' | 'low';
    createdAt: number;
}
