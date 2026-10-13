from flask import Flask, request, jsonify
import sqlite3
import os

app = Flask(__name__)

DATABASE = "/data/goals.db"


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    os.makedirs("/data", exist_ok=True)

    connection = get_db()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0
        )
    """)

    connection.commit()
    connection.close()


@app.route("/api/goals", methods=["GET"])
def get_goals():
    connection = get_db()

    goals = connection.execute(
        "SELECT * FROM goals ORDER BY id DESC"
    ).fetchall()

    connection.close()

    return jsonify([dict(goal) for goal in goals])


@app.route("/api/goals", methods=["POST"])
def add_goal():
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    category = data.get("category", "").strip()

    try:
        progress = int(data.get("progress", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Progress must be a number"}), 400

    if not title or not category:
        return jsonify({"error": "Title and category are required"}), 400

    if progress < 0 or progress > 100:
        return jsonify({"error": "Progress must be between 0 and 100"}), 400

    connection = get_db()

    cursor = connection.execute(
        """
        INSERT INTO goals (title, category, progress)
        VALUES (?, ?, ?)
        """,
        (title, category, progress)
    )

    connection.commit()

    goal_id = cursor.lastrowid

    goal = connection.execute(
        "SELECT * FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    connection.close()

    return jsonify(dict(goal)), 201


@app.route("/api/goals/<int:goal_id>", methods=["PUT"])
def update_goal(goal_id):
    data = request.get_json(silent=True) or {}

    try:
        progress = int(data.get("progress", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Progress must be a number"}), 400

    if progress < 0 or progress > 100:
        return jsonify({"error": "Progress must be between 0 and 100"}), 400

    connection = get_db()

    existing_goal = connection.execute(
        "SELECT * FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    if existing_goal is None:
        connection.close()
        return jsonify({"error": "Goal not found"}), 404

    connection.execute(
        "UPDATE goals SET progress = ? WHERE id = ?",
        (progress, goal_id)
    )

    connection.commit()

    goal = connection.execute(
        "SELECT * FROM goals WHERE id = ?",
        (goal_id,)
    ).fetchone()

    connection.close()

    return jsonify(dict(goal))


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


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"})


init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
