
# Goal Tracker - Docker Final Project

## Project Overview

Goal Tracker is a containerized web application developed for the Docker Final Project at Austin Community College.

The application allows users to create, manage, and track personal goals, set due dates, record progress, and document achievements through goal-specific journal entries.

The project demonstrates containerization, multi-container application architecture, Docker networking, persistent storage, and image distribution using Docker Hub.

Version 1.1 expands the original application with calendar integration, goal completion celebrations, and journaling.

## Technologies Used

- Docker Engine and Docker Compose V2
- Python 3.12
- Flask and Gunicorn
- NGINX
- HTML, CSS, and JavaScript
- SQLite
- Git and GitHub
- Docker Hub

## Application Architecture

```text
               Web Browser
                    |
                    | HTTP port 8081
                    v
          +-------------------+
          | NGINX Frontend    |
          | Container         |
          | Port 80           |
          +-------------------+
                    |
                    | /api/ requests
                    | Docker DNS: backend
                    v
          +-------------------+
          | Flask Backend     |
          | Gunicorn          |
          | Port 5000         |
          +-------------------+
                    |
                    v
          +-------------------+
          | SQLite Database   |
          | /data/goals.db    |
          | Named Volume:     |
          | goal_data         |
          +-------------------+

       Docker Compose Custom
           Bridge Network
```

The frontend and backend communicate through a private Docker bridge network.

NGINX serves the web interface and forwards API requests to the Flask backend.

The backend stores goal and journal information in SQLite using a persistent Docker volume.

## Project Structure

```text
goal-tracker/
├── backend/
│   ├── Dockerfile
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── style.css
│   └── app.js
├── compose.yaml
├── .gitignore
└── README.md
```

## Application Features

### Goal Management

- Create personal goals
- Organize goals by category
- Track progress from 0% to 100%
- Update goal progress
- Delete goals
- View total and completed goal counts
- Store goals persistently in SQLite

### Due Dates and Calendar Integration

Users can assign optional due dates to their goals.

Goals with due dates can be added to:

- Google Calendar
- Microsoft Outlook Calendar
- Apple Calendar and other compatible calendar applications using downloadable `.ics` files

Calendar events include the goal title, category, and progress.

### Goal Completion Celebrations

When a goal reaches 100% completion, the application displays a congratulatory message and animated confetti.

The celebration is triggered when a new goal is created at 100% or an existing goal progresses from below 100% to 100%.

The animation also respects reduced-motion accessibility preferences.

### Goal Journaling

Each goal has its own journal.

Users can:

- Write journal entries about their progress
- View previous entries
- See timestamps for each entry
- Delete individual entries
- Preserve entries in SQLite across container restarts

Journal entries are associated with their corresponding goals using a database foreign key.

Deleting a goal also deletes its associated journal entries.

## Docker Hub Images

The project includes two published versions.

### Version 1.0

Original goal tracking application:

- `collinwest524/goal-tracker-backend:1.0`
- `collinwest524/goal-tracker-frontend:1.0`

### Version 1.1

Enhanced application with calendar integration, completion celebrations, and journaling:

- `collinwest524/goal-tracker-backend:1.1`
- `collinwest524/goal-tracker-frontend:1.1`

Docker Hub repositories:

- https://hub.docker.com/r/collinwest524/goal-tracker-backend
- https://hub.docker.com/r/collinwest524/goal-tracker-frontend

## Running the Application

### Prerequisites

- Docker Engine
- Docker Compose V2
- Git

### Clone the Repository

```bash
git clone https://github.com/collinwest2-sudo/goal-tracker.git
cd goal-tracker
```

### Create the Persistent Volume

The Compose configuration uses an external Docker volume named `goal_data`.

Create the volume before starting the application:

```bash
docker volume create goal_data
```

### Build and Start the Containers

```bash
docker compose up -d --build
```

Docker Compose builds the frontend and backend images and starts both containers.

### Access the Application

Open a browser and visit:

http://localhost:8081

When accessing the application from another computer, replace `localhost` with the Docker host's IP address.

### Check Container Status

```bash
docker compose ps
```

Both containers should show a running status.

