import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Solar } from "lunar-javascript";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";

dayjs.extend(isBetween);

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
                <div class="calendar-weeks" id="calendarWeeks"></div>
            </div>
        `;

        this.renderWeeks();
        this.bindEvents();
    }

    private renderWeeks() {
        const weeksContainer = this.container.querySelector("#calendarWeeks");
        if (!weeksContainer) return;
        weeksContainer.innerHTML = "";

        const startOfMonth = this.currentMonth.startOf("month");
        const endOfMonth = this.currentMonth.endOf("month");
        
        // Calculate start date of the calendar view (Sunday of the first week)
        const startViewDate = startOfMonth.startOf("week");
        const endViewDate = endOfMonth.endOf("week");

        let currentWeekStart = startViewDate;
        
        while (currentWeekStart.isBefore(endViewDate)) {
            const weekRow = this.renderWeekRow(currentWeekStart);
            weeksContainer.appendChild(weekRow);
            currentWeekStart = currentWeekStart.add(1, "week");
        }
    }

    private renderWeekRow(weekStart: dayjs.Dayjs): HTMLElement {
        const weekEl = document.createElement("div");
        weekEl.className = "calendar-week-row";

        // 1. Render Background Grid (Dates)
        const bgLayer = document.createElement("div");
        bgLayer.className = "week-bg-layer";
        
        for (let i = 0; i < 7; i++) {
            const date = weekStart.add(i, "day");
            const cell = document.createElement("div");
            cell.className = "day-cell";
            
            if (!date.isSame(this.currentMonth, "month")) {
                cell.classList.add("other-month");
            }
            if (date.isSame(dayjs(), "day")) {
                cell.classList.add("today");
            }

            // Get Lunar Date
            const solar = Solar.fromYmd(date.year(), date.month() + 1, date.date());
            const lunar = solar.getLunar();
            const lunarText = lunar.getDayInChinese();
            const festival = lunar.getFestivals()[0] || solar.getFestivals()[0] || lunar.getJieQi() || "";

            const displayLunar = festival ? festival : lunarText;
            const isFestival = !!festival;

            cell.innerHTML = `
                <div class="day-header">
                    <span class="day-num">${date.date()}</span>
                    <span class="day-lunar ${isFestival ? 'festival' : ''}">${displayLunar}</span>
                </div>
            `;
            bgLayer.appendChild(cell);
        }
        weekEl.appendChild(bgLayer);

        // 2. Render Tasks Layer
        const taskLayer = document.createElement("div");
        taskLayer.className = "week-task-layer";
        
        const tasks = this.store.getTasks();
        const weekEnd = weekStart.add(6, "day").endOf("day");
        
        // Filter tasks that overlap with this week
        const weekTasks = tasks.filter(task => {
            const taskStart = dayjs(task.startTime).startOf('day');
            const taskEnd = dayjs(task.endTime).endOf('day');
            // Check intersection: !(taskEnd < weekStart || taskStart > weekEnd)
            return !(taskEnd.isBefore(weekStart) || taskStart.isAfter(weekEnd));
        });

        // Layout algorithm
        const taskSlots: (ITask | null)[][] = []; // row -> col(0-6) -> task

        // Sort tasks: longer tasks first, then earlier start time
        weekTasks.sort((a, b) => {
            const spanA = dayjs(a.endTime).diff(dayjs(a.startTime));
            const spanB = dayjs(b.endTime).diff(dayjs(b.startTime));
            if (spanA !== spanB) return spanB - spanA;
            return a.startTime - b.startTime;
        });

        weekTasks.forEach(task => {
            const taskStart = dayjs(task.startTime).startOf('day');
            const taskEnd = dayjs(task.endTime).endOf('day');

            // Calculate overlap with current week
            const viewStart = taskStart.isBefore(weekStart) ? weekStart : taskStart;
            const viewEnd = taskEnd.isAfter(weekEnd) ? weekEnd : taskEnd;

            const startCol = viewStart.diff(weekStart, 'day');
            const span = viewEnd.diff(viewStart, 'day') + 1;

            // Find a slot
            let rowIndex = 0;
            while (true) {
                if (!taskSlots[rowIndex]) {
                    taskSlots[rowIndex] = new Array(7).fill(null);
                }
                
                let canFit = true;
                for (let i = startCol; i < startCol + span; i++) {
                    if (taskSlots[rowIndex][i]) {
                        canFit = false;
                        break;
                    }
                }

                if (canFit) {
                    // Place task
                    for (let i = startCol; i < startCol + span; i++) {
                        taskSlots[rowIndex][i] = task;
                    }
                    
                    // Create Task Element
                    const taskEl = document.createElement("div");
                    taskEl.className = `task-bar`;
                    taskEl.textContent = task.content;
                    taskEl.title = `${task.content} (${dayjs(task.startTime).format("YYYY-MM-DD HH:mm")} - ${dayjs(task.endTime).format("YYYY-MM-DD HH:mm")})`;
                    
                    // Style positioning
                    taskEl.style.left = `${startCol * 14.28}%`;
                    taskEl.style.width = `${span * 14.28}%`;
                    taskEl.style.top = `${rowIndex * 24 + 24}px`; // 24px per row + initial offset

                    // Visual adjustments for connections
                    if (taskStart.isBefore(weekStart)) {
                        taskEl.classList.add("continues-left");
                    }
                    if (taskEnd.isAfter(weekEnd)) {
                        taskEl.classList.add("continues-right");
                    }

                    taskLayer.appendChild(taskEl);
                    break;
                }
                rowIndex++;
            }
        });

        // Adjust week height based on task rows
        const maxRow = taskSlots.length;
        const minHeight = 100; // px
        const dynamicHeight = maxRow * 24 + 30; // buffer
        weekEl.style.minHeight = `${Math.max(minHeight, dynamicHeight)}px`;

        weekEl.appendChild(taskLayer);
        return weekEl;
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
