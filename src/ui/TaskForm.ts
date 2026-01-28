import dayjs from "dayjs";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";

export class TaskForm {
    private container: HTMLElement;
    private store: TaskStore;
    private onTaskAdded: () => void;

    constructor(container: HTMLElement, store: TaskStore, onTaskAdded: () => void) {
        this.container = container;
        this.store = store;
        this.onTaskAdded = onTaskAdded;
    }

    render() {
        this.container.innerHTML = `
            <div class="task-form">
                <h3>添加新任务</h3>
                <div class="form-group">
                    <label>任务内容</label>
                    <input type="text" id="taskContent" class="b3-text-field" placeholder="输入任务内容..." />
                </div>
                <div class="form-group">
                    <label>开始时间</label>
                    <input type="datetime-local" id="taskStart" class="b3-text-field" />
                </div>
                <div class="form-group">
                    <label>结束时间</label>
                    <input type="datetime-local" id="taskEnd" class="b3-text-field" />
                </div>
                <button id="addTaskBtn" class="b3-button">添加任务</button>
            </div>
        `;

        this.bindEvents();
    }

    private bindEvents() {
        const btn = this.container.querySelector("#addTaskBtn");
        btn?.addEventListener("click", async () => {
            const content = (this.container.querySelector("#taskContent") as HTMLInputElement).value;
            const startVal = (this.container.querySelector("#taskStart") as HTMLInputElement).value;
            const endVal = (this.container.querySelector("#taskEnd") as HTMLInputElement).value;

            if (!content || !startVal || !endVal) {
                // simple validation
                alert("请填写完整信息");
                return;
            }

            const newTask: ITask = {
                id: Date.now().toString(),
                content,
                startTime: dayjs(startVal).valueOf(),
                endTime: dayjs(endVal).valueOf(),
                createdAt: Date.now()
            };

            await this.store.addTask(newTask);
            
            // Clear form
            (this.container.querySelector("#taskContent") as HTMLInputElement).value = "";
            
            // Callback to refresh UI
            this.onTaskAdded();
        });
    }
}
