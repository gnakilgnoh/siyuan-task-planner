export interface ITask {
    id: string;
    content: string;
    startTime?: number; // timestamp
    endTime?: number;   // timestamp
    createdAt: number;
    priority?: number;
    allDay?: boolean;
    category?: string; // "work" | "life" | "none" (or undefined)
}
