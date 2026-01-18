import dayjs from "dayjs";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";

export class CalendarView {
    private container: HTMLElement;
    private store: TaskStore;
    private currentMonth: dayjs.Dayjs;

    constructor(container: HTMLElement, store: TaskStore) {
        this.container = container;
        this.store = store;
        this.currentMonth = dayjs();
    }

    render() {
        this.container.innerHTML = `
            <div class="task-planner-calendar">
                <div class="calendar-header">
                    <button id="prevMonth" class="b3-button b3-button--outline">&lt;</button>
                    <span class="current-date">${this.currentMonth.format("YYYY年MM月")}</span>
                    <button id="nextMonth" class="b3-button b3-button--outline">&gt;</button>
                </div>
                <div class="calendar-grid-header">
                    <div>周日</div><div>周一</div><div>周二</div><div>周三</div><div>周四</div><div>周五</div><div>周六</div>
                </div>
                <div class="calendar-grid" id="calendarGrid"></div>
            </div>
        `;

        this.renderDays();
        this.bindEvents();
    }

    private renderDays() {
        const grid = this.container.querySelector("#calendarGrid");
        if (!grid) return;

        grid.innerHTML = "";
        
        const startOfMonth = this.currentMonth.startOf("month");
        const endOfMonth = this.currentMonth.endOf("month");
        const startDay = startOfMonth.day(); // 0 is Sunday
        const daysInMonth = this.currentMonth.daysInMonth();

        // Previous month filler
        for (let i = 0; i < startDay; i++) {
            const day = document.createElement("div");
            day.className = "calendar-day empty";
            grid.appendChild(day);
        }

        // Current month days
        const tasks = this.store.getTasks();
        for (let i = 1; i <= daysInMonth; i++) {
            const date = this.currentMonth.date(i);
            const dayEl = document.createElement("div");
            dayEl.className = "calendar-day";
            dayEl.innerHTML = `<div class="day-number">${i}</div>`;
            
            // Render tasks for this day
            const dayTasks = this.getTasksForDate(date, tasks);
            dayTasks.forEach(task => {
                const taskEl = document.createElement("div");
                taskEl.className = `task-item task-priority-${task.priority}`;
                taskEl.innerText = task.content;
                taskEl.title = `${task.content} (${dayjs(task.startTime).format("HH:mm")} - ${dayjs(task.endTime).format("HH:mm")})`;
                dayEl.appendChild(taskEl);
            });

            grid.appendChild(dayEl);
        }
    }

    private getTasksForDate(date: dayjs.Dayjs, tasks: ITask[]): ITask[] {
        return tasks.filter(task => {
            const start = dayjs(task.startTime);
            const end = dayjs(task.endTime);
            // Check if date is within task range (inclusive)
            return date.isSame(start, 'day') || date.isSame(end, 'day') || (date.isAfter(start, 'day') && date.isBefore(end, 'day'));
        });
    }

    private bindEvents() {
        this.container.querySelector("#prevMonth")?.addEventListener("click", () => {
            this.currentMonth = this.currentMonth.subtract(1, "month");
            this.render();
        });

        this.container.querySelector("#nextMonth")?.addEventListener("click", () => {
            this.currentMonth = this.currentMonth.add(1, "month");
            this.render();
        });
    }
}
