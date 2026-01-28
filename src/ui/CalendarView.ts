import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Solar, HolidayUtil } from "lunar-javascript";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";

dayjs.extend(isBetween);

export class CalendarView {
    private container: HTMLElement;
    private store: TaskStore;
    private currentMonth: dayjs.Dayjs;
    private isDatePickerOpen: boolean = false;
    private pickerYear: number;

    constructor(container: HTMLElement, store: TaskStore) {
        this.container = container;
        this.store = store;
        this.currentMonth = dayjs();
        this.pickerYear = this.currentMonth.year();
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
            // If end time is 00:00 (ignoring seconds/ms), treat as end of previous day
            if (realTaskEnd.format('HH:mm') === '00:00') {
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
            if (realTaskEnd.format('HH:mm') === '00:00') {
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
                    const marginLeft = isContLeft ? 0 : 2;
                    // Significantly increase right margin for end of task to match TickTick style
                    const marginRight = isContRight ? 0 : 12; 
                    const totalMargin = marginLeft + marginRight;
                    
                    taskEl.style.left = `calc(${leftPercent}% + ${marginLeft}px)`;
                    taskEl.style.width = `calc(${widthPercent}% - ${totalMargin}px)`;

                    // Visual adjustments for connections
                    if (isContLeft) {
                        taskEl.classList.add("continues-left");
                    }
                    if (isContRight) {
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
    }

    private updateDatePicker() {
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
}
