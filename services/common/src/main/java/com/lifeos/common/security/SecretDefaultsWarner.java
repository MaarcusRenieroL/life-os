package com.lifeos.common.security;

import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Every service falls back to a hardcoded yaml default for its signing/encryption secrets so a
 * fresh checkout can {@code docker compose up} without configuring anything first - convenient
 * for local dev, but every one of these specific literals was, until this pass, shared
 * identically across every service's git history. Checking presence of the {@code *_SECRET} env
 * vars doesn't work here: docker-compose's own {@code ${VAR:-default}} syntax means the
 * container's OS environment always has *something* set, whether or not the operator configured a
 * real value. So this compares the actually-resolved secret values against the known literals
 * instead - it only fires for these specific historical defaults, not for a future/rotated
 * default, which is exactly what's needed to catch someone still running on them.
 */
@Component
public class SecretDefaultsWarner implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(SecretDefaultsWarner.class);

  // The 3 secrets every service in this repo shared identically before this pass.
  private static final Set<String> KNOWN_LEAKED_DEFAULTS =
      Set.of(
          "TTdGFPf9lbnQ3J3GBU8MnwQfp3oaawcBzf9LlBJpqlE=", // old shared JWT_SECRET
          "wwJvw6iKu4JYUQqc371t2ZDi0ReptRWQ7GDIc2Zs7WM=", // old shared ENCRYPTION_SECRET
          "H5A1u/lQOivHU+ziG0/oEWUa2oF3uXdZVmuYZH8siFA="); // old shared INTERNAL_API_KEY

  @Value("${spring.application.name:service}")
  private String serviceName;

  @Value("${jwt.secret:}")
  private String jwtSecret;

  @Value("${internal.api-key:}")
  private String internalApiKey;

  @Value("${encryption.secret:}")
  private String encryptionSecret;

  @Override
  public void run(ApplicationArguments args) {
    warnIfLeakedDefault("jwt.secret / JWT_SECRET", jwtSecret);
    warnIfLeakedDefault("internal.api-key / INTERNAL_API_KEY", internalApiKey);
    warnIfLeakedDefault("encryption.secret / *_ENCRYPTION_SECRET", encryptionSecret);
  }

  private void warnIfLeakedDefault(String label, String value) {
    if (value != null && KNOWN_LEAKED_DEFAULTS.contains(value)) {
      log.warn(
          "{} is running on the OLD SHARED DEFAULT for {} (was identical across every service in"
              + " this repo's git history). Set a real, service-specific value before this runs"
              + " anywhere but local dev.",
          serviceName,
          label);
    }
  }
}
