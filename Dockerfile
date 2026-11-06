FROM node:22-bookworm-slim

# Install PostgreSQL, procps, and curl
RUN apt-get update && apt-get install -y \
    postgresql postgresql-contrib \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces runs as user ID 1000
RUN useradd -m -u 1000 user
ENV HOME=/home/user
WORKDIR /home/user/app

# Set up directories and permissions
RUN mkdir -p /home/user/pgdata /home/user/app/backend/uploads && \
    chown -R user:user /home/user

USER user
ENV PGDATA=/home/user/pgdata
ENV PATH="/usr/lib/postgresql/15/bin:$PATH"

# Copy package definitions and install dependencies
COPY --chown=user:user database/package*.json ./database/
COPY --chown=user:user backend/package*.json ./backend/
COPY --chown=user:user frontend/package*.json ./frontend/

RUN cd database && npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy application source
COPY --chown=user:user . .

# Build frontend with relative API path
ENV VITE_API_URL=/api
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npm run build

# Environment defaults for Hugging Face Spaces
ENV PORT=7860
ENV DATABASE_URL=postgres://user:@localhost:5432/sultane
ENV JWT_SECRET=sultane-production-jwt-secret-key-hf-spaces
ENV NODE_ENV=production

EXPOSE 7860

COPY --chown=user:user --chmod=755 start.sh /home/user/start.sh

CMD ["/home/user/start.sh"]
