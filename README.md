# rocky-betting-backend

## Running the Backend

You can run the backend locally using Docker Compose, which also starts PostgreSQL and Valkey services.

```bash
cd /Users/vipinpandey/Mini_Project/rocky-betting-backend
docker compose up --build
```

The backend will be available at `http://localhost:3000`. The API expects a PostgreSQL database and a Valkey instance; these are provided automatically by the compose file.

### Stopping the Services

```bash
docker compose down
```

### Running without Docker

If you prefer to run the backend directly:

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Ensure a PostgreSQL server is running locally (default `postgresql://postgres:postgres@localhost:5432/rockydb`) and Valkey is available on port `6379`.
4. Start the server:
   ```bash
   npm start
   ```

Make sure to set the required environment variables (e.g., `DATABASE_URL`, `VALKEY_URL`) accordingly.
