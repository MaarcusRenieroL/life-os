FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Build context is the repo root (not this service's own directory) so this
# stage can also reach services/common - auth depends on it as a regular
# Maven artifact, and Docker's build isolation means it has to be built and
# installed into this container's own ~/.m2 before auth's own build can
# resolve com.lifeos:common.
COPY services/common/pom.xml services/common/pom.xml
COPY services/common/src services/common/src
RUN mvn -f services/common/pom.xml install -DskipTests

COPY services/auth/pom.xml services/auth/pom.xml
RUN mvn -f services/auth/pom.xml dependency:go-offline

COPY services/auth/src services/auth/src
RUN mvn -f services/auth/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=builder /app/services/auth/target/*.jar app.jar

EXPOSE 8001

ENTRYPOINT ["java", "-jar", "app.jar"]
