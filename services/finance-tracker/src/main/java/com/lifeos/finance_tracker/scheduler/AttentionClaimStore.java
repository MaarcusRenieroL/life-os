package com.lifeos.finance_tracker.scheduler;

import java.time.Duration;
import java.time.Instant;
import java.sql.Timestamp;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * At-most-once claims for the attention scan ("this bill was already announced"). Kept in Postgres
 * so a restart cannot make the next scan announce everything again.
 */
@Component
public class AttentionClaimStore {

  private final JdbcTemplate jdbc;

  public AttentionClaimStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** True the first time {@code key} is claimed, and again only once {@code ttl} has passed. */
  public boolean claim(String key, Duration ttl) {
    Instant now = Instant.now();
    int changed =
        jdbc.update(
            "insert into finance_schema.attention_claims (claim_key, expires_at) values (?, ?)"
                + " on conflict (claim_key) do update set expires_at = excluded.expires_at"
                + " where finance_schema.attention_claims.expires_at < ?",
            key,
            Timestamp.from(now.plus(ttl)),
            Timestamp.from(now));
    return changed > 0;
  }
}
