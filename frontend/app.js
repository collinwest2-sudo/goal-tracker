
const API_URL = "/api/goals";

const goalForm = document.getElementById("goalForm");
const goalsContainer = document.getElementById("goals");
const totalGoals = document.getElementById("totalGoals");
const completedGoals = document.getElementById("completedGoals");

// Celebrate completed goals.
function celebrateGoal() {
    const colors = [
        "#ff4757", "#ffa502", "#2ed573",
        "#1e90ff", "#a55eea", "#ff6b81"
    ];

    const layer = document.createElement("div");
    layer.style.cssText = `
        position: fixed;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(layer);

    const message = document.createElement("div");
    message.textContent = "🎉 Goal Completed! Amazing Work! 🎉";
    message.setAttribute("role", "status");
    message.style.cssText = `
        position: absolute;
        top: 25%;
        left: 50%;
        transform: translateX(-50%);
        background: #1f2937;
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        width: max-content;
        max-width: 85vw;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    `;
    layer.appendChild(message);

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!reducedMotion) {
        for (let i = 0; i < 120; i++) {
            const piece = document.createElement("div");

            piece.style.cssText = `
                position: absolute;
                top: -20px;
                left: ${Math.random() * 100}%;
                width: ${5 + Math.random() * 7}px;
                height: ${8 + Math.random() * 10}px;
                background: ${
                    colors[Math.floor(Math.random() * colors.length)]
                };
                opacity: 0;
            `;

            layer.appendChild(piece);

            piece.animate(
                [
                    {
                        transform: "translateY(-20px) rotate(0deg)",
                        opacity: 1
                    },
                    {
                        transform: `translateY(${
                            window.innerHeight + 50
                        }px) rotate(${
                            Math.random() * 1080
                        }deg)`,
                        opacity: 0
                    }
                ],
                {
                    duration: 2000 + Math.random() * 2000,
                    delay: Math.random() * 500,
                    easing: "ease-in",
                    fill: "forwards"
                }
            );
        }
    }

    setTimeout(
        () => layer.remove(),
        reducedMotion ? 2500 : 4500
    );
}

// Calendar helpers.
function nextDate(dateString) {
    const date = new Date(`${dateString}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
}

function compactDate(dateString) {
    return dateString.replace(/-/g, "");
}

function calendarDescription(goal) {
    return `Goal category: ${goal.category}\nProgress: ${goal.progress}%`;
}

function addToGoogleCalendar(goal) {
    const start = compactDate(goal.due_date);
    const end = compactDate(nextDate(goal.due_date));

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: goal.title,
        dates: `${start}/${end}`,
        details: calendarDescription(goal)
    });

    window.open(
        `https://calendar.google.com/calendar/render?${params}`,
        "_blank",
        "noopener,noreferrer"
    );
}

function addToOutlookCalendar(goal) {
    const params = new URLSearchParams({
        path: "/calendar/action/compose",
        rru: "addevent",
        subject: goal.title,
        startdt: goal.due_date,
        enddt: nextDate(goal.due_date),
        allday: "true",
        body: calendarDescription(goal)
    });

    window.open(
        `https://outlook.office.com/calendar/0/deeplink/compose?${params}`,
        "_blank",
        "noopener,noreferrer"
    );
}

function escapeICS(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\r\n|\n|\r/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
}

