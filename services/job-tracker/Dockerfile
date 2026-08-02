FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

COPY services/common/pom.xml services/common/pom.xml
COPY services/common/src services/common/src
RUN mvn -f services/common/pom.xml install -DskipTests

COPY services/job-tracker/pom.xml services/job-tracker/pom.xml
RUN mvn -f services/job-tracker/pom.xml dependency:go-offline

COPY services/job-tracker/src services/job-tracker/src
RUN mvn -f services/job-tracker/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=builder /app/services/job-tracker/target/*.jar app.jar

EXPOSE 8003

ENTRYPOINT ["java", "-jar", "app.jar"]
