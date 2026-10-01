package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.BodyMeasurement;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BodyMeasurementRepository extends JpaRepository<BodyMeasurement, UUID> {

  List<BodyMeasurement> findAllByUserIdOrderByMeasuredOnDescCreatedAtDesc(UUID userId);

  List<BodyMeasurement> findAllByUserIdAndMeasuredOnBetweenOrderByMeasuredOnAscCreatedAtAsc(
      UUID userId, LocalDate from, LocalDate to);

  Optional<BodyMeasurement> findByIdAndUserId(UUID id, UUID userId);
}
