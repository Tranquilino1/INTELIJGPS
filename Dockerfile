# ─── Stage 1: Build ───────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /build
COPY backend/pom.xml .
RUN mvn dependency:go-offline -q
COPY backend/src ./src
RUN mvn package -DskipTests -q

# ─── Stage 2: Run ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080
# Render provides a $PORT environment variable dynamically. We must bind Spring Boot to it.
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