function downloadCalendarFile(goal) {
    const start = compactDate(goal.due_date);
    const end = compactDate(nextDate(goal.due_date));

    const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Goal Tracker//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:goal-${goal.id}@goal-tracker.local`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${escapeICS(goal.title)}`,
        `DESCRIPTION:${escapeICS(calendarDescription(goal))}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ];

    const blob = new Blob(
        [lines.join("\r\n") + "\r\n"],
        { type: "text/calendar;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `goal-${goal.id}.ics`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showCalendarOptions(goal) {
    const choice = prompt(
        "Add to Calendar:\n" +
        "1 - Google Calendar\n" +
        "2 - Outlook Calendar\n" +
        "3 - Apple Calendar / Download .ics\n\n" +
        "Enter 1, 2, or 3:"
    );

    if (choice === null) return;

    switch (choice.trim()) {
        case "1":
            addToGoogleCalendar(goal);
            break;
        case "2":
            addToOutlookCalendar(goal);
            break;
        case "3":
            downloadCalendarFile(goal);
            break;
        default:
            alert("Please enter 1, 2, or 3.");
    }
}

// Create a button.
function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.textContent = label;

    if (className) {
        button.className = className;
    }

    button.addEventListener("click", onClick);
    return button;
}

// Load all goals.
async function loadGoals() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to load goals");
        }

        const goals = await response.json();

        goalsContainer.replaceChildren();
        totalGoals.textContent = goals.length;
        completedGoals.textContent = goals.filter(
            goal => goal.progress === 100
        ).length;

        if (goals.length === 0) {
            goalsContainer.textContent =
                "No goals yet. Add your first goal!";
            return;
        }

        goals.forEach(goal => {
            const card = document.createElement("div");
            card.className = "goal-card";

            const header = document.createElement("div");
            header.className = "goal-header";

            const title = document.createElement("h3");
            title.textContent = goal.title;

            const category = document.createElement("span");
            category.className = "category";
            category.textContent = goal.category;

            header.append(title, category);

            const progressBar = document.createElement("div");
            progressBar.className = "progress-bar";

            const progressFill = document.createElement("div");
            progressFill.className = "progress";
            progressFill.style.width = `${goal.progress}%`;

            progressBar.appendChild(progressFill);

            const progressText = document.createElement("p");
            progressText.textContent = `${goal.progress}% complete`;

            if (goal.progress === 100) {
                progressText.className = "completed";
            }

            const dueDateText = document.createElement("p");
            dueDateText.textContent = goal.due_date
                ? `Due Date: ${goal.due_date}`
                : "No due date set";

            const actions = document.createElement("div");
            actions.className = "goal-actions";
            actions.style.flexWrap = "wrap";

            actions.appendChild(
                createButton("Update", "update", () => {
                    updateGoal(goal.id, goal.progress);
                })
            );

            actions.appendChild(
                createButton("Change Due Date", "", () => {
                    changeDueDate(goal.id, goal.due_date);
                })
            );

            if (goal.due_date) {
                actions.appendChild(
                    createButton("Add to Calendar", "", () => {
                        showCalendarOptions(goal);
                    })
                );
            }

            // Journal button opens entries for this goal.
            const journalSection = document.createElement("div");
            journalSection.className = "journal-section";
            journalSection.hidden = true;

            const journalButton = createButton(
                "Journal",
                "journal-button",
                async () => {
                    journalSection.hidden = !journalSection.hidden;

                    if (!journalSection.hidden) {
                        await loadJournal(goal.id, journalSection);
                    }
                }
            );

            actions.appendChild(journalButton);

            actions.appendChild(
                createButton("Delete", "delete", () => {
                    deleteGoal(goal.id);
                })
            );

            card.append(
                header,
                progressBar,
                progressText,
                dueDateText,
                actions,
                journalSection
            );

            goalsContainer.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        goalsContainer.textContent = "Unable to load goals.";
    }
}

// Display journal entries and the entry form.
async function loadJournal(goalId, container) {
    container.replaceChildren();

    const heading = document.createElement("h4");
    heading.textContent = "Goal Journal";

    const form = document.createElement("form");
    form.className = "journal-form";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Write about your progress...";
    textarea.rows = 4;
    textarea.maxLength = 5000;
    textarea.required = true;

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "Save Journal Entry";

    form.append(textarea, saveButton);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const content = textarea.value.trim();

        if (!content) {
            alert("Journal entry cannot be empty.");
            return;
        }

        saveButton.disabled = true;

        try {
            const response = await fetch(
                `${API_URL}/${goalId}/journal`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ content })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to save journal entry");
            }

            await loadJournal(goalId, container);

        } catch (error) {
            console.error(error);
            alert("Could not save journal entry.");
            saveButton.disabled = false;
        }
    });

    const entriesContainer = document.createElement("div");
    entriesContainer.className = "journal-entries";

    container.append(heading, form, entriesContainer);

    try {
        const response = await fetch(
            `${API_URL}/${goalId}/journal`
        );

        if (!response.ok) {
            throw new Error("Failed to load journal entries");
        }

        const entries = await response.json();

        if (entries.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No journal entries yet.";
            entriesContainer.appendChild(empty);
            return;
        }

        entries.forEach(entry => {
            const entryCard = document.createElement("div");
            entryCard.className = "journal-entry";

            const timestamp = document.createElement("p");
            timestamp.className = "journal-date";

            // SQLite CURRENT_TIMESTAMP stores UTC.
            const date = new Date(
                entry.created_at.replace(" ", "T") + "Z"
            );
            timestamp.textContent = Number.isNaN(date.getTime())
                ? entry.created_at
                : date.toLocaleString();

            const content = document.createElement("p");
            content.textContent = entry.content;
            content.style.whiteSpace = "pre-wrap";

            const deleteButton = createButton(
                "Delete Entry",
                "delete",
                async () => {
                    if (!confirm("Delete this journal entry?")) {
                        return;
                    }

                    try {
                        const response = await fetch(
                            `${API_URL}/${goalId}/journal/${entry.id}`,
                            { method: "DELETE" }
                        );

                        if (!response.ok) {
                            throw new Error("Failed to delete entry");
                        }

                        await loadJournal(goalId, container);

                    } catch (error) {
                        console.error(error);
                        alert("Could not delete journal entry.");
                    }
                }
            );

            entryCard.append(timestamp, content, deleteButton);
            entriesContainer.appendChild(entryCard);
        });

    } catch (error) {
        console.error(error);
        entriesContainer.textContent =
            "Unable to load journal entries.";
    }
}

// Create a new goal.
goalForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const dueDate = document.getElementById("dueDate").value;
    const progress = Number(
        document.getElementById("progress").value
    );

    if (
        !title ||
        !category ||
        !Number.isInteger(progress) ||
        progress < 0 ||
        progress > 100
    ) {
        alert("Enter a title, category, and progress between 0 and 100.");
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                category,
                progress,
                due_date: dueDate || null
            })
        });

        if (!response.ok) {
            throw new Error("Failed to add goal");
        }

        goalForm.reset();
        await loadGoals();

        if (progress === 100) {
            celebrateGoal();
        }

    } catch (error) {
        alert("Could not add goal. Please try again.");
        console.error(error);
    }
});

// Update goal progress.
async function updateGoal(id, currentProgress) {
    const input = prompt(
        "Enter new progress (0-100):",
        currentProgress
    );

    if (input === null) return;

    const value = input.trim();
    const progress = Number(value);

    if (
        value === "" ||
        !Number.isInteger(progress) ||
        progress < 0 ||
        progress > 100
    ) {
        alert("Please enter a whole number between 0 and 100.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ progress })
        });

        if (!response.ok) {
            throw new Error("Failed to update goal");
        }

        await loadGoals();

        if (currentProgress < 100 && progress === 100) {
            celebrateGoal();
        }

    } catch (error) {
        alert("Could not update goal.");
        console.error(error);
    }
}

// Change or remove a due date.
async function changeDueDate(id, currentDueDate) {
    const input = prompt(
        "Enter due date (YYYY-MM-DD).\n" +
        "Leave blank to remove the due date:",
        currentDueDate || ""
    );

    if (input === null) return;

    const value = input.trim();

    if (value !== "") {
        const date = new Date(`${value}T12:00:00Z`);

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== value
        ) {
            alert("Enter a valid date in YYYY-MM-DD format.");
            return;
        }
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                due_date: value || null
            })
        });

        if (!response.ok) {
            throw new Error("Failed to update due date");
        }

        await loadGoals();

    } catch (error) {
        alert("Could not update due date.");
        console.error(error);
    }
}

// Delete a goal.
async function deleteGoal(id) {
    if (!confirm("Are you sure you want to delete this goal?")) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Failed to delete goal");
        }

        await loadGoals();

    } catch (error) {
        alert("Could not delete goal.");
        console.error(error);
    }
}

// Load goals when the page opens.
loadGoals();

