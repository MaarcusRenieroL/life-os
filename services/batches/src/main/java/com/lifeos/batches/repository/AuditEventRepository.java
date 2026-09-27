package com.lifeos.batches.repository;

import com.lifeos.batches.domains.entity.AuditEvent;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

  // audit_events is the one table in the app that grows without bound - every module publishes
  // here via Kafka - so this must stay paginated. It used to return List<AuditEvent> for the
  // whole user, which loaded the entire table on every call to the audit-log page.
  Page<AuditEvent> findAllByUserIdOrderByOccurredAtDesc(UUID userId, Pageable pageable);

  // Bulk delete rather than findAll-then-deleteAll: the purge can span a lot of rows and there's
  // no need to hydrate entities just to discard them.
  @Modifying
  @Query("delete from AuditEvent e where e.occurredAt < :cutoff")
  int deleteByOccurredAtBefore(Instant cutoff);
}
