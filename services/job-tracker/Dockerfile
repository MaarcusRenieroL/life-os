FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Build context is the repo root (not this service's own directory) so this
# stage can also reach services/common - job-tracker depends on it as a
# regular Maven artifact, and Docker's build isolation means it has to be
# built and installed into this container's own ~/.m2 before job-tracker's
# own build can resolve com.lifeos:common.
COPY services/common/pom.xml services/common/pom.xml
COPY services/common/src services/common/src
RUN mvn -f services/common/pom.xml install -DskipTests

COPY services/job-tracker/pom.xml services/job-tracker/pom.xml
RUN mvn -f services/job-tracker/pom.xml dependency:go-offline

COPY services/job-tracker/src services/job-tracker/src
RUN mvn -f services/job-tracker/pom.xml clean package -DskipTests

# ---------------------------------------------------------------------------
# tectonic: single self-contained LaTeX engine used to re-render a candidate's
# resume on their own template. Fetched per target arch, then warmed once so
# the first real compile isn't a cold package download.
# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS tex

ARG TARGETARCH
ARG TECTONIC_VERSION=0.15.0
ENV XDG_CACHE_HOME=/var/cache
RUN apk add --no-cache curl ca-certificates \
    && case "$TARGETARCH" in \
         arm64) TT_ARCH=aarch64-unknown-linux-musl ;; \
         amd64) TT_ARCH=x86_64-unknown-linux-musl ;; \
         *) echo "unsupported arch $TARGETARCH" && exit 1 ;; \
       esac \
    && curl -fsSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${TT_ARCH}.tar.gz" \
       | tar -xz -C /usr/local/bin tectonic \
    && chmod +x /usr/local/bin/tectonic

COPY services/job-tracker/latex-warmup.tex /tmp/warmup/warmup.tex
RUN cd /tmp/warmup && tectonic -X compile warmup.tex --outdir . && rm -rf /tmp/warmup

# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

ENV XDG_CACHE_HOME=/var/cache
RUN apk add --no-cache ca-certificates fontconfig
COPY --from=tex /usr/local/bin/tectonic /usr/local/bin/tectonic
COPY --from=tex /var/cache/Tectonic /var/cache/Tectonic

COPY --from=builder /app/services/job-tracker/target/*.jar app.jar

EXPOSE 8003

ENTRYPOINT ["java", "-jar", "app.jar"]
