import { Plugin } from "siyuan";
import { ITask } from "../types";

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
        } else {
            this.tasks = [];
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

    async removeTask(taskId: string) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        await this.save();
    }
}
