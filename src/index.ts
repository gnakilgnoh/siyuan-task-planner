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
                    const calendarView = new CalendarView(calendarContainer as HTMLElement, self.store);
                    calendarView.render();
    
                    const taskList = new TaskList(listContainer as HTMLElement, self.store, () => {
                        // 任务更新后的回调：刷新日历
                        calendarView.render();
                    });
                    taskList.render();
                } else {
                    console.error("Failed to find containers for task planner");
                }
            },
            beforeDestroy() {
            },
            destroy() {
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
