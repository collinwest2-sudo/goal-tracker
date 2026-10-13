
const API_URL = "/api/goals";

const goalForm = document.getElementById("goalForm");
const goalsContainer = document.getElementById("goals");
const totalGoals = document.getElementById("totalGoals");
const completedGoals = document.getElementById("completedGoals");

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
            goalsContainer.textContent = "No goals yet. Add your first goal!";
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

            const actions = document.createElement("div");
            actions.className = "goal-actions";

            const updateButton = document.createElement("button");
            updateButton.className = "update";
            updateButton.textContent = "Update";

            updateButton.addEventListener("click", () => {
                updateGoal(goal.id, goal.progress);
            });

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", () => {
                deleteGoal(goal.id);
            });

            actions.append(updateButton, deleteButton);
            card.append(header, progressBar, progressText, actions);
            goalsContainer.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        goalsContainer.textContent = "Unable to load goals.";
    }
}

goalForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const progress = Number(document.getElementById("progress").value);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title, category, progress })
        });

        if (!response.ok) {
            throw new Error("Failed to add goal");
        }

        goalForm.reset();
        await loadGoals();

    } catch (error) {
        alert("Could not add goal. Please try again.");
        console.error(error);
    }
});

async function updateGoal(id, currentProgress) {
    const input = prompt(
        "Enter new progress (0-100):",
        currentProgress
    );

    if (input === null) return;

    const value = input.trim();
    const progress = Number(value);

    if (value === "" || !Number.isInteger(progress) ||
        progress < 0 || progress > 100) {
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

    } catch (error) {
        alert("Could not update goal.");
        console.error(error);
    }
}

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

loadGoals();

