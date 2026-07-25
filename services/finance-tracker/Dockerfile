FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Build context is the repo root (not this service's own directory) so this
# stage can also reach services/common - finance-tracker depends on it as a
# regular Maven artifact, and Docker's build isolation means it has to be
# built and installed into this container's own ~/.m2 before finance-tracker's
# own build can resolve com.lifeos:common.
COPY services/common/pom.xml services/common/pom.xml
COPY services/common/src services/common/src
RUN mvn -f services/common/pom.xml install -DskipTests

COPY services/finance-tracker/pom.xml services/finance-tracker/pom.xml
RUN mvn -f services/finance-tracker/pom.xml dependency:go-offline

COPY services/finance-tracker/src services/finance-tracker/src
RUN mvn -f services/finance-tracker/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=builder /app/services/finance-tracker/target/*.jar app.jar

EXPOSE 8006

ENTRYPOINT ["java", "-jar", "app.jar"]
