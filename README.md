# Task Planner Plugin for SiYuan Note

A task planning plugin designed for SiYuan Note, featuring a monthly calendar view and task list management. It supports creating, deleting, and prioritizing tasks, with integrated Lunar calendar display.

![Preview](./preview.jpg)

## Features

*   **Monthly Calendar View**: Visually displays monthly task schedules with Lunar dates and festival support.
*   **Week-Row Layout**: Tasks are displayed as bars, spanning across days automatically, offering a clear visual style (similar to TickTick).
*   **Task List**: The sidebar displays a real-time list of tasks, supporting time-based sorting and quick deletion.
*   **Quick Add**: Easily add tasks via the sidebar button, setting start/end times and priority.
*   **Priority Management**: Supports High, Medium, and Low priorities, distinguished by colors (Red, Blue, Green).
*   **Lunar Calendar Support**: Calendar cells integrate Lunar dates, solar terms, and holidays.

## Installation

1.  Open SiYuan Note.
2.  Go to **Settings** -> **Bazaar** -> **Plugins**.
3.  Search for `Task Planner`.
4.  Click **Install**.
5.  Once installed, a plugin icon will appear in the top bar. Click to open.

## Usage

### 1. Open Plugin
Click the "Task Planner" icon (layout icon) in the top bar to open the task planner tab.

### 2. Add Task
*   Click the **+** button at the top of the sidebar.
*   In the dialog, enter:
    *   **Content**: Required.
    *   **Start Time**: Required.
    *   **End Time**: Required.
    *   **Priority**: Defaults to "Medium".
*   Click **Confirm** to save.

### 3. View Tasks
*   **Calendar View**: Tasks appear as colored bars in the corresponding date cells. Tasks spanning multiple days show as continuous bars.
*   **List View**: The sidebar lists all tasks, sorted by start time in descending order.

### 4. Delete Task
*   Hover over a task in the sidebar list.
*   Click the **Delete Icon** (trash can) that appears on the right to remove the task.

## Development

If you want to contribute or build it yourself:

1.  Clone the repository:
    ```bash
    git clone https://github.com/gnakilgnoh/siyuan-task-planner.git
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Start development mode:
    ```bash
    pnpm run dev
    ```
4.  Build for production:
    ```bash
    pnpm run build
    ```

## License

MIT
