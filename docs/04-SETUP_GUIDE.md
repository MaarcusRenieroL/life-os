# Setup Guide — Build from Scratch

**This guide tells you exactly what to create to set up the monorepo from scratch.**

---

## Repository Reset

You'll delete all current code and start fresh. Here's the process:

### Step 1: Backup

```bash
# Create backup branch (keep current state safe)
git branch backup-before-reset

# Tag backup for reference
git tag backup-main HEAD
```

### Step 2: Clean Repository

```bash
# Option A: Keep .git, delete all files
cd ~/Desktop/projects/life-os

# Remove all tracked files
git rm -r .

# Remove all untracked files
git clean -fd

# Commit the empty state
git commit -m "chore: fresh start"

# Push to GitHub
git push origin main
```

**Option B: Fresh clone (safer)**

```bash
# Rename old repo
mv life-os life-os.old

# Clone again
git clone <repo> life-os
cd life-os

# Delete everything except .git
find . -mindepth 1 -not -path './.git/*' -type f -delete
find . -mindepth 1 -not -path './.git/*' -type d -delete
```

---

## Directory Structure (Complete)

Create this exact structure:

```
life-os/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docs/
│   ├── 00-PRODUCT_VISION.md (already written)
│   ├── 01-ARCHITECTURE.md (already written)
│   ├── 02-BUILD_PLAN.md (already written)
│   ├── 03-DEV_WORKFLOW.md (already written)
│   ├── 04-SETUP_GUIDE.md (this file)
│   └── 05-API_SPEC.md (write when building APIs)
├── services/
│   ├── auth/
│   │   ├── src/main/java/com/lifeos/auth/
│   │   ├── src/main/resources/
│   │   ├── src/test/
│   │   ├── pom.xml
│   │   └── Dockerfile
│   ├── vault/
│   │   ├── src/main/java/com/lifeos/vault/
│   │   ├── src/main/resources/
│   │   ├── src/test/
│   │   ├── pom.xml
│   │   └── Dockerfile
│   ├── job-tracker/
│   │   ├── src/main/java/com/lifeos/jobtracker/
│   │   ├── src/main/resources/
│   │   ├── src/test/
│   │   ├── pom.xml
│   │   └── Dockerfile
│   └── core/
│       ├── src/main/java/com/lifeos/core/
│       ├── src/main/resources/
│       ├── src/test/
│       ├── pom.xml
│       └── Dockerfile
├── apps/
│   ├── mobile/
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── package.json
│   │   ├── src/
│   │   └── (standard Expo structure)
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   └── (standard Next.js structure)
│   └── desktop/
│       ├── src-tauri/
│       ├── src/
│       ├── package.json
│       └── (Tauri structure)
├── packages/
│   ├── ui/
│   │   ├── components/
│   │   ├── tokens/
│   │   ├── package.json
│   │   └── .storybook/
│   ├── api-client/
│   │   ├── src/
│   │   ├── package.json
│   │   └── openapi.yaml (generated)
│   ├── state/
│   │   ├── src/
│   │   └── package.json
│   ├── types/
│   │   ├── src/
│   │   └── package.json
│   └── constants/
│       ├── src/
│       └── package.json
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .env.example
└── README.md
```

---

## Config Files to Create

### 1. `pnpm-workspace.yaml`

```yaml
packages:
  - "services/*"
  - "apps/*"
  - "packages/*"
```

### 2. `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 3. `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: lifeos
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://kafka:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - auth
      - vault
      - job-tracker
      - core

  auth:
    build:
      context: ./services/auth
      dockerfile: Dockerfile
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/lifeos
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
    ports:
      - "8001:8001"
    depends_on:
      postgres:
        condition: service_healthy
    command: java -jar target/auth-service.jar

  vault:
    build:
      context: ./services/vault
      dockerfile: Dockerfile
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/lifeos
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
    ports:
      - "8002:8002"
    depends_on:
      postgres:
        condition: service_healthy

  job-tracker:
    build:
      context: ./services/job-tracker
      dockerfile: Dockerfile
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/lifeos
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      KAFKA_BOOTSTRAP_SERVERS: kafka:29092
    ports:
      - "8003:8003"
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_started

  core:
    build:
      context: ./services/core
      dockerfile: Dockerfile
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/lifeos
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      REDIS_HOST: redis
      REDIS_PORT: 6379
      KAFKA_BOOTSTRAP_SERVERS: kafka:29092
      OLLAMA_URL: http://host.docker.internal:11434
    ports:
      - "8004:8004"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_started

