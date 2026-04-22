# CS-3200-Project-3

A Node.js web application for landlords to review rental applications. The application uses MongoDB as the source of truth and Redis as a cache for pending applications in the landlord review queue.

## Scope

This application is intentionally focused on one workflow only:

- Landlord review of rental applications.

This does not implement tenant side, browsing open, available listings. This is due to the project time scope. 

## Features

- Landlord dashboard for pending applications.
- Create, edit, and delete application records.
- Redis-backed cache for fast pending application lookup.
- MongoDB-backed persistence for long-term storage.
- Startup seeding from JSON mock data when collections are empty.

## Project Structure

```
.
|-- docker-compose.yml
|-- data/
|   |-- applications_mock.json
|   |-- properties_final.json
|   |-- sublease_listings_mock.json
|   |-- users_mock.json
|-- src/
    |-- Dockerfile
    |-- mongodbClient.js
    |-- redisClient.js
    |-- server.js
    |-- package.json
    |-- routes/
    |   |-- applications.js
    |-- services/
    |   |-- applicationStore.js
    |   |-- seedMockData.js
    |-- views/
    |-- public/
```

## Setup: Run with Docker Compose (Recommended)

From the repository root:

```bash
docker-compose up --build
```
Go over to localhost:3000/ to interact with the application

To stop:

```bash
docker-compose down
```

To stop and remove volumes:

```bash
docker-compose down -v
```

## AI Disclosure Policy

AI was extensively used for this project to build the front-end and wire up the backend for the routers and and servers. It was also extensively used in the backend to seed mock data into mongodb and create helper functions in redis for UI standardization and redis autocaching. The core functionality however, the redis CRUD operations, as outlined from `Functionalities.md` was purely written by me to convey functional understanding of redis caching commands.
