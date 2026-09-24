package com.lifeos.batches.job;

import com.lifeos.batches.repository.AuditEventRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * audit_events is the only unbounded table in the app - every module publishes to it over Kafka and
 * nothing ever removed rows, so it grew forever. This trims anything older than the configured
 * retention window (default 180 days).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditEventRetentionScheduler {

  private final AuditEventRepository auditEventRepository;

  @Value("${audit.retention-days:180}")
  private int retentionDays;

  @Scheduled(cron = "${audit.retention.cron:0 30 3 * * *}")
  @Transactional
  public void purgeOldAuditEvents() {
    // A non-positive retention would delete everything up to "now", which is almost certainly a
    // misconfiguration rather than an intent to wipe the audit log - skip instead.
    if (retentionDays <= 0) {
      log.warn("audit.retention-days is {}, skipping audit event purge", retentionDays);
      return;
    }

    Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
    int deleted = auditEventRepository.deleteByOccurredAtBefore(cutoff);
    log.info("Purged {} audit events older than {} ({} day retention)", deleted, cutoff, retentionDays);
  }
}