volumes:
  postgres_data:
```

### 4. `nginx.conf`

```nginx
worker_processes auto;

events {
  worker_connections 1024;
}

http {
  upstream auth {
    server auth:8001;
  }
  upstream vault {
    server vault:8002;
  }
  upstream job_tracker {
    server job-tracker:8003;
  }
  upstream core {
    server core:8004;
  }

  server {
    listen 80;
    server_name _;

    # Auth service
    location /v1/auth/ {
      proxy_pass http://auth;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Vault service
    location /v1/vault/ {
      proxy_pass http://vault;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Job Tracker service
    location /v1/jobs/ {
      proxy_pass http://job_tracker;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /v1/companies/ {
      proxy_pass http://job_tracker;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /v1/search-configs/ {
      proxy_pass http://job_tracker;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Core service (everything else)
    location /v1/ {
      proxy_pass http://core;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check
    location /health {
      access_log off;
      return 200 "ok";
    }
  }
}
```

### 5. `.env.example`

```env
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/lifeos
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Ollama
OLLAMA_URL=http://localhost:11434

# JWT
JWT_SECRET=your-secret-key-min-256-bits-long
JWT_EXPIRATION_MINUTES=15
JWT_REFRESH_EXPIRATION_DAYS=30

# API
API_BASE_URL=http://localhost
API_PORT=8080

# Environment
ENVIRONMENT=development
```

### 6. `.gitignore`

```
# Java
*.class
*.jar
*.log
target/
build/
.gradle/
.maven/
.idea/
*.iml

# Node
node_modules/
dist/
.next/
.expo/
.pnpm-debug.log

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Tauri
src-tauri/target/

# Python (for Playwright worker if used)
__pycache__/
venv/
.venv/

# Docker
.dockerignore

# Misc
*.bak
.cache/
```

---

## Spring Boot Service Scaffolding

Each service (`auth`, `vault`, `job-tracker`, `core`) should have:

### `pom.xml` (Maven)

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.lifeos</groupId>
  <artifactId>lifeos-auth</artifactId>
  <version>1.0.0</version>
  <name>Life OS - Auth Service</name>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
  </parent>

  <dependencies>
    <!-- Spring Boot -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- Database -->
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <version>42.6.0</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-core</artifactId>
      <version>9.22.0</version>
    </dependency>

    <!-- JWT -->
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-api</artifactId>
      <version>0.12.3</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-impl</artifactId>
      <version>0.12.3</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-jackson</artifactId>
      <version>0.12.3</version>
      <scope>runtime</scope>
    </dependency>

    <!-- Testing -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>testcontainers</artifactId>
      <version>1.19.2</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>postgresql</artifactId>
      <version>1.19.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
      <plugin>
        <groupId>com.diffplug.spotless</groupId>
        <artifactId>spotless-maven-plugin</artifactId>
        <version>2.40.0</version>
        <configuration>
          <java>
            <eclipse />
          </java>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

### `Dockerfile`

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src/ src/
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8001
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### `application.yml`

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/lifeos}
    username: ${SPRING_DATASOURCE_USERNAME:postgres}
    password: ${SPRING_DATASOURCE_PASSWORD:postgres}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        jdbc:
          batch_size: 20
  flyway:
    baseline-on-migrate: true
    locations: classpath:db/migration

jwt:
  secret: ${JWT_SECRET:change-me-in-production}
  expiration-minutes: ${JWT_EXPIRATION_MINUTES:15}
  refresh-expiration-days: ${JWT_REFRESH_EXPIRATION_DAYS:30}

server:
  port: 8001
  servlet:
    context-path: /
```

---

## Starting from Scratch Checklist

- [ ] Create directory structure (all folders above)
- [ ] Create config files (pnpm-workspace.yaml, turbo.json, docker-compose.yml, etc.)
- [ ] Initialize each Spring service with maven:
  ```bash
  cd services/auth
  mvn archetype:generate \
    -DgroupId=com.lifeos \
    -DartifactId=lifeos-auth \
    -DarchetypeArtifactId=maven-archetype-quickstart \
    -DinteractiveMode=false
  ```
- [ ] Add pom.xml from template above
- [ ] Create Dockerfile for each service
- [ ] Create application.yml for each service
- [ ] Start services:
  ```bash
  docker-compose up -d
  ```
- [ ] Verify all running:
  ```bash
  docker ps
  curl http://localhost/health
  ```

---

**You're now ready to start building!**

Start with Phase 1: Auth Service (see BUILD_PLAN.md)

