import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Solar, HolidayUtil } from "lunar-javascript";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";
import { Menu } from "siyuan";

dayjs.extend(isBetween);

export class CalendarView {
    private container: HTMLElement;
    private store: TaskStore;
    private currentMonth: dayjs.Dayjs;
    private isDatePickerOpen: boolean = false;
    private pickerYear: number;
    private onEditTask?: (task: ITask) => void;
    private onTaskClick?: (taskId: string) => void;
    private onRangeSelect?: (start: dayjs.Dayjs, end: dayjs.Dayjs) => void;

    constructor(container: HTMLElement, store: TaskStore) {
        this.container = container;
        this.store = store;
        this.currentMonth = dayjs();
        this.pickerYear = this.currentMonth.year();
    }

    public setOnEditHandler(handler: (task: ITask) => void) {
        this.onEditTask = handler;
    }

    public setOnTaskClickHandler(handler: (taskId: string) => void) {
        this.onTaskClick = handler;
    }

    public setOnRangeSelectHandler(handler: (start: dayjs.Dayjs, end: dayjs.Dayjs) => void) {
        this.onRangeSelect = handler;
    }

    render() {
        this.container.innerHTML = `
            <div class="task-planner-calendar">
                <div class="calendar-header" style="padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;">
                    <div class="header-left" style="display: flex; align-items: center; gap: 16px; position: relative;">
                        <div class="current-date-wrapper" style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            <span class="current-date" style="font-size: 20px; font-weight: 600; color: var(--b3-theme-on-background);">${this.currentMonth.format("YYYY年MM月")}</span>
                        </div>
                        
                        <!-- Date Picker Popup -->
                        <div class="date-picker-popup" style="display: ${this.isDatePickerOpen ? 'block' : 'none'};">
                            <div class="picker-header">
                                <span class="picker-year">${this.pickerYear}年</span>
                                <div class="picker-nav">
                                    <button class="picker-btn prev-year-btn">
                                        <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"></path></svg>
                                    </button>
                                    <button class="picker-btn reset-year-btn">
                                        <svg style="width: 10px; height: 10px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                                    </button>
                                    <button class="picker-btn next-year-btn">
                                        <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"></path></svg>
                                    </button>
                                </div>
                            </div>
                            <div class="picker-months">
                                ${Array.from({ length: 12 }, (_, i) => {
                                    const isSelected = this.pickerYear === this.currentMonth.year() && i === this.currentMonth.month();
                                    return `<div class="month-item ${isSelected ? 'selected' : ''}" data-month="${i}">${i + 1}月</div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="header-right" style="display: flex;">
                        <div class="date-navigation">
                            <button id="prevMonth" class="nav-btn" title="上个月">
                                <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"></path></svg>
                            </button>
                            <button id="todayBtn" class="nav-btn today-btn">今天</button>
                            <button id="nextMonth" class="nav-btn" title="下个月">
                                <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="currentColor"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="calendar-grid-header" style="border-bottom: none; padding-bottom: 8px;">
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
            cell.dataset.date = date.format("YYYY-MM-DD");
            
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

            const holiday = HolidayUtil.getHoliday(date.year(), date.month() + 1, date.date());
            let holidayBadge = "";
            if (holiday) {
                const isWork = holiday.isWork();
                holidayBadge = `<span class="holiday-badge ${isWork ? 'work' : 'rest'}">${isWork ? '班' : '休'}</span>`;
            }

            cell.innerHTML = `
                <div class="day-header" style="display: flex; justify-content: space-between; padding: 4px 8px;">
                    <div style="display: flex; align-items: center; gap: 2px;">
                        <span class="day-num" style="font-size: 14px; font-weight: 500;">${date.date()}</span>
                        ${holidayBadge}
                    </div>
                    <span class="day-lunar ${isFestival ? 'festival' : ''}" style="font-size: 10px; color: ${isFestival ? 'var(--b3-theme-primary)' : 'var(--b3-theme-on-surface-light)'};">${displayLunar}</span>
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
            
            let realTaskEnd = dayjs(task.endTime);
            if (realTaskEnd.hour() === 0) {
                if (realTaskEnd.isAfter(dayjs(task.startTime))) {
                    realTaskEnd = realTaskEnd.subtract(1, 'minute');
                }
            }
            const taskEnd = realTaskEnd.endOf('day');
            
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
            
            let realTaskEnd = dayjs(task.endTime);
            if (realTaskEnd.hour() === 0) {
                if (realTaskEnd.isAfter(dayjs(task.startTime))) {
                    realTaskEnd = realTaskEnd.subtract(1, 'minute');
                }
            }
            const taskEnd = realTaskEnd.endOf('day');

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
                    taskEl.dataset.taskId = task.id;
                    
                    const isContLeft = taskStart.isBefore(weekStart);
                    const isContRight = taskEnd.isAfter(weekEnd);
                    
                    taskEl.textContent = task.content;
                    taskEl.title = `${task.content} (${dayjs(task.startTime).format("YYYY-MM-DD HH:mm")} - ${dayjs(task.endTime).format("YYYY-MM-DD HH:mm")})`;
                    
                    // Style positioning
                    const cellWidth = 14.2857; // 100 / 7
                    const leftPercent = startCol * cellWidth;
                    const widthPercent = span * cellWidth;
                    
                    taskEl.style.top = `${rowIndex * 24 + 36}px`;

                    // Logic to visually end in the correct cell:
                    const marginLeft = isContLeft ? 0 : 5;
                    // Significantly increase right margin for end of task to match TickTick style
                    const marginRight = isContRight ? 0 : 5; 
                    const totalMargin = marginLeft + marginRight;
                    
                    taskEl.style.left = `calc(${leftPercent}% + ${marginLeft}px)`;
                    taskEl.style.width = `calc(${widthPercent}% - ${totalMargin}px)`;

                    // Click to highlight
                    taskEl.addEventListener("click", (e) => {
                        // Highlight self
                        this.highlightTask(task.id);
                        // Notify parent
                        if (this.onTaskClick) {
                            this.onTaskClick(task.id);
                        }
                    });

                    // Visual adjustments for connections
                    if (isContLeft) {
                        taskEl.classList.add("continues-left");
                        taskEl.style.borderTopLeftRadius = "0";
                        taskEl.style.borderBottomLeftRadius = "0";
                    }
                    if (isContRight) {
                        taskEl.classList.add("continues-right");
                        taskEl.style.borderTopRightRadius = "0";
                        taskEl.style.borderBottomRightRadius = "0";
                    }

                    // Context Menu for Task Bar
                    taskEl.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Also highlight on right click
                        this.highlightTask(task.id);
                        if (this.onTaskClick) {
                            this.onTaskClick(task.id);
                        }
                        
                        const menu = new Menu("calendar-task-context-menu");
                        menu.addItem({
                            icon: "iconEdit",
                            label: "编辑",
                            click: () => {
                                if (this.onEditTask) {
                                    this.onEditTask(task);
                                }
                            }
                        });
                        menu.addItem({
                            icon: "iconTrashcan",
                            label: "删除",
                            click: async () => {
                                await this.store.removeTask(task.id);
                                this.render();
                            }
                        });
                        menu.open({
                            x: e.clientX,
                            y: e.clientY,
                            isLeft: true,
                        });
                    });

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

        this.container.querySelector("#todayBtn")?.addEventListener("click", () => {
            this.currentMonth = dayjs();
            this.render();
        });

        // Date Picker Events
        const dateWrapper = this.container.querySelector(".current-date-wrapper");
        const popup = this.container.querySelector(".date-picker-popup") as HTMLElement;
        
        dateWrapper?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.isDatePickerOpen = !this.isDatePickerOpen;
            this.pickerYear = this.currentMonth.year(); // Reset picker year to current view year on open
            this.render();
        });

        popup?.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        document.addEventListener("click", () => {
            if (this.isDatePickerOpen) {
                this.isDatePickerOpen = false;
                this.render();
            }
        }, { once: true }); // Use once to avoid accumulating listeners if render is called multiple times? 
        // No, render removes old elements but document listener persists. 
        // Better pattern: bind document click once in constructor or handle cleanup. 
        // For now, I'll use a named handler or just simple check. 
        // Actually, since I re-render, the old elements are gone.
        // But the document listener is global. I should be careful.
        // A simple way is to check if the click target is inside the container.
        
        // Let's rely on the fact that clicking outside triggers document click.
        // I will add a click listener to the container to stop propagation? No, that prevents other things.
        // I will simply add a document click listener that checks if the click was outside the popup.
        // Since I re-render often, I should probably manage the document listener better.
        // Or just let the simple "click anywhere else" logic work by re-rendering.
        
        // Year Navigation
        this.container.querySelector(".prev-year-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.pickerYear--;
            this.updateDatePicker();
        });

        this.container.querySelector(".next-year-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.pickerYear++;
            this.updateDatePicker();
        });

        this.container.querySelector(".reset-year-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.pickerYear = dayjs().year();
            this.updateDatePicker();
        });

        // Month Selection
        this.container.querySelectorAll(".month-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const month = parseInt((e.target as HTMLElement).dataset.month || "0");
                this.currentMonth = this.currentMonth.year(this.pickerYear).month(month);
                this.isDatePickerOpen = false;
                this.render();
            });
        });

        this.initDragSelection();
    }

    updateDatePicker() {
        // Targeted update for picker content to avoid full re-render
        const yearEl = this.container.querySelector(".picker-year");
        if (yearEl) yearEl.textContent = `${this.pickerYear}年`;

        const monthsContainer = this.container.querySelector(".picker-months");
        if (monthsContainer) {
            monthsContainer.innerHTML = Array.from({ length: 12 }, (_, i) => {
                const isSelected = this.pickerYear === this.currentMonth.year() && i === this.currentMonth.month();
                return `<div class="month-item ${isSelected ? 'selected' : ''}" data-month="${i}">${i + 1}月</div>`;
            }).join('');
            
            // Re-bind month click events
            monthsContainer.querySelectorAll(".month-item").forEach(item => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const month = parseInt((e.target as HTMLElement).dataset.month || "0");
                    this.currentMonth = this.currentMonth.year(this.pickerYear).month(month);
                    this.isDatePickerOpen = false;
                    this.render();
                });
            });
        }
    }

    private initDragSelection() {
        const weeksContainer = this.container.querySelector("#calendarWeeks");
        if (!weeksContainer) return;

        let isDragging = false;
        let startCell: HTMLElement | null = null;
        let currentCell: HTMLElement | null = null;

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging || !startCell) return;
            const cell = (e.target as HTMLElement).closest(".day-cell") as HTMLElement;
            if (cell && weeksContainer.contains(cell) && cell !== currentCell) {
                currentCell = cell;
                this.updateSelection(startCell, currentCell);
            }
        };

        const onMouseUp = (e: MouseEvent) => {
            if (!isDragging) return;
            
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            if (!startCell || !currentCell) return;
            
            const startDateStr = startCell.dataset.date;
            const endDateStr = currentCell.dataset.date;
            
            if (startDateStr && endDateStr) {
                let startDate = dayjs(startDateStr);
                let endDate = dayjs(endDateStr);
                
                if (startDate.isAfter(endDate)) {
                    [startDate, endDate] = [endDate, startDate];
                }
                
                if (this.onRangeSelect) {
                    this.onRangeSelect(startDate, endDate.endOf('day'));
                }
            }
            
            this.clearSelection();
            startCell = null;
            currentCell = null;
        };

        weeksContainer.addEventListener("mousedown", (e) => {
            if ((e as MouseEvent).button !== 0) return;

            const target = e.target as HTMLElement;
            const cell = target.closest(".day-cell") as HTMLElement;
            
            if (target.closest(".task-bar") || target.closest(".holiday-badge")) return;
            
            // Check if any task is currently highlighted
            if (this.container.querySelector(".task-bar-highlight")) {
                return;
            }
            
            if (cell) {
                isDragging = true;
                startCell = cell;
                currentCell = cell;
                this.updateSelection(startCell, currentCell);
                
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
                
                e.preventDefault();
            }
        });
    }

    private updateSelection(start: HTMLElement, end: HTMLElement) {
        const startDateStr = start.dataset.date;
        const endDateStr = end.dataset.date;
        if (!startDateStr || !endDateStr) return;

        let startDate = dayjs(startDateStr);
        let endDate = dayjs(endDateStr);

        if (startDate.isAfter(endDate)) {
            [startDate, endDate] = [endDate, startDate];
        }

        const cells = this.container.querySelectorAll(".day-cell");
        cells.forEach(cell => {
            const cellDateStr = (cell as HTMLElement).dataset.date;
            if (cellDateStr) {
                const cellDate = dayjs(cellDateStr);
                if (cellDate.isBetween(startDate, endDate, 'day', '[]')) {
                    cell.classList.add("drag-selected");
                } else {
                    cell.classList.remove("drag-selected");
                }
            }
        });
    }

    private clearSelection() {
        this.container.querySelectorAll(".day-cell.drag-selected").forEach(cell => {
            cell.classList.remove("drag-selected");
        });
    }

    public highlightTask(taskId: string) {
        // Remove existing highlights
        this.clearHighlight();

        // Add highlight to matching tasks
        const taskEls = this.container.querySelectorAll(`.task-bar[data-task-id="${taskId}"]`);
        taskEls.forEach(el => {
            el.classList.add("task-bar-highlight");
            // Ensure the element is visible (optional, but good for UX)
            // el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

    public clearHighlight() {
        this.container.querySelectorAll(".task-bar-highlight").forEach(el => {
            el.classList.remove("task-bar-highlight");
        });
    }
}
