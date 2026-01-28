import dayjs from "dayjs";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";
import { Dialog, Menu } from "siyuan";
import { Lunar, Solar, HolidayUtil } from "lunar-javascript";

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
            `;
            
            // Context Menu
            item.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                const menu = new Menu("task-context-menu");
                menu.addItem({
                    icon: "iconEdit",
                    label: "编辑",
                    click: () => {
                        this.showEditTaskDialog(task);
                    }
                });
                menu.addItem({
                    icon: "iconTrashcan",
                    label: "删除",
                    click: async () => {
                        await this.store.removeTask(task.id);
                        this.renderTasks();
                        this.onTaskUpdate();
                    }
                });
                menu.open({
                    x: e.clientX,
                    y: e.clientY,
                    isLeft: true,
                });
            });

            listContent.appendChild(item);
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
                                <button id="dialogStartDateBtn" class="b3-button b3-button--outline fn__flex-1" style="justify-content: flex-start; text-align: left; padding: 4px 8px;">
                                    ${startTime.format('YYYY-MM-DD')}
                                </button>
                                <select id="dialogStartTime" class="b3-select fn__flex-1">
                                    ${this.generateTimeOptions(startTime.format('HH:mm'))}
                                </select>
                            </div>
                        </div>
                        <div class="fn__flex" style="align-items: center;">
                            <label class="fn__flex" style="width: 60px; color: var(--b3-theme-on-surface);">结束</label>
                            <div class="fn__flex fn__flex-1" style="gap: 8px;">
                                <button id="dialogEndDateBtn" class="b3-button b3-button--outline fn__flex-1" style="justify-content: flex-start; text-align: left; padding: 4px 8px;">
                                    ${endTime.format('YYYY-MM-DD')}
                                </button>
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
        const startDateBtn = dialog.element.querySelector("#dialogStartDateBtn") as HTMLButtonElement;
        const startTimeInput = dialog.element.querySelector("#dialogStartTime") as HTMLSelectElement;
        const endDateBtn = dialog.element.querySelector("#dialogEndDateBtn") as HTMLButtonElement;
        const endTimeInput = dialog.element.querySelector("#dialogEndTime") as HTMLSelectElement;
        const allDayInput = dialog.element.querySelector("#dialogAllDay") as HTMLInputElement;

        // Variables to store selected dates
        let selectedStartDate = startTime.format('YYYY-MM-DD');
        let selectedEndDate = endTime.format('YYYY-MM-DD');

        // Helper to attach date picker
        const attachDatePicker = (btn: HTMLButtonElement, initialDate: string, onSelect: (date: string) => void) => {
            btn.addEventListener("click", () => {
                // Check if picker already exists
                if (btn.nextElementSibling?.classList.contains("task-date-picker")) {
                    btn.nextElementSibling.remove();
                    return;
                }

                // Create picker container
                const picker = document.createElement("div");
                picker.className = "task-date-picker";
                picker.style.position = "absolute";
                picker.style.zIndex = "2";
                picker.style.backgroundColor = "var(--b3-theme-surface)";
                picker.style.border = "1px solid var(--b3-theme-surface-lighter)";
                picker.style.borderRadius = "4px";
                picker.style.padding = "8px";
                picker.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                picker.style.marginTop = "4px";
                
                // Simple calendar rendering logic (simplified for now, can use external lib or custom implementation)
                // For MVP, we will use a native date input that is hidden but triggered, 
                // OR we can render a simple calendar. 
                // Given the screenshot shows a custom calendar, let's implement a simple month view.
                
                let currentMonth = dayjs(initialDate);
                
                const renderCalendar = () => {
                    const startOfMonth = currentMonth.startOf('month');
                    const endOfMonth = currentMonth.endOf('month');
                    const daysInMonth = currentMonth.daysInMonth();
                    const startDay = startOfMonth.day(); // 0 is Sunday
                    
                    let html = `
                        <div class="calendar-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
                            <span style="font-size: 16px; font-weight: bold; color: var(--b3-theme-on-background);">${currentMonth.format('YYYY年MM月')}</span>
                            <div style="display: flex; gap: 8px;">
                                <span class="prev-month" style="cursor: pointer; padding: 2px 6px; color: var(--b3-theme-on-surface-light);">&lt;</span>
                                <span class="today-btn" style="cursor: pointer; padding: 2px 6px; color: var(--b3-theme-on-surface-light);">○</span>
                                <span class="next-month" style="cursor: pointer; padding: 2px 6px; color: var(--b3-theme-on-surface-light);">&gt;</span>
                            </div>
                        </div>
                        <div class="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 8px; column-gap: 4px; text-align: center;">
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">日</div>
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">一</div>
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">二</div>
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">三</div>
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">四</div>
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">五</div>
                            <div style="font-size: 12px; color: var(--b3-theme-on-surface-light);">六</div>
                    `;

                    // Empty cells for days before start of month
                    for (let i = 0; i < startDay; i++) {
                        html += `<div></div>`;
                    }

                    // Days
                    for (let i = 1; i <= daysInMonth; i++) {
                        const dateObj = currentMonth.date(i);
                        const dateStr = dateObj.format('YYYY-MM-DD');
                        const isSelected = dateStr === initialDate;
                        const isToday = dateStr === dayjs().format('YYYY-MM-DD');
                        
                        // Lunar calculation
                        const solar = Solar.fromYmd(dateObj.year(), dateObj.month() + 1, dateObj.date());
                        const lunar = Lunar.fromSolar(solar);
                        const dayLunar = lunar.getDayInChinese();
                        const festival = lunar.getFestivals()[0] || solar.getFestivals()[0] || lunar.getJieQi() || dayLunar;
                        const holiday = HolidayUtil.getHoliday(dateObj.year(), dateObj.month() + 1, dateObj.date());
                        
                        // Determine display text and color for lunar/festival
                        let lunarText = dayLunar;
                        let lunarColor = "var(--b3-theme-on-surface-light)";
                        
                        // Show festival if available (simplified logic)
                        if (lunar.getFestivals()[0] || solar.getFestivals()[0] || lunar.getJieQi()) {
                            lunarText = festival;
                            lunarColor = "var(--b3-theme-primary)";
                        }

                        // Holiday badge
                        let badgeHtml = "";
                        if (holiday) {
                            const isWork = holiday.isWork();
                            const badgeColor = isWork ? "var(--b3-theme-on-surface-light)" : "var(--b3-theme-error)";
                            const badgeBg = isWork ? "var(--b3-theme-surface-lighter)" : "rgba(var(--b3-theme-error-rgb), 0.1)";
                            const badgeText = isWork ? "班" : "休";
                            badgeHtml = `<div style="position: absolute; top: -2px; right: -2px; font-size: 9px; transform: scale(0.8); background: ${badgeBg}; color: ${badgeColor}; padding: 0 2px; border-radius: 2px; line-height: 1;">${badgeText}</div>`;
                        }

                        html += `
                            <div class="calendar-day" 
                                 data-date="${dateStr}"
                                 style="position: relative; cursor: pointer; height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; 
                                    ${isSelected ? 'background-color: var(--b3-theme-primary); color: #fff;' : (isToday ? 'background-color: rgba(var(--b3-theme-primary-rgb), 0.1); color: var(--b3-theme-primary);' : 'color: var(--b3-theme-on-background);')}">
                                    <span style="font-size: 14px; font-weight: 500;">${i}</span>
                                </div>
                                <span style="font-size: 10px; margin-top: -2px; transform: scale(0.9); color: ${isSelected ? 'var(--b3-theme-primary)' : lunarColor}; opacity: ${isSelected ? 0.8 : 1}; white-space: nowrap; overflow: hidden; max-width: 100%; text-overflow: ellipsis;">
                                    ${lunarText}
                                </span>
                                ${badgeHtml}
                            </div>
                        `;
                    }
                    
                    html += `</div>`;
                    picker.innerHTML = html;

                    // Bind events
                    picker.querySelector(".prev-month")?.addEventListener("click", (e) => {
                        e.stopPropagation();
                        currentMonth = currentMonth.subtract(1, 'month');
                        renderCalendar();
                    });
                    picker.querySelector(".next-month")?.addEventListener("click", (e) => {
                        e.stopPropagation();
                        currentMonth = currentMonth.add(1, 'month');
                        renderCalendar();
                    });
                    picker.querySelector(".today-btn")?.addEventListener("click", (e) => {
                        e.stopPropagation();
                        currentMonth = dayjs();
                        renderCalendar();
                    });

                    picker.querySelectorAll(".calendar-day").forEach(day => {
                        day.addEventListener("click", (e) => {
                            e.stopPropagation();
                            const date = (e.currentTarget as HTMLElement).dataset.date;
                            if (date) {
                                onSelect(date);
                                picker.remove();
                            }
                        });
                    });
                };

                renderCalendar();
                
                // Position relative to button's parent which is flex container
                btn.parentElement?.appendChild(picker);
                
                // Close on click outside
                const closeHandler = (e: MouseEvent) => {
                    if (!picker.contains(e.target as Node) && e.target !== btn) {
                        picker.remove();
                        document.removeEventListener("click", closeHandler);
                    }
                };
                setTimeout(() => document.addEventListener("click", closeHandler), 0);
            });
        };

        attachDatePicker(startDateBtn, selectedStartDate, (date) => {
            selectedStartDate = date;
            startDateBtn.textContent = date;
        });

        attachDatePicker(endDateBtn, selectedEndDate, (date) => {
            selectedEndDate = date;
            endDateBtn.textContent = date;
        });

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
            const startDate = selectedStartDate;
            const startTime = startTimeInput.value;
            const endDate = selectedEndDate;
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
