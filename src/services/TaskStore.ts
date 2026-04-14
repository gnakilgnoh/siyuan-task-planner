import { Plugin } from "siyuan";
import { ITask } from "../types";
import dayjs from "dayjs";

const STORAGE_NAME = "tasks.json";

export class TaskStore {
    private plugin: Plugin;
    private tasks: ITask[] = [];

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    async init() {
        await this.load();
    }

    async load() {
        const data = await this.plugin.loadData(STORAGE_NAME);
        if (data) {
            this.tasks = data;
            await this.autoAdjustTasks();
        } else {
            this.tasks = [];
        }
    }

    private async autoAdjustTasks() {
        let changed = false;
        const todayStart = dayjs().startOf('day');

        this.tasks = this.tasks.map(task => {
            if (!task.startTime || !task.endTime) return task;

            let start = dayjs(task.startTime);
            let end = dayjs(task.endTime);

            // 如果任务的开始时间早于今天
            if (start.isBefore(todayStart)) {
                changed = true;
                
                // 将开始时间移动到今天（保留原来的时分秒）
                start = start.year(todayStart.year()).month(todayStart.month()).date(todayStart.date());
                
                if (end.isBefore(todayStart)) {
                    // 如果结束时间也在过去，说明它已经是一个过期的任务。
                    // 那么它就“一直推迟成为‘当天’的任务”。将结束时间也移动到今天。
                    end = end.year(todayStart.year()).month(todayStart.month()).date(todayStart.date());
                    
                    // 如果移动后结束时间早于开始时间（比如原来是跨天任务：20:00 到次日 10:00）
                    if (end.isBefore(start)) {
                        if (task.allDay) {
                            end = start.endOf('day');
                        } else {
                            end = start.add(1, 'hour');
                        }
                    }
                } else {
                    // 结束时间还在今天或未来。开始时间推迟到今天后，任务的持续时间被“压缩”了。
                    // 如果压缩后开始时间晚于结束时间（比如原来是昨天 20:00 到今天 10:00，现在开始时间变成了今天 20:00）
                    if (start.isAfter(end)) {
                        if (task.allDay) {
                            end = start.endOf('day');
                        } else {
                            end = start.add(1, 'hour');
                        }
                    }
                }

                return {
                    ...task,
                    startTime: start.valueOf(),
                    endTime: end.valueOf()
                };
            }

            return task;
        });

        if (changed) {
            await this.save();
        }
    }

    async save() {
        await this.plugin.saveData(STORAGE_NAME, this.tasks);
    }

    getTasks(): ITask[] {
        return this.tasks;
    }

    async addTask(task: ITask) {
        this.tasks.push(task);
        await this.save();
    }

    async updateTask(updatedTask: ITask) {
        const index = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            this.tasks[index] = updatedTask;
            await this.save();
        }
    }

    async updateTasks(updatedTasks: ITask[]) {
        let changed = false;
        updatedTasks.forEach(updatedTask => {
            const index = this.tasks.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
                changed = true;
            }
        });
        if (changed) {
            await this.save();
        }
    }

    async removeTask(taskId: string) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        await this.save();
    }
}
