import {
    Plugin,
    openTab,
    showMessage
} from "siyuan";
import "./index.scss";
import { TaskStore } from "./services/TaskStore";
import { TaskForm } from "./ui/TaskForm";
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
                            <div class="task-planner-sidebar" id="taskFormContainer"></div>
                            <div class="task-planner-main" id="calendarContainer"></div>
                        </div>
                    </div>`;
                
                const formContainer = container.querySelector("#taskFormContainer");
                const calendarContainer = container.querySelector("#calendarContainer");
                
                console.log("Containers found:", { formContainer, calendarContainer });
                
                if (formContainer && calendarContainer) {
                    const calendarView = new CalendarView(calendarContainer as HTMLElement, self.store);
                    calendarView.render();
    
                    const taskForm = new TaskForm(formContainer as HTMLElement, self.store, () => {
                        // 任务添加后的回调：刷新日历
                        calendarView.render();
                        showMessage("任务添加成功！");
                    });
                    taskForm.render();
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
