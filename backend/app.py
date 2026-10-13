
from flask import Flask, request, jsonify
from datetime import date
import sqlite3
import os

app = Flask(__name__)

DATABASE = "/data/goals.db"


# Connect to SQLite and enable foreign key relationships.
def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


# Initialize database tables without deleting existing data.
def init_db():
    os.makedirs("/data", exist_ok=True)

    connection = get_db()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0,
            due_date TEXT
        )
    """)

    # Upgrade databases created before due dates were added.
    columns = [
        row["name"]
        for row in connection.execute("PRAGMA table_info(goals)")
    ]

    if "due_date" not in columns:
        connection.execute(
            "ALTER TABLE goals ADD COLUMN due_date TEXT"
        )

    # Each journal entry belongs to one goal.
    connection.execute("""
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (goal_id) REFERENCES goals(id)
                ON DELETE CASCADE
        )
    """)

    connection.commit()
    connection.close()


# Validate optional due dates.
def validate_due_date(value):
    if value is None or value == "":
        return None

    if not isinstance(value, str):
        raise ValueError("Due date must be a string")

    try:
        parsed_date = date.fromisoformat(value)
    except ValueError:
        raise ValueError("Due date must use YYYY-MM-DD format")

    if parsed_date.isoformat() != value:
        raise ValueError("Due date must use YYYY-MM-DD format")

    return value


# Get all goals.
@app.route("/api/goals", methods=["GET"])
def get_goals():
    connection = get_db()

    goals = connection.execute(
        "SELECT * FROM goals ORDER BY id DESC"
    ).fetchall()

    connection.close()

    return jsonify([dict(goal) for goal in goals])


# Create a goal.
@app.route("/api/goals", methods=["POST"])
def add_goal():
    data = request.get_json(silent=True) or {}

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON object"}), 400

    title = data.get("title", "")
    category = data.get("category", "")

    if not isinstance(title, str) or not isinstance(category, str):
        return jsonify({"error": "Invalid title or category"}), 400

    title = title.strip()
    category = category.strip()

    try:
        progress = int(data.get("progress", 0))
    except (TypeError, ValueError, OverflowError):
        return jsonify({"error": "Progress must be a number"}), 400

    try:
        due_date = validate_due_date(data.get("due_date"))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    if not title or not category:
        return jsonify({
            "error": "Title and category are required"
        }), 400

    if progress < 0 or progress > 100:
        return jsonify({
            "error": "Progress must be between 0 and 100"
        }), 400

    connection = get_db()

    cursor = connection.execute(
        """
        INSERT INTO goals (title, category, progress, due_date)
        VALUES (?, ?, ?, ?)
        """,
        (title, category, progress, due_date)
    )

    connection.commit()

    goal_id = cursor.lastrowid

    goal = connection.execute(
        "SELECT * FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    connection.close()

    return jsonify(dict(goal)), 201


# Update progress and/or due date.
@app.route("/api/goals/<int:goal_id>", methods=["PUT"])
def update_goal(goal_id):
    data = request.get_json(silent=True) or {}

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON object"}), 400

    connection = get_db()

    existing_goal = connection.execute(
        "SELECT * FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    if existing_goal is None:
        connection.close()
        return jsonify({"error": "Goal not found"}), 404

    progress = existing_goal["progress"]
    due_date = existing_goal["due_date"]

    if "progress" in data:
        try:
            progress = int(data["progress"])
        except (TypeError, ValueError, OverflowError):
            connection.close()
            return jsonify({
                "error": "Progress must be a number"
            }), 400

        if progress < 0 or progress > 100:
            connection.close()
            return jsonify({
                "error": "Progress must be between 0 and 100"
            }), 400

    if "due_date" in data:
        try:
            due_date = validate_due_date(data["due_date"])
        except ValueError as error:
            connection.close()
            return jsonify({"error": str(error)}), 400

    connection.execute(
        """
        UPDATE goals
        SET progress = ?, due_date = ?
        WHERE id = ?
        """,
        (progress, due_date, goal_id)
    )

    connection.commit()

    goal = connection.execute(
        "SELECT * FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    connection.close()

    return jsonify(dict(goal))


# Delete a goal and its journal entries.
@app.route("/api/goals/<int:goal_id>", methods=["DELETE"])
def delete_goal(goal_id):
    connection = get_db()

    existing_goal = connection.execute(
        "SELECT * FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    if existing_goal is None:
        connection.close()
        return jsonify({"error": "Goal not found"}), 404

    connection.execute(
        "DELETE FROM goals WHERE id = ?",
        (goal_id,)
    )

    connection.commit()
    connection.close()

    return jsonify({"message": "Goal deleted"})


# Get all journal entries for a specific goal.
@app.route("/api/goals/<int:goal_id>/journal", methods=["GET"])
def get_journal_entries(goal_id):
    connection = get_db()

    goal = connection.execute(
        "SELECT id FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    if goal is None:
        connection.close()
        return jsonify({"error": "Goal not found"}), 404

    entries = connection.execute(
        """
        SELECT id, goal_id, content, created_at
        FROM journal_entries
        WHERE goal_id = ?
        ORDER BY created_at DESC, id DESC
        """,
        (goal_id,)
    ).fetchall()

    connection.close()

    return jsonify([dict(entry) for entry in entries])


# Add a journal entry to a goal.
@app.route("/api/goals/<int:goal_id>/journal", methods=["POST"])
def add_journal_entry(goal_id):
    data = request.get_json(silent=True) or {}

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON object"}), 400

    content = data.get("content", "")

    if not isinstance(content, str):
        return jsonify({"error": "Journal content must be text"}), 400

    content = content.strip()

    if not content:
        return jsonify({
            "error": "Journal entry cannot be empty"
        }), 400

    if len(content) > 5000:
        return jsonify({
            "error": "Journal entry cannot exceed 5000 characters"
        }), 400

    connection = get_db()

    goal = connection.execute(
        "SELECT id FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    if goal is None:
        connection.close()
        return jsonify({"error": "Goal not found"}), 404

    cursor = connection.execute(
        """
        INSERT INTO journal_entries (goal_id, content)
        VALUES (?, ?)
        """,
        (goal_id, content)
    )

    connection.commit()

    entry = connection.execute(
        """
        SELECT id, goal_id, content, created_at
        FROM journal_entries
        WHERE id = ?
        """,
        (cursor.lastrowid,)
    ).fetchone()

    connection.close()

    return jsonify(dict(entry)), 201


# Delete one journal entry belonging to a specific goal.
@app.route(
    "/api/goals/<int:goal_id>/journal/<int:entry_id>",
    methods=["DELETE"]
)
def delete_journal_entry(goal_id, entry_id):
    connection = get_db()

    cursor = connection.execute(
        """
        DELETE FROM journal_entries
        WHERE id = ? AND goal_id = ?
        """,
        (entry_id, goal_id)
    )

    if cursor.rowcount == 0:
        connection.close()
        return jsonify({"error": "Journal entry not found"}), 404

    connection.commit()
    connection.close()

    return jsonify({"message": "Journal entry deleted"})


# API health check.
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"})


# Create or upgrade database tables when the app starts.
init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

