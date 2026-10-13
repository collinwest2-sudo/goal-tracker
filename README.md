# Goal Tracker - Docker Final Project

## Project Overview

Goal Tracker is a containerized web application that allows users to create, view, update, and delete personal goals. It was developed as a Docker Final Project for Austin Community College.

The application uses Docker Compose to run two containers: an NGINX frontend and a Flask backend. SQLite stores goal data in a persistent Docker volume.

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
          +------------------+
          | NGINX Frontend   |
          | Container        |
          | Port 80          |
          +------------------+
                   |
                   | /api/ requests
                   | Docker DNS: backend
                   v
          +------------------+
          | Flask Backend    |
          | Container        |
          | Port 5000        |
          +------------------+
                   |
                   v
          +------------------+
          | SQLite Database  |
          | /data/goals.db   |
          | Named Volume:    |
          | goal_data        |
          +------------------+

     Custom Bridge Network:
     goal-tracker_goal_network
```

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

## Docker Hub Images

Version 1.0 images:

- Backend: collinwest524/goal-tracker-backend:1.0
- Frontend: collinwest524/goal-tracker-frontend:1.0

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

The Compose configuration uses an external named volume, which must be created before starting the application.

```bash
docker volume create goal_data
```

### Build and Start the Containers

```bash
docker compose up -d --build
```

### Access the Application

Open a browser and visit:

http://localhost:8081

When accessing the application from another computer, replace localhost with the Docker host's IP address.

### Check Container Status

```bash
docker compose ps
```

### Test the Backend API

```bash
curl http://localhost:8081/api/health
curl http://localhost:8081/api/goals
```

### Stop the Application

```bash
docker compose down
```

Do not use docker compose down -v if you want to preserve stored goals.

## Application Features

- Create a goal
- View saved goals
- Update a goal
- Delete a goal
- Store goals persistently using SQLite
- Access backend endpoints through the NGINX reverse proxy

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/health | Check backend health |
| GET | /api/goals | Retrieve goals |
| POST | /api/goals | Create a goal |
| PUT | /api/goals/<id> | Update a goal |
| DELETE | /api/goals/<id> | Delete a goal |

## Networking

Docker Compose creates a user-defined bridge network named goal-tracker_goal_network.

The frontend communicates with the backend using the Docker service name backend and internal port 5000.

Only the frontend is published to the host on port 8081. The backend is not directly exposed to the host.

## Persistent Storage

SQLite stores application data in /data/goals.db inside the backend container.

The named Docker volume goal_data preserves this database when containers are stopped, removed, and recreated.

Persistence was tested by creating a goal, running docker compose down, restarting with docker compose up -d, and confirming the saved goal remained.

## Security Measures

1. The Flask backend runs as a non-root user named appuser (UID 1000).
2. The backend does not publish its application port to the host. Browser traffic reaches it through the NGINX frontend on the private Docker bridge network.

## Testing

The following checks were completed:

- Docker images built successfully
- Both containers started using Docker Compose
- Backend health endpoint returned a healthy status
- Goals were created and deleted through the browser
- API returned saved goal data
- SQLite data survived container removal and recreation
- Backend container was verified to run as UID 1000
- Custom Docker network was verified to use the bridge driver
- Version 1.0 images were successfully pushed to Docker Hub

## Troubleshooting

### Port 8080 Already in Use

Another container was using host port 8080, so the frontend was configured to use host port 8081 instead.

### NGINX Cannot Resolve Backend

The NGINX configuration uses the Docker Compose service name backend. The containers must run on the same Compose network so Docker DNS can resolve the backend service.

### Persistent Volume Missing

Because goal_data is declared as an external volume, create it before starting the application:

```bash
docker volume create goal_data
```

## Author

Collin West

Austin Community College - Docker Final Project for Kelly