### Test the Backend API

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/goals
```

The health endpoint should return:

```json
{"status":"healthy"}
```

### Stop the Application

```bash
docker compose down
```

This removes the containers and Compose network but preserves the external named volume.

Do not manually remove the `goal_data` volume if you want to keep your saved goals and journal entries.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend health |
| GET | `/api/goals` | Retrieve all goals |
| POST | `/api/goals` | Create a goal |
| PUT | `/api/goals/<id>` | Update goal progress or due date |
| DELETE | `/api/goals/<id>` | Delete a goal |
| GET | `/api/goals/<id>/journal` | Retrieve a goal's journal entries |
| POST | `/api/goals/<id>/journal` | Create a journal entry |
| DELETE | `/api/goals/<id>/journal/<entry_id>` | Delete a journal entry |

### Example: Create a Goal

```bash
curl -X POST http://localhost:8081/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete Docker Project",
    "category": "School",
    "progress": 50,
    "due_date": "2026-10-30"
  }'
```

### Example: Add a Journal Entry

Replace `<id>` with an existing goal ID.

```bash
curl -X POST http://localhost:8081/api/goals/<id>/journal \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Made progress on my Docker project today."
  }'
```

### Example: Retrieve Journal Entries

```bash
curl http://localhost:8081/api/goals/<id>/journal
```

## Docker Networking

Docker Compose creates a user-defined bridge network named `goal-tracker_goal_network` when the project directory is named `goal-tracker`.

The NGINX frontend communicates with the backend using the Docker service name `backend` and internal port 5000.

Only the frontend is published to the Docker host on port 8081.

The backend is accessible internally through the Docker network rather than being directly exposed to the host.

Docker's internal DNS allows the frontend to locate the backend container by its service name.

## Persistent Storage

SQLite stores application data in:

```text
/data/goals.db
```

The database resides in the external Docker volume:

```text
goal_data
```

The database contains two application tables:

- `goals` — stores goal titles, categories, progress, and due dates
- `journal_entries` — stores journal content, timestamps, and associated goal IDs

The journal table uses a foreign key relationship to associate entries with goals.

Foreign key enforcement enables automatic deletion of related journal entries when a goal is deleted.

Persistent storage allows application data to survive container removal and recreation.

The original project's persistence was tested by creating a goal, removing and restarting containers, and verifying that the saved goal remained.

## Security Measures

1. The Flask backend runs as a non-root user named `appuser` (UID 1000).
2. The backend does not publish its application port directly to the host.
3. The frontend and backend communicate over a private Docker bridge network.
4. SQL statements use parameterized queries to reduce SQL injection risks.
5. The backend validates goal progress, due dates, and journal entry content.

## Testing and Verification

### Version 1.0

The following tests were completed:

- Docker images built successfully
- Both containers started using Docker Compose
- Flask health endpoint returned a healthy status
- Goals were created, updated, and deleted
- API returned saved goal data
- SQLite data survived container removal and recreation
- Backend container ran as UID 1000
- Custom Docker network used the bridge driver
- Version 1.0 images were pushed to Docker Hub

### Version 1.1

Additional functionality was tested:

- Due dates were saved and retrieved through the API
- Google Calendar integration opened correctly
- Outlook Calendar integration opened correctly
- `.ics` calendar files downloaded successfully
- Confetti celebrations displayed when goals reached 100%
- Journal entries were created through the API
- Journal entries were retrieved from SQLite
- Journal entries were created and viewed through the web interface
- Journal entries were deleted through the web interface
- Existing goals remained intact after backend updates
- Both updated containers started successfully
- Backend health endpoint returned a healthy status
- Version 1.1 source code and Git tag were pushed to GitHub
- Version 1.1 frontend and backend images were pushed to Docker Hub

## Troubleshooting

### Port 8080 Already in Use

Another container was using host port 8080.

The frontend was configured to use host port 8081 instead.

### NGINX Cannot Resolve Backend

The NGINX configuration uses the Docker Compose service name `backend`.

Both containers must be connected to the same Docker network for internal DNS resolution.

### Persistent Volume Missing

Because `goal_data` is declared as an external volume, it must exist before starting the application.

```bash
docker volume create goal_data
```

### Application Changes Not Appearing

Rebuild the containers:

```bash
docker compose up -d --build
```

Refresh the browser to load the updated frontend files.

### View Container Logs

```bash
docker compose logs backend
docker compose logs frontend
```

These commands can help identify startup errors and application problems.

## Version History

| Version | Description |
|---|---|
| 1.0 | Original containerized goal tracking application |
| 1.1 | Added due dates, calendar integration, confetti celebrations, and goal journaling |

## Source Code

GitHub Repository:

https://github.com/collinwest2-sudo/goal-tracker

## Author

Collin West

Austin Community College

Docker Final Project for Kelly

