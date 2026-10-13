# The whole backend as one image. Build context is the repo root:
#   docker build -f services/Dockerfile -t life-os-backend .
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Every module is a library jar that the "app" module assembles, so the reactor builds them all
# (-am) and only app/target/app-*.jar is runnable. The cache mount keeps ~/.m2 between builds.
COPY services services
RUN --mount=type=cache,target=/root/.m2 \
    mvn -f services/pom.xml -pl app -am -B -DskipTests clean package

# ---------------------------------------------------------------------------
# tectonic: single self-contained LaTeX engine used to render a tailored
# resume to PDF. Fetched per target arch, then warmed once so the first real
# compile isn't a cold package download.
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

COPY --from=builder /app/services/app/target/app-*.jar app.jar

EXPOSE 8005

ENTRYPOINT ["java", "-jar", "app.jar"]
