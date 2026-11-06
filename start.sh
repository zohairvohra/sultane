#!/bin/bash
set -e

# Initialize postgres data directory if not initialized
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL database..."
    initdb -D "$PGDATA"
    pg_ctl -D "$PGDATA" -o "-k /tmp" start
    
    until pg_isready -h localhost -p 5432; do
        echo "Waiting for postgres to become ready..."
        sleep 1
    done
    
    createdb -h localhost -p 5432 sultane || true
    echo "Running migrations and seeds..."
    cd /home/user/app/database
    npm run migrate
    npm run seed
    cd /home/user/app
else
    pg_ctl -D "$PGDATA" -o "-k /tmp" start
    until pg_isready -h localhost -p 5432; do
        sleep 1
    done
fi

echo "Starting SULTANÉ server on port $PORT..."
cd /home/user/app/backend
exec node dist/server.js
