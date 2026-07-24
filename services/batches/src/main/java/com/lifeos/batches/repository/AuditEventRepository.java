package com.lifeos.batches.repository;

import com.lifeos.batches.domains.entity.AuditEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

  List<AuditEvent> findAllByUserIdOrderByOccurredAtDesc(UUID userId);
}
