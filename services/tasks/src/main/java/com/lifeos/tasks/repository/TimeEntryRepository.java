package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.TimeEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID> {

  List<TimeEntry> findAllByUserId(UUID userId);

  Optional<TimeEntry> findByIdAndUserId(UUID id, UUID userId);

  Optional<TimeEntry> findByUserIdAndEndedAtIsNull(UUID userId);
}
