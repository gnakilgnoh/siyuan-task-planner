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
                        <span class="task-date">${dayjs(task.startTime).format("MM-DD HH:mm")}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="b3-button b3-button--text edit-btn" data-id="${task.id}" aria-label="编辑">
                        <svg><use xlink:href="#iconEdit"></use></svg>
                    </button>
                    <button class="b3-button b3-button--text delete-btn" data-id="${task.id}" aria-label="删除">
                        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="14" height="14"><path d="M305.067 256v625.067c0 35.413 28.587 64 64 64h285.866c35.413 0 64-28.587 64-64V256h-413.866zM369.067 881.067V320h285.866v561.067H369.067z" fill="currentColor"></path><path d="M697.6 192H597.333V142.933c0-11.733-9.6-21.333-21.333-21.333H448c-11.733 0-21.333 9.6-21.333 21.333V192H326.4c-17.707 0-32 14.293-32 32s14.293 32 32 32h371.2c17.707 0 32-14.293 32-32s-14.293-32-32-32z" fill="currentColor"></path></svg>
                    </button>
                </div>
            `;
            listContent.appendChild(item);
        });

        // Bind delete events
        listContent.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const taskId = (e.currentTarget as HTMLElement).dataset.id;
                if (taskId) {
                    await this.store.removeTask(taskId);
                    this.renderTasks();
                    this.onTaskUpdate();
                }
            });
        });

        // Bind edit events
        listContent.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const taskId = (e.currentTarget as HTMLElement).dataset.id;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    this.showEditTaskDialog(task);
                }
            });
        });
    }

    private bindEvents() {
        this.container.querySelector("#addTaskBtn")?.addEventListener("click", () => {
            this.showTaskDialog();
        });
    }

    private showTaskDialog(task?: ITask) {
        const isEdit = !!task;
        const startTime = task ? dayjs(task.startTime) : dayjs();
        const endTime = task ? dayjs(task.endTime) : dayjs().add(1, 'hour');

        const dialog = new Dialog({
            title: isEdit ? "编辑任务" : "添加新任务",
            content: `
                <div class="b3-dialog__content">
                    <div class="fn__flex-column" style="gap: 12px;">
                        <div class="fn__flex" style="align-items: center;">
                            <label class="fn__flex" style="width: 60px; color: var(--b3-theme-on-surface);">内容</label>
                            <input type="text" id="dialogTaskContent" class="b3-text-field fn__flex-1" placeholder="输入任务内容..." value="${task ? task.content : ''}" />
                        </div>
                        <div class="fn__flex" style="align-items: center;">
                            <label class="fn__flex" style="width: 60px; color: var(--b3-theme-on-surface);">开始</label>
                            <div class="fn__flex fn__flex-1" style="gap: 8px;">
                                <input type="date" id="dialogStartDate" class="b3-text-field fn__flex-1" value="${startTime.format('YYYY-MM-DD')}" />
                                <select id="dialogStartTime" class="b3-select fn__flex-1">
                                    ${this.generateTimeOptions(startTime.format('HH:mm'))}
                                </select>
                            </div>
                        </div>
                        <div class="fn__flex" style="align-items: center;">
                            <label class="fn__flex" style="width: 60px; color: var(--b3-theme-on-surface);">结束</label>
                            <div class="fn__flex fn__flex-1" style="gap: 8px;">
                                <input type="date" id="dialogEndDate" class="b3-text-field fn__flex-1" value="${endTime.format('YYYY-MM-DD')}" />
                                <select id="dialogEndTime" class="b3-select fn__flex-1">
                                    ${this.generateTimeOptions(endTime.format('HH:mm'))}
                                </select>
                            </div>
                        </div>
                        <div class="fn__flex" style="align-items: center;">
                            <label class="fn__flex" style="width: 60px; color: var(--b3-theme-on-surface);">全天</label>
                            <div class="fn__flex-1 fn__flex" style="justify-content: flex-end;">
                                <input type="checkbox" id="dialogAllDay" class="b3-switch" />
                            </div>
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
        const startDateInput = dialog.element.querySelector("#dialogStartDate") as HTMLInputElement;
        const startTimeInput = dialog.element.querySelector("#dialogStartTime") as HTMLSelectElement;
        const endDateInput = dialog.element.querySelector("#dialogEndDate") as HTMLInputElement;
        const endTimeInput = dialog.element.querySelector("#dialogEndTime") as HTMLSelectElement;
        const allDayInput = dialog.element.querySelector("#dialogAllDay") as HTMLInputElement;

        // Toggle time inputs when All Day is checked
        allDayInput.addEventListener("change", () => {
            const isAllDay = allDayInput.checked;
            startTimeInput.disabled = isAllDay;
            endTimeInput.disabled = isAllDay;
        });

        dialog.element.querySelector("#dialogCancel")?.addEventListener("click", () => {
            dialog.destroy();
        });

        dialog.element.querySelector("#dialogConfirm")?.addEventListener("click", async () => {
            const content = contentInput.value;
            const startDate = startDateInput.value;
            const startTime = startTimeInput.value;
            const endDate = endDateInput.value;
            const endTime = endTimeInput.value;
            const isAllDay = allDayInput.checked;

            if (!content || !startDate || !endDate) {
                return;
            }

            let startDateTime = dayjs(`${startDate} ${isAllDay ? '00:00' : startTime}`);
            let endDateTime = dayjs(`${endDate} ${isAllDay ? '23:59' : endTime}`);

            const newTask: ITask = {
                id: task ? task.id : Date.now().toString(),
                content,
                startTime: startDateTime.valueOf(),
                endTime: endDateTime.valueOf(),
                createdAt: task ? task.createdAt : Date.now()
            };

            if (isEdit) {
                await this.store.updateTask(newTask);
            } else {
                await this.store.addTask(newTask);
            }
            
            this.renderTasks();
            this.onTaskUpdate();
            dialog.destroy();
        });
    }

    private generateTimeOptions(selectedTime: string): string {
        const options: string[] = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                options.push(time);
            }
        }
        // Ensure selectedTime is in options, if not add it
        if (!options.includes(selectedTime)) {
            options.push(selectedTime);
            options.sort();
        }
        
        return options.map(t => `<option value="${t}" ${t === selectedTime ? 'selected' : ''}>${t}</option>`).join('');
    }

    private showEditTaskDialog(task: ITask) {
        this.showTaskDialog(task);
    }
}
