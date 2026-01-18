import dayjs from "dayjs";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";
import { Dialog } from "siyuan";

export class TaskList {
    private container: HTMLElement;
    private store: TaskStore;
    private onTaskUpdate: () => void;

    constructor(container: HTMLElement, store: TaskStore, onTaskUpdate: () => void) {
        this.container = container;
        this.store = store;
        this.onTaskUpdate = onTaskUpdate;
    }

    render() {
        this.container.innerHTML = `
            <div class="task-list-view">
                <div class="task-list-header">
                    <h3>任务列表</h3>
                    <button id="addTaskBtn" class="b3-button b3-button--text" aria-label="添加任务">
                        <svg><use xlink:href="#iconAdd"></use></svg>
                    </button>
                </div>
                <div class="task-list-content" id="taskListContent">
                    <!-- Tasks will be rendered here -->
                </div>
            </div>
        `;

        this.renderTasks();
        this.bindEvents();
    }

    private renderTasks() {
        const listContent = this.container.querySelector("#taskListContent");
        if (!listContent) return;

        const tasks = this.store.getTasks();
        // Sort by start time desc
        tasks.sort((a, b) => b.startTime - a.startTime);

        if (tasks.length === 0) {
            listContent.innerHTML = `<div class="empty-state">暂无任务</div>`;
            return;
        }

        listContent.innerHTML = "";
        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "task-list-item";
            item.innerHTML = `
                <div class="task-info">
                    <div class="task-title">${task.content}</div>
                    <div class="task-meta">
                        <span class="task-priority priority-${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                        <span class="task-date">${dayjs(task.startTime).format("MM-DD HH:mm")}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="b3-button b3-button--text delete-btn" data-id="${task.id}" aria-label="删除">
                        <svg><use xlink:href="#iconTrashcan"></use></svg>
                    </button>
                </div>
            `;
            listContent.appendChild(item);
        });

        // Bind delete events
        listContent.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const taskId = (e.currentTarget as HTMLElement).dataset.id;
                if (taskId) {
                    await this.store.removeTask(taskId);
                    this.renderTasks();
                    this.onTaskUpdate();
                }
            });
        });
    }

    private getPriorityLabel(priority: string) {
        switch (priority) {
            case "high": return "高";
            case "medium": return "中";
            case "low": return "低";
            default: return priority;
        }
    }

    private bindEvents() {
        this.container.querySelector("#addTaskBtn")?.addEventListener("click", () => {
            this.showAddTaskDialog();
        });
    }

    private showAddTaskDialog() {
        const dialog = new Dialog({
            title: "添加新任务",
            content: `
                <div class="b3-dialog__content">
                    <div class="fn__flex-column" style="gap: 12px;">
                        <div class="fn__flex-column">
                            <label class="fn__flex" style="margin-bottom: 4px;">任务内容</label>
                            <input type="text" id="dialogTaskContent" class="b3-text-field" placeholder="输入任务内容..." />
                        </div>
                        <div class="fn__flex-column">
                            <label class="fn__flex" style="margin-bottom: 4px;">开始时间</label>
                            <input type="datetime-local" id="dialogTaskStart" class="b3-text-field" value="${dayjs().format('YYYY-MM-DDTHH:mm')}" />
                        </div>
                        <div class="fn__flex-column">
                            <label class="fn__flex" style="margin-bottom: 4px;">结束时间</label>
                            <input type="datetime-local" id="dialogTaskEnd" class="b3-text-field" value="${dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm')}" />
                        </div>
                        <div class="fn__flex-column">
                            <label class="fn__flex" style="margin-bottom: 4px;">优先级</label>
                            <select id="dialogTaskPriority" class="b3-select">
                                <option value="high">高</option>
                                <option value="medium" selected>中</option>
                                <option value="low">低</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="b3-dialog__action">
                    <button class="b3-button b3-button--cancel" id="dialogCancel">取消</button>
                    <button class="b3-button b3-button--text" id="dialogConfirm">确定</button>
                </div>
            `,
            width: "400px",
        });

        const contentInput = dialog.element.querySelector("#dialogTaskContent") as HTMLInputElement;
        const startInput = dialog.element.querySelector("#dialogTaskStart") as HTMLInputElement;
        const endInput = dialog.element.querySelector("#dialogTaskEnd") as HTMLInputElement;
        const priorityInput = dialog.element.querySelector("#dialogTaskPriority") as HTMLSelectElement;

        dialog.element.querySelector("#dialogCancel")?.addEventListener("click", () => {
            dialog.destroy();
        });

        dialog.element.querySelector("#dialogConfirm")?.addEventListener("click", async () => {
            const content = contentInput.value;
            const startVal = startInput.value;
            const endVal = endInput.value;
            const priority = priorityInput.value as any;

            if (!content || !startVal || !endVal) {
                // simple validation
                return;
            }

            const newTask: ITask = {
                id: Date.now().toString(),
                content,
                startTime: dayjs(startVal).valueOf(),
                endTime: dayjs(endVal).valueOf(),
                priority,
                createdAt: Date.now()
            };

            await this.store.addTask(newTask);
            this.renderTasks();
            this.onTaskUpdate();
            dialog.destroy();
        });
    }
}
