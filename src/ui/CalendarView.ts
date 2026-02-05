import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { Solar, HolidayUtil } from "lunar-javascript";
import { ITask } from "../types";
import { TaskStore } from "../services/TaskStore";
import { Menu } from "siyuan";

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

export class CalendarView {
    private container: HTMLElement;
    private store: TaskStore;
    private currentDate: dayjs.Dayjs;
    private viewMode: 'month' | 'week' = 'month';
    private isMorningCollapsed: boolean = true;
    private isEveningCollapsed: boolean = true;
    private MORNING_END_HOUR = 7;
    private EVENING_START_HOUR = 20;
    private readonly HOUR_HEIGHT = 50;
    private readonly COLLAPSED_HEIGHT = 50;

    private isDatePickerOpen: boolean = false;
    private isViewSwitcherOpen: boolean = false;
    private pickerYear: number;
    private onEditTask?: (task: ITask) => void;
    private onTaskClick?: (taskId: string) => void;
    private onRangeSelect?: (start: dayjs.Dayjs, end: dayjs.Dayjs) => void;

    constructor(container: HTMLElement, store: TaskStore) {
        this.container = container;
        this.store = store;
        this.currentDate = dayjs();
        this.pickerYear = this.currentDate.year();
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
        let headerText = this.currentDate.format("YYYY年MM月");
        
        this.container.innerHTML = `
            <div class="task-planner-calendar" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
                <div class="calendar-header" style="padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
                    <div class="header-left" style="display: flex; align-items: center; gap: 16px; position: relative;">
                        <div class="current-date-wrapper" style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            <span class="current-date" style="font-size: 20px; font-weight: 600; color: var(--b3-theme-on-background);">${headerText}</span>
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
                                    const isSelected = this.pickerYear === this.currentDate.year() && i === this.currentDate.month();
                                    return `<div class="month-item ${isSelected ? 'selected' : ''}" data-month="${i}">${i + 1}月</div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="header-right" style="display: flex; gap: 8px;">
                        <div style="position: relative;">
                            <button id="viewSwitcherBtn" class="ticktick-view-switcher">
                                <span>${this.viewMode === 'month' ? '月' : '周'}</span>
                                <svg style="width: 10px; height: 10px;" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="currentColor"></path></svg>
                            </button>
                            <!-- View Switcher Popup -->
                            <div class="view-switcher-popup ${this.isViewSwitcherOpen ? '' : 'fn__none'}" style="position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--b3-theme-surface); border: 1px solid var(--b3-theme-surface-lighter); border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); z-index: 10; min-width: 80px; padding: 4px 0;">
                                <div class="view-option ${this.viewMode === 'month' ? 'selected' : ''}" data-view="month" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                                    <span>月</span>
                                    ${this.viewMode === 'month' ? '<svg style="width: 12px; height: 12px; color: var(--b3-theme-primary);" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"></path></svg>' : ''}
                                </div>
                                <div class="view-option ${this.viewMode === 'week' ? 'selected' : ''}" data-view="week" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                                    <span>周</span>
                                    ${this.viewMode === 'week' ? '<svg style="width: 12px; height: 12px; color: var(--b3-theme-primary);" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"></path></svg>' : ''}
                                </div>
                            </div>
                        </div>

                        <div class="ticktick-nav-group">
                            <button id="prevBtn" class="nav-btn" title="上一个">
                                <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"></path></svg>
                            </button>
                            <button id="todayBtn" class="nav-btn today-btn">今天</button>
                            <button id="nextBtn" class="nav-btn" title="下一个">
                                <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="currentColor"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
                
                ${this.viewMode === 'month' ? `
                <div class="calendar-grid-header" style="border-bottom: 1px solid var(--b3-theme-surface-lighter); padding-bottom: 8px; flex-shrink: 0; margin-bottom: 0;">
                    <div>周日</div><div>周一</div><div>周二</div><div>周三</div><div>周四</div><div>周五</div><div>周六</div>
                </div>
                <div class="calendar-weeks" id="calendarWeeks" style="overflow-y: auto; flex: 1;"></div>
                ` : `
                <div class="calendar-weeks" id="calendarWeeks" style="display: flex; flex-direction: column; flex: 1; overflow: hidden;"></div>
                `}
            </div>
        `;

        if (this.viewMode === 'month') {
            this.renderWeeks();
        } else {
            this.renderWeekView();
        }
        this.bindEvents();
    }

    private renderWeeks() {
        const weeksContainer = this.container.querySelector("#calendarWeeks");
        if (!weeksContainer) return;
        weeksContainer.innerHTML = "";

        const startOfMonth = this.currentDate.startOf("month");
        const endOfMonth = this.currentDate.endOf("month");
        
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

    private getYFromDate(date: dayjs.Dayjs): number {
        const hour = date.hour() + date.minute() / 60;
        let y = 0;

        // 1. Morning Section (0 -> MORNING_END_HOUR)
        if (hour < this.MORNING_END_HOUR) {
            if (this.isMorningCollapsed) {
                return (hour / this.MORNING_END_HOUR) * this.COLLAPSED_HEIGHT;
            } else {
                return hour * this.HOUR_HEIGHT;
            }
        }
        
        y += this.isMorningCollapsed ? this.COLLAPSED_HEIGHT : (this.MORNING_END_HOUR * this.HOUR_HEIGHT);

        // 2. Day Section (MORNING_END_HOUR -> EVENING_START_HOUR)
        if (hour < this.EVENING_START_HOUR) {
            return y + (hour - this.MORNING_END_HOUR) * this.HOUR_HEIGHT;
        }

        y += (this.EVENING_START_HOUR - this.MORNING_END_HOUR) * this.HOUR_HEIGHT;

        // 3. Evening Section (EVENING_START_HOUR -> 24)
        if (this.isEveningCollapsed) {
            const eveningDuration = 24 - this.EVENING_START_HOUR;
            return y + ((hour - this.EVENING_START_HOUR) / eveningDuration) * this.COLLAPSED_HEIGHT;
        } else {
            return y + (hour - this.EVENING_START_HOUR) * this.HOUR_HEIGHT;
        }
    }

    private getTimeFromY(y: number): { hour: number, minute: number } {
        let totalHours = 0;
        let currentY = 0;

        // 1. Morning Section
        const morningHeight = this.isMorningCollapsed ? this.COLLAPSED_HEIGHT : (this.MORNING_END_HOUR * this.HOUR_HEIGHT);
        
        if (y < morningHeight) {
            if (this.isMorningCollapsed) {
                totalHours = (y / this.COLLAPSED_HEIGHT) * this.MORNING_END_HOUR;
            } else {
                totalHours = y / this.HOUR_HEIGHT;
            }
        } else {
            currentY += morningHeight;
            
            // 2. Day Section
            const dayHeight = (this.EVENING_START_HOUR - this.MORNING_END_HOUR) * this.HOUR_HEIGHT;
            
            if (y < currentY + dayHeight) {
                totalHours = this.MORNING_END_HOUR + (y - currentY) / this.HOUR_HEIGHT;
            } else {
                currentY += dayHeight;
                
                // 3. Evening Section
                if (this.isEveningCollapsed) {
                    const eveningDuration = 24 - this.EVENING_START_HOUR;
                    totalHours = this.EVENING_START_HOUR + ((y - currentY) / this.COLLAPSED_HEIGHT) * eveningDuration;
                } else {
                    totalHours = this.EVENING_START_HOUR + (y - currentY) / this.HOUR_HEIGHT;
                }
            }
        }
        
        // Clamp 0-24
        totalHours = Math.max(0, Math.min(23.99, totalHours));
        
        const hour = Math.floor(totalHours);
        const minute = Math.round(((totalHours - hour) * 60) / 15) * 15;
        return { hour, minute };
    }

    private createCollapseButton(container: HTMLElement, type: "morning" | "evening") {
        const collapseBtn = document.createElement("div");
        collapseBtn.className = `collapse-${type}-btn`;
        collapseBtn.draggable = true;
        collapseBtn.style.position = "absolute";
        collapseBtn.style.top = "-8px";
        collapseBtn.style.left = "0";
        collapseBtn.style.width = "100%";
        collapseBtn.style.display = "flex";
        collapseBtn.style.justifyContent = "center";
        collapseBtn.style.cursor = "ns-resize"; // Change cursor to indicate resize/drag
        collapseBtn.title = "点击折叠，拖拽调整范围";
        
        // Use consistent icon (Chevron Up) or vary it?
        // Morning collapses upwards (0-7 hidden), button is at 7.
        // Evening collapses downwards (20-24 hidden), button is at 20.
        // Let's use generic collapse icon
        collapseBtn.innerHTML = `<div style="background: var(--b3-theme-surface-lighter); border-radius: 4px; padding: 0 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"><svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" fill="currentColor"></path></svg></div>`;
        
        collapseBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (type === "morning") {
                this.isMorningCollapsed = true;
            } else {
                this.isEveningCollapsed = true;
            }
            this.render();
        });

        collapseBtn.addEventListener("dragstart", (e) => {
            e.stopPropagation();
            e.dataTransfer!.setData("application/collapse-type", type);
            e.dataTransfer!.effectAllowed = "move";
            // Set a transparent image or similar to avoid big ghost
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent
            e.dataTransfer!.setDragImage(img, 0, 0);
        });

        container.appendChild(collapseBtn);
    }

    private renderWeekView() {
        try {
            const weeksContainer = this.container.querySelector("#calendarWeeks");
            if (!weeksContainer) return;
            weeksContainer.innerHTML = "";

            const startOfWeek = this.currentDate.startOf("week");
            const weekDates = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, "day"));
            
            // 1. Header Row (Sticky)
            const headerRow = document.createElement("div");
            headerRow.className = "week-view-header";
            headerRow.style.display = "flex";
            headerRow.style.borderBottom = "1px solid var(--b3-theme-surface-lighter)";
            headerRow.style.paddingRight = "6px"; // Adjust for scrollbar
            headerRow.style.flexShrink = "0";

            // Time Column Header (Spacer)
            const timeHeader = document.createElement("div");
            timeHeader.style.width = "50px";
            timeHeader.style.flexShrink = "0";
            timeHeader.style.textAlign = "center";
            timeHeader.style.fontSize = "12px";
            timeHeader.style.color = "var(--b3-theme-on-surface-light)";
            timeHeader.style.padding = "8px 0";
            
            let weekNumText = "";
            try {
                weekNumText = `${startOfWeek.week()}周`;
            } catch (e) {
                console.warn("dayjs week() failed", e);
            }
            timeHeader.textContent = weekNumText;
            headerRow.appendChild(timeHeader);

            // Day Headers
            const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
            weekDates.forEach((date, i) => {
                const dayHeader = document.createElement("div");
                dayHeader.style.flex = "1";
                dayHeader.style.textAlign = "center";
                dayHeader.style.padding = "8px 0";
                dayHeader.style.borderLeft = "1px solid transparent"; // Placeholder
                
                const isToday = date.isSame(dayjs(), "day");
                const solar = Solar.fromYmd(date.year(), date.month() + 1, date.date());
                const lunar = solar.getLunar();
                const festival = lunar.getFestivals()[0] || solar.getFestivals()[0] || lunar.getJieQi() || "";
                const displayLunar = festival ? festival : lunar.getDayInChinese();
                
                let dayNumStyle = "font-size: 18px; font-weight: 600;";
                if (isToday) {
                    dayNumStyle += "color: var(--b3-theme-on-primary); background: var(--b3-theme-primary); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;";
                } else {
                    dayNumStyle += "color: var(--b3-theme-on-background);";
                }

                dayHeader.innerHTML = `
                    <div style="font-size: 12px; color: var(--b3-theme-on-surface-light); margin-bottom: 4px;">${dayNames[i]}</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <span style="${dayNumStyle}">${date.date()}</span>
                        <span style="font-size: 10px; color: ${festival ? 'var(--b3-theme-primary)' : 'var(--b3-theme-on-surface-light)'};">${displayLunar}</span>
                    </div>
                `;
                headerRow.appendChild(dayHeader);
            });
            weeksContainer.appendChild(headerRow);

            // 1.5 All Day Section
            const allDaySection = document.createElement("div");
            allDaySection.className = "week-all-day-section";
            allDaySection.style.display = "flex";
            allDaySection.style.borderBottom = "1px solid var(--b3-theme-surface-lighter)";
            allDaySection.style.flexShrink = "0";
            allDaySection.style.paddingRight = "6px"; // Adjust for scrollbar

            // All Day Label
            const allDayLabel = document.createElement("div");
            allDayLabel.style.width = "50px";
            allDayLabel.style.flexShrink = "0";
            allDayLabel.style.borderRight = "1px solid var(--b3-theme-surface-lighter)";
            allDayLabel.style.display = "flex";
            allDayLabel.style.alignItems = "center";
            allDayLabel.style.justifyContent = "center";
            allDayLabel.style.fontSize = "10px";
            allDayLabel.style.color = "var(--b3-theme-on-surface-light)";
            allDayLabel.textContent = "全天";
            allDaySection.appendChild(allDayLabel);

            // All Day Content
            const allDayContent = document.createElement("div");
            allDayContent.style.flex = "1";
            allDayContent.style.position = "relative";
            // We need to determine height based on content, but for now let's set min-height
            // It will be populated by renderAllDayTasks
            
            allDaySection.appendChild(allDayContent);
            weeksContainer.appendChild(allDaySection);

            // Render All Day Tasks
            this.renderAllDayTasks(allDayContent, startOfWeek);

            // 2. Scrollable Body
            const bodyScroll = document.createElement("div");
            bodyScroll.className = "week-view-body";
            bodyScroll.style.flex = "1";
            bodyScroll.style.overflowY = "auto";
            bodyScroll.style.display = "flex";
            bodyScroll.style.position = "relative";
            
            // Time Axis Column
            const timeAxis = document.createElement("div");
            timeAxis.className = "time-axis";
            timeAxis.style.width = "50px";
            timeAxis.style.flexShrink = "0";
            timeAxis.style.borderRight = "1px solid var(--b3-theme-surface-lighter)";
            timeAxis.style.backgroundColor = "var(--b3-theme-background)";
            
            // Drag & Drop for Collapse Bars
            timeAxis.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer!.dropEffect = "move";
            });

            timeAxis.addEventListener("drop", (e) => {
                e.preventDefault();
                const type = e.dataTransfer!.getData("application/collapse-type");
                if (!type) return;

                const rect = timeAxis.getBoundingClientRect();
                const relativeY = e.clientY - rect.top; // rect.top changes with scroll, so this gives Y relative to content top
                const { hour } = this.getTimeFromY(relativeY);
                const newBoundary = Math.round(hour);

                if (type === "morning") {
                    // Constraints: > 0 and < Evening Start
                    if (newBoundary > 0 && newBoundary < this.EVENING_START_HOUR) {
                        this.MORNING_END_HOUR = newBoundary;
                        this.render();
                    }
                } else if (type === "evening") {
                    // Constraints: > Morning End and < 24
                    if (newBoundary > this.MORNING_END_HOUR && newBoundary < 24) {
                        this.EVENING_START_HOUR = newBoundary;
                        this.render();
                    }
                }
            });
            
            // 24 Hours
            const renderTimeSlot = (hour: number, height: number, labelText: string, isCollapsedBlock: boolean = false) => {
                const timeSlot = document.createElement("div");
                timeSlot.style.height = `${height}px`;
                timeSlot.style.position = "relative";
                timeSlot.style.fontSize = "12px";
                timeSlot.style.color = "var(--b3-theme-on-surface-light)";
                timeSlot.style.textAlign = isCollapsedBlock ? "center" : "right";
                timeSlot.style.paddingRight = isCollapsedBlock ? "0" : "6px";
                timeSlot.style.boxSizing = "border-box";
                
                if (isCollapsedBlock) {
                    timeSlot.style.backgroundColor = "var(--b3-theme-surface-lighter)";
                    timeSlot.style.cursor = "pointer";
                    timeSlot.title = "点击展开，拖拽调整范围";
                    timeSlot.draggable = true;
                    
                    const isMorning = hour === 0; // Heuristic

                    timeSlot.addEventListener("dragstart", (e) => {
                        e.stopPropagation();
                        e.dataTransfer!.setData("application/collapse-type", isMorning ? "morning" : "evening");
                        e.dataTransfer!.effectAllowed = "move";
                        const img = new Image();
                        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
                        e.dataTransfer!.setDragImage(img, 0, 0);
                    });

                    timeSlot.addEventListener("click", () => {
                        if (isMorning) {
                            this.isMorningCollapsed = false;
                        } else {
                            this.isEveningCollapsed = false;
                        }
                        this.render();
                    });
                    
                    const icon = document.createElement("div");
                    icon.innerHTML = `<svg style="width: 12px; height: 12px;" viewBox="0 0 24 24"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" fill="currentColor"></path></svg>`;
                    icon.style.display = "flex";
                    icon.style.justifyContent = "center";
                    icon.style.alignItems = "center";
                    icon.style.height = "100%";
                    timeSlot.appendChild(icon);
                }

                // Label
                const label = document.createElement("span");
                label.innerHTML = labelText.replace(" - ", "<br>-<br>");
                label.style.position = "absolute";
                // Align to top grid line for standard slots, center for collapsed
                label.style.top = isCollapsedBlock ? "50%" : "0"; 
                label.style.transform = "translateY(-50%)";
                label.style.right = isCollapsedBlock ? "0" : "6px";
                label.style.left = isCollapsedBlock ? "0" : "auto";
                label.style.width = isCollapsedBlock ? "100%" : "auto";
                label.style.textAlign = isCollapsedBlock ? "center" : "right";
                label.style.lineHeight = "1.2";
                
                // Styling update for better look
                if (!isCollapsedBlock) {
                    label.style.fontFamily = "Roboto, sans-serif";
                    label.style.color = "var(--b3-theme-on-surface-light)";
                    label.style.fontSize = "11px"; // Slightly smaller for elegance
                }

                if ((hour !== 0 || isCollapsedBlock) && labelText) timeSlot.appendChild(label);
                
                // Add collapse button for the expansion boundary (Morning End and Evening Start)
                // Morning End Button (e.g. at 7:00)
                if (!this.isMorningCollapsed && hour === this.MORNING_END_HOUR) {
                    this.createCollapseButton(timeSlot, "morning");
                }
                
                // Evening Start Button (e.g. at 20:00)
                if (!this.isEveningCollapsed && hour === this.EVENING_START_HOUR) {
                     this.createCollapseButton(timeSlot, "evening");
                }

                timeAxis.appendChild(timeSlot);
            };

            // 1. Morning Section
            if (this.isMorningCollapsed) {
                renderTimeSlot(0, this.COLLAPSED_HEIGHT, "00:00 - 07:00", true);
            } else {
                for (let i = 0; i < this.MORNING_END_HOUR; i++) {
                    renderTimeSlot(i, this.HOUR_HEIGHT, `${i.toString().padStart(2, '0')}:00`);
                }
            }

            // 2. Day Section
            for (let i = this.MORNING_END_HOUR; i < this.EVENING_START_HOUR; i++) {
                let labelText = `${i.toString().padStart(2, '0')}:00`;
                // Hide label if morning is collapsed to avoid duplication with "00:00 - 07:00"
                if (this.isMorningCollapsed && i === this.MORNING_END_HOUR) {
                    labelText = "";
                }
                renderTimeSlot(i, this.HOUR_HEIGHT, labelText);
            }

            // 3. Evening Section
            if (this.isEveningCollapsed) {
                 renderTimeSlot(this.EVENING_START_HOUR, this.COLLAPSED_HEIGHT, "20:00 - 00:00", true);
            } else {
                for (let i = this.EVENING_START_HOUR; i < 24; i++) {
                    renderTimeSlot(i, this.HOUR_HEIGHT, `${i.toString().padStart(2, '0')}:00`);
                }
            }
            
            bodyScroll.appendChild(timeAxis);

            // Grid Container
            const gridContainer = document.createElement("div");
            gridContainer.className = "week-grid-container";
            gridContainer.style.flex = "1";
            gridContainer.style.position = "relative";
            gridContainer.style.display = "flex";
            
            // Background Grid Lines (Horizontal)
            const bgGrid = document.createElement("div");
            bgGrid.style.position = "absolute";
            bgGrid.style.top = "0";
            bgGrid.style.left = "0";
            bgGrid.style.width = "100%";
            
            let totalHeight = 0;
            // Calculate Total Height
            // Morning
            totalHeight += this.isMorningCollapsed ? this.COLLAPSED_HEIGHT : (this.MORNING_END_HOUR * this.HOUR_HEIGHT);
            // Day
            totalHeight += (this.EVENING_START_HOUR - this.MORNING_END_HOUR) * this.HOUR_HEIGHT;
            // Evening
            totalHeight += this.isEveningCollapsed ? this.COLLAPSED_HEIGHT : ((24 - this.EVENING_START_HOUR) * this.HOUR_HEIGHT);
                
            bgGrid.style.height = `${totalHeight}px`;
            bgGrid.style.pointerEvents = "none";
            
            const renderGridLine = (height: number, isFirst: boolean) => {
                const line = document.createElement("div");
                line.style.height = `${height}px`;
                line.style.borderTop = "1px solid var(--b3-theme-surface-lighter)";
                line.style.boxSizing = "border-box";
                if (isFirst) line.style.borderTop = "none";
                bgGrid.appendChild(line);
            };

            // 1. Morning Grid
            if (this.isMorningCollapsed) {
                renderGridLine(this.COLLAPSED_HEIGHT, true); 
            } else {
                for (let i = 0; i < this.MORNING_END_HOUR; i++) {
                    renderGridLine(this.HOUR_HEIGHT, i === 0);
                }
            }

            // 2. Day Grid
            for (let i = this.MORNING_END_HOUR; i < this.EVENING_START_HOUR; i++) {
                 // isFirst logic depends on morning state
                 const isFirst = this.isMorningCollapsed ? false : (i === 0); 
                 // Actually isFirst is only for the very top line of the calendar
                 renderGridLine(this.HOUR_HEIGHT, false);
            }

            // 3. Evening Grid
            if (this.isEveningCollapsed) {
                renderGridLine(this.COLLAPSED_HEIGHT, false);
            } else {
                for (let i = this.EVENING_START_HOUR; i < 24; i++) {
                    renderGridLine(this.HOUR_HEIGHT, false);
                }
            }

            gridContainer.appendChild(bgGrid);

            // Day Columns
            weekDates.forEach((date, i) => {
                const col = document.createElement("div");
                col.className = "day-column";
                col.dataset.date = date.format("YYYY-MM-DD");
                col.style.flex = "1";
                col.style.borderLeft = "1px solid var(--b3-theme-surface-lighter)";
                col.style.height = `${totalHeight}px`;
                col.style.position = "relative";
                
                // Drag & Drop Listeners (Move Task)
                col.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    e.dataTransfer!.dropEffect = "move";
                });

                col.addEventListener("drop", async (e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer!.getData("text/plain");
                    const offsetMinutesStr = e.dataTransfer!.getData("application/offset-minutes");
                    
                    if (!taskId) return;

                    const tasks = this.store.getTasks();
                    const task = tasks.find(t => t.id === taskId);
                    if (!task) return;

                    // Calculate new Start Time
                    const dateStr = col.dataset.date;
                    const rect = col.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const { hour, minute } = this.getTimeFromY(relativeY);
                    
                    let newStart = dayjs(dateStr).hour(hour).minute(minute).second(0);
                    
                    // Apply offset to keep relative mouse position if available
                    // (Optional optimization: calculate offset on dragstart)
                    // For now, snap top of task to mouse position is simplest, 
                    // OR better: snap based on where we grabbed the task.
                    // Let's stick to simple "snap to slot" first, 
                    // but users prefer relative move.
                    // If I stored "minutes from start of task" in dragstart, I could use it.
                    
                    if (offsetMinutesStr) {
                         const offset = parseInt(offsetMinutesStr, 10);
                         newStart = newStart.subtract(offset, 'minute');
                    }

                    // Snap to nearest 15m
                    const remainder = newStart.minute() % 15;
                    if (remainder >= 8) {
                        newStart = newStart.add(15 - remainder, 'minute');
                    } else {
                        newStart = newStart.subtract(remainder, 'minute');
                    }

                    // Calculate Duration
                    const oldStart = dayjs(task.startTime);
                    const oldEnd = dayjs(task.endTime);
                    const duration = oldEnd.diff(oldStart, 'minute');

                    const newEnd = newStart.add(duration, 'minute');

                    // Update Task
                    task.startTime = newStart.valueOf();
                    task.endTime = newEnd.valueOf();
                    
                    await this.store.updateTask(task);
                    this.render();
                });
                
                gridContainer.appendChild(col);
            });

            // Render Tasks
            this.renderWeekTasks(gridContainer, startOfWeek);

            bodyScroll.appendChild(gridContainer);
            weeksContainer.appendChild(bodyScroll);
        } catch (error) {
            console.error("Error rendering week view:", error);
        }
    }

    private renderAllDayTasks(container: HTMLElement, startOfWeek: dayjs.Dayjs) {
        const tasks = this.store.getTasks();
        const weekEnd = startOfWeek.add(6, "day").endOf("day");

        // Filter for All Day tasks in this week
        const weekTasks = tasks.filter(task => {
            if (!task.allDay) return false;

            const taskStart = dayjs(task.startTime).startOf('day');
            
            // Make end time inclusive for 00:00
            const taskEnd = dayjs(task.endTime).endOf('day');
            
            return !(taskEnd.isBefore(startOfWeek) || taskStart.isAfter(weekEnd));
        });

        // Background grid for visual alignment
        const bgGrid = document.createElement("div");
        bgGrid.style.position = "absolute";
        bgGrid.style.top = "0";
        bgGrid.style.left = "0";
        bgGrid.style.width = "100%";
        bgGrid.style.height = "100%";
        bgGrid.style.display = "flex";
        bgGrid.style.pointerEvents = "none";
        
        for (let i = 0; i < 7; i++) {
            const col = document.createElement("div");
            col.style.flex = "1";
            col.style.borderLeft = "1px solid var(--b3-theme-surface-lighter)";
            bgGrid.appendChild(col);
        }
        container.appendChild(bgGrid);

        if (weekTasks.length === 0) {
            container.style.height = "28px"; // Min height
            return;
        }

        // Layout algorithm (same as Month View)
        const taskSlots: (ITask | null)[][] = []; 
        
        weekTasks.sort((a, b) => {
            const spanA = dayjs(a.endTime).diff(dayjs(a.startTime));
            const spanB = dayjs(b.endTime).diff(dayjs(b.startTime));
            if (spanA !== spanB) return spanB - spanA;
            return a.startTime - b.startTime;
        });

        weekTasks.forEach(task => {
            const taskStart = dayjs(task.startTime).startOf('day');
            
            // Make end time inclusive for 00:00
            const taskEnd = dayjs(task.endTime).endOf('day');

            const viewStart = taskStart.isBefore(startOfWeek) ? startOfWeek : taskStart;
            const viewEnd = taskEnd.isAfter(weekEnd) ? weekEnd : taskEnd;

            const startCol = viewStart.diff(startOfWeek, 'day');
            const span = viewEnd.diff(viewStart, 'day') + 1;

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
                    for (let i = startCol; i < startCol + span; i++) {
                        taskSlots[rowIndex][i] = task;
                    }
                    
                    const taskEl = document.createElement("div");
                    taskEl.className = "all-day-task-bar";
                    taskEl.dataset.taskId = task.id;
                    taskEl.textContent = task.content;
                    taskEl.title = task.content;
                    
                    const cellWidth = 14.2857;
                    const leftPercent = startCol * cellWidth;
                    const widthPercent = span * cellWidth;
                    
                    // Gap logic: similar to Month View
                    const isContLeft = taskStart.isBefore(startOfWeek);
                    const isContRight = taskEnd.isAfter(weekEnd);
                    const marginLeft = 2; // Fixed 2px margin left
                    const marginRight = 2; // Fixed 2px margin right
                    const totalMargin = marginLeft + marginRight;

                    taskEl.style.position = "absolute";
                    taskEl.style.top = `${rowIndex * 24 + 4}px`; // 4px padding top
                    taskEl.style.height = "18px";
                    taskEl.style.left = `calc(${leftPercent}% + ${marginLeft}px)`;
                    taskEl.style.width = `calc(${widthPercent}% - ${totalMargin}px)`;
                    taskEl.style.boxSizing = "border-box";
                    
                    if (isContLeft) {
                        taskEl.style.borderTopLeftRadius = "0";
                        taskEl.style.borderBottomLeftRadius = "0";
                    }
                    if (isContRight) {
                        taskEl.style.borderTopRightRadius = "0";
                        taskEl.style.borderBottomRightRadius = "0";
                    }
                    taskEl.style.backgroundColor = "rgba(97, 127, 222, 0.2)";
                    taskEl.style.color = "var(--b3-theme-on-background)";
                    taskEl.style.fontSize = "12px";
                    taskEl.style.borderRadius = "4px";
                    taskEl.style.padding = "0 8px";
                    taskEl.style.overflow = "hidden";
                    taskEl.style.whiteSpace = "nowrap";
                    taskEl.style.textOverflow = "ellipsis";
                    taskEl.style.cursor = "pointer";
                    taskEl.style.zIndex = "10";

                    // Click & Context Menu
                    taskEl.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.highlightTask(task.id);
                        if (this.onTaskClick) this.onTaskClick(task.id);
                    });

                    taskEl.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.highlightTask(task.id);
                        if (this.onTaskClick) this.onTaskClick(task.id);
                        
                        const menu = new Menu("all-day-task-context-menu");
                        menu.addItem({
                            icon: "iconEdit",
                            label: "编辑",
                            click: () => { if (this.onEditTask) this.onEditTask(task); }
                        });
                        menu.addItem({
                            icon: "iconTrashcan",
                            label: "删除",
                            click: async () => {
                                await this.store.removeTask(task.id);
                                this.render();
                            }
                        });
                        menu.open({ x: e.clientX, y: e.clientY, isLeft: true });
                    });

                    container.appendChild(taskEl);
                    break;
                }
                rowIndex++;
            }
        });

        // Set container height
        const totalRows = taskSlots.length;
        const rowHeight = 24;
        const totalHeight = Math.max(28, totalRows * rowHeight + 8); // Minimum 28px
        container.style.height = `${totalHeight}px`;
    }

    private renderWeekTasks(container: HTMLElement, startOfWeek: dayjs.Dayjs) {
        const tasks = this.store.getTasks();
        const weekEnd = startOfWeek.add(6, "day").endOf("day");
        
        const weekTasks = tasks.filter(task => {
            if (task.allDay) return false; // Skip All Day tasks

            const taskStart = dayjs(task.startTime);
            const taskEnd = dayjs(task.endTime);
            return !(taskEnd.isBefore(startOfWeek) || taskStart.isAfter(weekEnd));
        });

        // Simple overlap logic: just render them
        // TODO: Advanced overlap handling (width adjustment)
        
        weekTasks.forEach(task => {
            const taskStart = dayjs(task.startTime);
            const taskEnd = dayjs(task.endTime);
            
            // Find which day column(s) this task belongs to
            // For MVP, handle single-day tasks mainly. Multi-day tasks in TimeGrid are complex.
            // Let's assume tasks are split or we just render in the start day for now, 
            // or render "All Day" section separately (TickTick does this).
            // Here, we'll iterate days and check overlap.
            
            for (let i = 0; i < 7; i++) {
                const currentDay = startOfWeek.add(i, "day");
                const dayStart = currentDay.startOf("day");
                const dayEnd = currentDay.endOf("day");
                
                // Check overlap with this day
                if (taskStart.isBefore(dayEnd) && taskEnd.isAfter(dayStart)) {
                    // Calculate vertical position
                    // Start relative to day
                    let effectiveStart = taskStart;
                    if (taskStart.isBefore(dayStart)) effectiveStart = dayStart;
                    
                    let effectiveEnd = taskEnd;
                    if (taskEnd.isAfter(dayEnd)) effectiveEnd = dayEnd;
                    
                    // Use new helper for Y coordinates
                    const startY = this.getYFromDate(effectiveStart);
                    const endY = this.getYFromDate(effectiveEnd);
                    const durationHeight = endY - startY;
                    
                    if (durationHeight <= 0) continue;

                    const top = startY;
                    const height = Math.max(20, durationHeight); // Min height 20px
                    
                    // Render Task Block
                    const taskEl = document.createElement("div");
                    taskEl.className = "week-task-block";
                    taskEl.draggable = true;
                    taskEl.dataset.taskId = task.id;
                    taskEl.textContent = task.content;
                    taskEl.title = `${task.content} (${effectiveStart.format("HH:mm")} - ${effectiveEnd.format("HH:mm")})`;
                    
                    // Drag Start (Move)
                    taskEl.addEventListener("dragstart", (e) => {
                        e.dataTransfer!.setData("text/plain", task.id);
                        e.dataTransfer!.effectAllowed = "move";
                        
                        // Calculate offset (minutes from start of task)
                        const rect = taskEl.getBoundingClientRect();
                        const offsetY = e.clientY - rect.top;
                        const taskDuration = dayjs(task.endTime).diff(dayjs(task.startTime), 'minute');
                        const pixelHeight = rect.height;
                        // Avoid division by zero
                        if (pixelHeight > 0) {
                             const offsetMinutes = Math.round((offsetY / pixelHeight) * taskDuration);
                             e.dataTransfer!.setData("application/offset-minutes", offsetMinutes.toString());
                        }
                    });

                    taskEl.style.position = "absolute";
                    taskEl.style.top = `${top}px`;
                    taskEl.style.height = `${height - 1}px`;
                    taskEl.style.left = "2px";
                    taskEl.style.right = "2px";
                    taskEl.style.boxSizing = "border-box";
                    taskEl.style.backgroundColor = "rgba(97, 127, 222, 0.2)";
                    taskEl.style.color = "var(--b3-theme-on-background)";
                    taskEl.style.borderRadius = "4px";
                    taskEl.style.padding = "2px 4px";
                    taskEl.style.fontSize = "12px";
                    taskEl.style.overflow = "hidden";
                    taskEl.style.cursor = "pointer";
                    taskEl.style.zIndex = "10";
                    taskEl.style.boxShadow = "none";
                    // taskEl.style.borderLeft = "3px solid #617fde";

                    // Resize Handle
                    const resizeHandle = document.createElement("div");
                    resizeHandle.className = "task-resize-handle";
                    resizeHandle.style.position = "absolute";
                    resizeHandle.style.bottom = "0";
                    resizeHandle.style.left = "0";
                    resizeHandle.style.width = "100%";
                    resizeHandle.style.height = "8px"; // Touchable area
                    resizeHandle.style.cursor = "ns-resize";
                    resizeHandle.style.zIndex = "11";
                    
                    resizeHandle.addEventListener("mousedown", (e) => {
                        e.stopPropagation(); // Prevent dragstart
                        e.preventDefault(); // Prevent text selection
                        
                        const startY = e.clientY;
                        const startHeight = taskEl.offsetHeight;
                        
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaY = moveEvent.clientY - startY;
                            const newHeight = Math.max(20, startHeight + deltaY);
                            taskEl.style.height = `${newHeight}px`;
                        };
                        
                        const handleMouseUp = async (upEvent: MouseEvent) => {
                            document.removeEventListener("mousemove", handleMouseMove);
                            document.removeEventListener("mouseup", handleMouseUp);
                            
                            // Calculate new End Time based on bottom position
                            const rect = taskEl.getBoundingClientRect();
                            const column = taskEl.parentElement as HTMLElement;
                            if (!column) return;
                            
                            const colRect = column.getBoundingClientRect();
                            const relativeBottomY = (rect.top - colRect.top) + rect.height; 
                            
                            const { hour, minute } = this.getTimeFromY(relativeBottomY);
                            const dateStr = column.dataset.date;
                            let newEnd = dayjs(dateStr).hour(hour).minute(minute).second(0);
                            
                            // Snap to 15m
                            const remainder = newEnd.minute() % 15;
                            if (remainder >= 8) {
                                newEnd = newEnd.add(15 - remainder, 'minute');
                            } else {
                                newEnd = newEnd.subtract(remainder, 'minute');
                            }
                            
                            // Ensure End > Start
                            if (newEnd.isSame(dayjs(task.startTime)) || newEnd.isBefore(dayjs(task.startTime))) {
                                newEnd = dayjs(task.startTime).add(15, 'minute');
                            }
                            
                            task.endTime = newEnd.valueOf();
                            await this.store.updateTask(task);
                            this.render();
                        };
                        
                        document.addEventListener("mousemove", handleMouseMove);
                        document.addEventListener("mouseup", handleMouseUp);
                    });
                    
                    taskEl.appendChild(resizeHandle);

                    // Click & Context Menu
                    taskEl.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.highlightTask(task.id);
                        if (this.onTaskClick) this.onTaskClick(task.id);
                    });
                    
                    taskEl.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.highlightTask(task.id);
                        if (this.onTaskClick) this.onTaskClick(task.id);
                        
                        // Reuse context menu logic... (can extract to helper)
                        const menu = new Menu("week-task-context-menu");
                        menu.addItem({
                            icon: "iconEdit",
                            label: "编辑",
                            click: () => { if (this.onEditTask) this.onEditTask(task); }
                        });
                        menu.addItem({
                            icon: "iconTrashcan",
                            label: "删除",
                            click: async () => {
                                await this.store.removeTask(task.id);
                                this.render();
                            }
                        });
                        menu.open({ x: e.clientX, y: e.clientY, isLeft: true });
                    });

                    // Append to the correct day column
                    const columns = container.querySelectorAll(".day-column");
                    if (columns[i]) {
                        columns[i].appendChild(taskEl);
                    }
                }
            }
        });
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
            
            // Only dim other month dates in Month View
            if (this.viewMode === 'month' && !date.isSame(this.currentDate, "month")) {
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

            let dayNumStyle = "font-size: 14px; font-weight: 500;";
            if (date.isSame(dayjs(), "day")) {
                dayNumStyle += "background-color: var(--b3-theme-primary); color: var(--b3-theme-on-primary); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;";
            }

            cell.innerHTML = `
                <div class="day-header" style="display: flex; justify-content: space-between; padding: 4px 8px;">
                    <div style="display: flex; align-items: center; gap: 2px;">
                        <span class="day-num" style="${dayNumStyle}">${date.date()}</span>
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
                    taskEl.style.height = "18px";
                    taskEl.style.boxSizing = "border-box";

                    // Logic to visually end in the correct cell:
                    const marginLeft = isContLeft ? 0 : 5;
                    const marginRight = isContRight ? 0 : 5; 
                    const totalMargin = marginLeft + marginRight;
                    
                    taskEl.style.left = `calc(${leftPercent}% + ${marginLeft}px)`;
                    taskEl.style.width = `calc(${widthPercent}% - ${totalMargin}px)`;

                    // Click to highlight
                    taskEl.addEventListener("click", (e) => {
                        this.highlightTask(task.id);
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
        const dynamicHeight = maxRow * 24 + 40; // buffer
        weekEl.style.minHeight = `${Math.max(minHeight, dynamicHeight)}px`;

        weekEl.appendChild(taskLayer);
        return weekEl;
    }

    private bindEvents() {
        this.container.querySelector("#prevBtn")?.addEventListener("click", () => {
            if (this.viewMode === 'month') {
                this.currentDate = this.currentDate.subtract(1, "month");
            } else {
                this.currentDate = this.currentDate.subtract(1, "week");
            }
            this.render();
        });

        this.container.querySelector("#nextBtn")?.addEventListener("click", () => {
            if (this.viewMode === 'month') {
                this.currentDate = this.currentDate.add(1, "month");
            } else {
                this.currentDate = this.currentDate.add(1, "week");
            }
            this.render();
        });

        this.container.querySelector("#todayBtn")?.addEventListener("click", () => {
            this.currentDate = dayjs();
            this.render();
        });

        // View Switcher
        const switcherBtn = this.container.querySelector("#viewSwitcherBtn");
        const switcherPopup = this.container.querySelector(".view-switcher-popup");

        switcherBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.isViewSwitcherOpen = !this.isViewSwitcherOpen;
            this.render();
        });
        
        switcherPopup?.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        this.container.querySelectorAll(".view-option").forEach(option => {
            option.addEventListener("click", (e) => {
                e.stopPropagation();
                const mode = (e.currentTarget as HTMLElement).dataset.view as 'month' | 'week';
                if (mode && mode !== this.viewMode) {
                    this.viewMode = mode;
                    this.isViewSwitcherOpen = false;
                    this.render();
                } else {
                     this.isViewSwitcherOpen = false;
                     this.render();
                }
            });
        });

        // Date Picker Events
        const dateWrapper = this.container.querySelector(".current-date-wrapper");
        const pickerPopup = this.container.querySelector(".date-picker-popup") as HTMLElement;
        
        dateWrapper?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.isDatePickerOpen = !this.isDatePickerOpen;
            this.pickerYear = this.currentDate.year(); // Reset picker year to current view year on open
            this.render();
        });

        pickerPopup?.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        if (this.isDatePickerOpen || this.isViewSwitcherOpen) {
            document.addEventListener("click", () => {
                let changed = false;
                if (this.isDatePickerOpen) {
                    this.isDatePickerOpen = false;
                    changed = true;
                }
                if (this.isViewSwitcherOpen) {
                    this.isViewSwitcherOpen = false;
                    changed = true;
                }
                if (changed) this.render();
            }, { once: true });
        }
        
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
                this.currentDate = this.currentDate.year(this.pickerYear).month(month);
                this.isDatePickerOpen = false;
                this.render();
            });
        });

        // Clear highlight on background click
        this.container.querySelector(".task-planner-calendar")?.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            if (target.closest(".task-bar") || 
                target.closest(".view-switcher-popup") || 
                target.closest(".date-picker-popup") || 
                target.closest("#viewSwitcherBtn") || 
                target.closest(".current-date-wrapper") ||
                target.closest(".picker-nav") ||
                target.closest(".nav-btn")) {
                return;
            }
            this.clearHighlight();
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
                const isSelected = this.pickerYear === this.currentDate.year() && i === this.currentDate.month();
                return `<div class="month-item ${isSelected ? 'selected' : ''}" data-month="${i}">${i + 1}月</div>`;
            }).join('');
            
            // Re-bind month click events
            monthsContainer.querySelectorAll(".month-item").forEach(item => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const month = parseInt((e.target as HTMLElement).dataset.month || "0");
                    this.currentDate = this.currentDate.year(this.pickerYear).month(month);
                    this.isDatePickerOpen = false;
                    this.render();
                });
            });
        }
    }

    private initDragSelection() {
        if (this.viewMode === 'month') {
            this.initMonthDragSelection();
        } else {
            this.initWeekDragSelection();
        }
    }

    private initMonthDragSelection() {
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

    private initWeekDragSelection() {
        const gridContainer = this.container.querySelector(".week-grid-container") as HTMLElement;
        if (!gridContainer) return;

        let isDragging = false;
        let startY = 0;
        let startTop = 0;
        let currentColumn: HTMLElement | null = null;
        let selectionEl: HTMLElement | null = null;

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging || !currentColumn || !selectionEl) return;
            
            const rect = currentColumn.getBoundingClientRect();
            let currentY = e.clientY - rect.top;
            currentY = Math.max(0, Math.min(currentY, 1200));

            // Snap to 15 minutes (12.5px)
            const snapStep = 12.5;
            currentY = Math.round(currentY / snapStep) * snapStep;
            
            const originY = startTop;
            const height = Math.abs(currentY - originY);
            const top = Math.min(originY, currentY);
            
            selectionEl.style.top = `${top}px`;
            selectionEl.style.height = `${height}px`;

            // Display time range text
            const startTime = this.getTimeFromY(top);
            const endTime = this.getTimeFromY(top + height);
            const startStr = `${startTime.hour.toString().padStart(2, '0')}:${startTime.minute.toString().padStart(2, '0')}`;
            const endStr = `${endTime.hour.toString().padStart(2, '0')}:${endTime.minute.toString().padStart(2, '0')}`;
            
            selectionEl.textContent = `${startStr} - ${endStr}`;
            selectionEl.style.color = "var(--b3-theme-on-surface)"; // Use theme color or white
            selectionEl.style.fontSize = "12px";
            selectionEl.style.padding = "2px 4px";
            selectionEl.style.boxSizing = "border-box";
            selectionEl.style.overflow = "hidden";
            selectionEl.style.whiteSpace = "nowrap";
        };

        const onMouseUp = (e: MouseEvent) => {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            if (currentColumn && selectionEl) {
                const top = parseFloat(selectionEl.style.top || "0");
                const height = parseFloat(selectionEl.style.height || "0");
                
                if (height > 10) {
                    const dateStr = currentColumn.dataset.date;
                    if (dateStr) {
                        const date = dayjs(dateStr);
                        
                        // Use helper to reverse Y to Time
                        const startTime = this.getTimeFromY(top);
                        const endTime = this.getTimeFromY(top + height);
                        
                        const sDate = date.startOf('day').add(startTime.hour, 'hour').add(startTime.minute, 'minute');
                        const eDate = date.startOf('day').add(endTime.hour, 'hour').add(endTime.minute, 'minute');
                        
                        if (this.onRangeSelect) {
                            this.onRangeSelect(sDate, eDate);
                        }
                    }
                }
                selectionEl.remove();
            }
            
            currentColumn = null;
            selectionEl = null;
        };

        gridContainer.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            const target = e.target as HTMLElement;
            const column = target.closest(".day-column") as HTMLElement;
            
            if (!column) return;
            if (target.closest(".week-task-block")) return;

            // Check highlight
            if (this.container.querySelector(".task-bar-highlight")) {
                return;
            }

            e.preventDefault();
            
            isDragging = true;
            currentColumn = column;
            
            const rect = column.getBoundingClientRect();
            let startYVal = e.clientY - rect.top;
            
            // Constrain Y within total height
            const totalHeight = this.isMorningCollapsed 
                ? this.COLLAPSED_HEIGHT + (24 - this.MORNING_END_HOUR) * this.HOUR_HEIGHT 
                : 24 * this.HOUR_HEIGHT;
            startYVal = Math.max(0, Math.min(startYVal, totalHeight));
            
            // Snap logic (optional, keep simple for now or adjust for collapsed view)
            // In collapsed view, snapping in the collapsed region might be tricky.
            // Let's just snap to 12.5px if not in collapsed region, or if linear.
            // If in collapsed region, maybe just snap to start/end of it?
            
            const snapStep = 12.5;
            startTop = Math.round(startYVal / snapStep) * snapStep;
            startY = startTop;

            selectionEl = document.createElement("div");
            selectionEl.className = "drag-selection-box";
            selectionEl.style.position = "absolute";
            selectionEl.style.left = "0";
            selectionEl.style.right = "0";
            selectionEl.style.backgroundColor = "rgba(97, 127, 222, 0.3)";
            selectionEl.style.border = "1px solid #617fde";
            selectionEl.style.zIndex = "5";
            selectionEl.style.pointerEvents = "none";
            selectionEl.style.top = `${startTop}px`;
            selectionEl.style.height = "0px";
            
            column.appendChild(selectionEl);
            
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
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

        // Add highlight to matching tasks (Month Bar, Week Block, and All Day Bar)
        const taskEls = this.container.querySelectorAll(`.task-bar[data-task-id="${taskId}"], .week-task-block[data-task-id="${taskId}"], .all-day-task-bar[data-task-id="${taskId}"]`);
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
