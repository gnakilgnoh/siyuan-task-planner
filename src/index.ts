import {
    Plugin,
    openTab,
    showMessage,
    getAllModels
} from "siyuan";
import "./index.scss";
import { TaskStore } from "./services/TaskStore";
import { TaskList } from "./ui/TaskList";
import { CalendarView } from "./ui/CalendarView";

const TAB_TYPE = "task_planner_tab";

export default class TaskPlannerPlugin extends Plugin {

    private tab: any;
    private store: TaskStore;
    private destroyCallback?: () => void;

    async onload() {
        // 初始化数据存储
        this.store = new TaskStore(this);
        await this.store.init();

        // 注册 Tab
        const self = this;
        this.tab = this.addTab({
            type: TAB_TYPE,
            init: function() {
                // @ts-ignore
                const container = this.element;

                if (!container) {
                    console.error("Container is missing! 'this' might not be the Tab instance.");
                    return;
                }

                container.innerHTML = `
                    <div class="task-planner-tab">
                        <div class="task-planner-layout">
                            <div class="task-planner-sidebar" id="taskListContainer"></div>
                            <div class="task-planner-main" id="calendarContainer"></div>
                        </div>
                    </div>`;
                
                const listContainer = container.querySelector("#taskListContainer");
                const calendarContainer = container.querySelector("#calendarContainer");
                
                if (listContainer && calendarContainer) {
                    let currentSelectedTaskId: string | null = null;

                    const calendarView = new CalendarView(calendarContainer as HTMLElement, self.store);
                    calendarView.render();
    
                    const taskList = new TaskList(listContainer as HTMLElement, self.store, () => {
                        // 任务更新后的回调：刷新日历
                        calendarView.render();
                    }, (taskId) => {
                        // 任务点击回调：高亮日历中的任务
                        if (taskId) {
                            currentSelectedTaskId = taskId;
                            calendarView.highlightTask(taskId);
                            taskList.highlightItem(taskId);
                        } else {
                            currentSelectedTaskId = null;
                            calendarView.clearHighlight();
                            taskList.clearHighlight();
                        }
                    });
                    
                    // 设置日历视图的编辑处理程序，调用任务列表的弹窗
                    calendarView.setOnEditHandler((task) => {
                        taskList.showEditTaskDialog(task);
                    });

                    calendarView.setOnTaskClickHandler((taskId) => {
                        currentSelectedTaskId = taskId;
                        taskList.highlightItem(taskId);
                        calendarView.highlightTask(taskId);
                    });

                    calendarView.setOnTaskUpdateHandler(() => {
                        taskList.render();
                    });

                    calendarView.setOnRangeSelectHandler((start, end) => {
                        taskList.showTaskDialog(undefined, { start, end });
                    });

                    // Global click listener for clearing highlights (on document to catch outside clicks)
                    const clearHighlightListener = (e: MouseEvent) => {
                        // Check if container is still in DOM (safety check)
                        if (!document.body.contains(container)) return;

                        const target = e.target as HTMLElement;
                        const isTaskItem = target.closest(".task-list-item");
                        const isTaskBar = target.closest(".task-bar") || target.closest(".week-task-block") || target.closest(".all-day-task-bar");
                        const isMenu = target.closest(".b3-menu");
                        const isDialog = target.closest(".b3-dialog");
                        const isDatePicker = target.closest(".date-picker-popup") || target.closest(".current-date-wrapper");
                        
                        // If clicked outside of task items, task bars, menus, dialogs, and date picker -> clear highlight
                        if (!isTaskItem && !isTaskBar && !isMenu && !isDialog && !isDatePicker) {
                            currentSelectedTaskId = null;
                            calendarView.clearHighlight();
                            taskList.clearHighlight();
                        }
                    };

                    const keyDownListener = async (e: KeyboardEvent) => {
                        if (!document.body.contains(container)) return;
                        
                        if (e.key === "Delete" || e.key === "Backspace") {
                            const target = e.target as HTMLElement;
                            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                                return;
                            }

                            if (currentSelectedTaskId) {
                                await self.store.removeTask(currentSelectedTaskId);
                                currentSelectedTaskId = null;
                                calendarView.render();
                                calendarView.clearHighlight();
                                taskList.render();
                                taskList.clearHighlight();
                            }
                        }
                    };

                    document.addEventListener("click", clearHighlightListener);
                    document.addEventListener("keydown", keyDownListener);
                    // @ts-ignore
                    this.clearHighlightListener = clearHighlightListener;
                    // @ts-ignore
                    this.keyDownListener = keyDownListener;

                    taskList.render();
                } else {
                    console.error("Failed to find containers for task planner");
                }
            },
            beforeDestroy() {
            },
            destroy() {
                // @ts-ignore
                if (this.clearHighlightListener) {
                    // @ts-ignore
                    document.removeEventListener("click", this.clearHighlightListener);
                }
                // @ts-ignore
                if (this.keyDownListener) {
                    // @ts-ignore
                    document.removeEventListener("keydown", this.keyDownListener);
                }
            }
        });

        // 添加顶部栏图标作为入口
        this.addTopBar({
            icon: "iconLayout",
            title: this.i18n.openPlanner,
            position: "right",
            callback: () => {
                this.openPlannerTab();
            }
        });
    }

    onunload() {
        const tabs = this.getOpenedTabs();
        tabs.forEach(tab => {
            if (tab && typeof tab.close === "function") {
                tab.close();
            }
        });
    }

    private getOpenedTabs() {
        const tabs: any[] = [];
        const allModels = getAllModels();
        
        // @ts-ignore
        if (allModels && allModels.custom) {
            // @ts-ignore
            allModels.custom.forEach((item: any) => {
                // 兼容两种 type 检查：原始 type 和带插件名的 type
                if (item && (item.type === TAB_TYPE || item.type === this.name + TAB_TYPE)) {
                    if (item.parent && !tabs.includes(item.parent)) {
                        tabs.push(item.parent);
                    }
                }
            });
        }
        return tabs;
    }

    private openPlannerTab() {
        openTab({
            app: this.app,
            custom: {
                icon: "iconLayout",
                title: this.i18n.openPlanner,
                data: {
                    text: "Task Planner"
                },
                id: this.name + TAB_TYPE
            },
        });
    }
}
