import {
    Plugin,
    openTab,
    showMessage
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
        console.log("loading task planner plugin");

        // 初始化数据存储
        this.store = new TaskStore(this);
        await this.store.init();

        // 注册 Tab
        const self = this;
        this.tab = this.addTab({
            type: TAB_TYPE,
            init: function() {
                console.log("Task Planner Tab init called");
                console.log("this context:", this);
                
                // @ts-ignore
                const container = this.element;
                console.log("Container from this.element:", container);

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
                
                console.log("Containers found:", { listContainer, calendarContainer });
                
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
                console.log("before destroy task planner tab");
            },
            destroy() {
                console.log("destroy task planner tab");
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
        console.log("unloading task planner plugin");
        // 查找所有插件创建的页签并关闭
        // 优先使用 data-type="tab-header" 和 aria-label 来定位
        // 根据截图，页签的 aria-label 是 "打开任务规划"
        // 同时这个 li 元素有 data-type="tab-header"
        
        const tabTitle = this.i18n.openPlanner;
        console.log("Looking for tabs with title:", tabTitle);
        
        let tabHeaders = document.querySelectorAll(`li[data-type="tab-header"][aria-label="${tabTitle}"]`);
        
        if (tabHeaders.length === 0) {
            // 尝试更模糊的匹配，通过 innerText
             const allTabs = document.querySelectorAll('li[data-type="tab-header"]');
             // @ts-ignore
             tabHeaders = Array.from(allTabs).filter(tab => {
                 const text = (tab as HTMLElement).innerText;
                 return text.includes("Task Planner") || text.includes("任务规划") || text.includes(tabTitle);
             }) as any;
        }

        console.log(`Found ${tabHeaders.length} tabs to close`);

        tabHeaders.forEach(tab => {
            const closeBtn = tab.querySelector(".item__close") || tab.querySelector(".layout-tab-bar-item__close");
            if (closeBtn) {
                console.log("Closing tab:", tab);
                // 模拟点击关闭按钮
                (closeBtn as HTMLElement).click();
            } else {
                console.warn("Close button not found for tab:", tab);
            }
        });
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
