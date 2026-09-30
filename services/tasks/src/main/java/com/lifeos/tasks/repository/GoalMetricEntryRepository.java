package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.GoalMetricEntry;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalMetricEntryRepository extends JpaRepository<GoalMetricEntry, UUID> {

  List<GoalMetricEntry> findAllByUserId(UUID userId);

  List<GoalMetricEntry> findAllByMetricIdOrderByRecordedOnDescCreatedAtDesc(UUID metricId);

  Optional<GoalMetricEntry> findByIdAndMetricIdAndUserId(UUID id, UUID metricId, UUID userId);
}
