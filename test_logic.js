
const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
dayjs.extend(isBetween);

function testLogic(startTimeStr, endTimeStr, startOfWeekStr) {
    const task = {
        startTime: dayjs(startTimeStr).valueOf(),
        endTime: dayjs(endTimeStr).valueOf(),
        content: "Test Task"
    };
    
    const startOfWeek = dayjs(startOfWeekStr);
    const weekEnd = startOfWeek.add(6, "day").endOf("day");
    
    console.log(`\nTask: ${startTimeStr} to ${endTimeStr}`);
    console.log(`Week: ${startOfWeek.format()} to ${weekEnd.format()}`);

    const taskStart = dayjs(task.startTime).startOf('day');
    
    let realTaskEnd = dayjs(task.endTime);
    console.log(`Original End: ${realTaskEnd.format()}`);
    
    if (realTaskEnd.hour() === 0 && realTaskEnd.minute() === 0) {
        if (realTaskEnd.isAfter(dayjs(task.startTime))) {
            realTaskEnd = realTaskEnd.subtract(1, 'minute');
            console.log(`Adjusted End (00:00 rule): ${realTaskEnd.format()}`);
        }
    }
    const taskEnd = realTaskEnd.endOf('day');
    console.log(`Final Task End: ${taskEnd.format()}`);

    const viewStart = taskStart.isBefore(startOfWeek) ? startOfWeek : taskStart;
    const viewEnd = taskEnd.isAfter(weekEnd) ? weekEnd : taskEnd;
    
    console.log(`View Start: ${viewStart.format()}`);
    console.log(`View End: ${viewEnd.format()}`);

    const startCol = viewStart.diff(startOfWeek, 'day');
    const span = viewEnd.diff(viewStart, 'day') + 1;
    
    console.log(`Start Col: ${startCol}`);
    console.log(`Span: ${span}`);
}

// Case 1: Wed 00:00 to Fri 00:00 (Should cover Wed, Thu -> 2 days)
testLogic('2026-02-04T00:00:00', '2026-02-06T00:00:00', '2026-02-01T00:00:00');

// Case 2: Wed 00:00 to Fri 18:00 (Should cover Wed, Thu, Fri -> 3 days)
testLogic('2026-02-04T00:00:00', '2026-02-06T18:00:00', '2026-02-01T00:00:00');

// Case 3: Wed 00:00 to Sat 00:00 (Should cover Wed, Thu, Fri -> 3 days)
testLogic('2026-02-04T00:00:00', '2026-02-07T00:00:00', '2026-02-01T00:00:00');
