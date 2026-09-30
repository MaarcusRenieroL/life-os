package com.lifeos.workouts.repository;

import com.lifeos.workouts.domains.entity.PersonalRecord;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalRecordRepository extends JpaRepository<PersonalRecord, UUID> {

  List<PersonalRecord> findAllByUserIdOrderByAchievedAtDesc(UUID userId);

  List<PersonalRecord> findAllByUserIdAndExerciseId(UUID userId, UUID exerciseId);

  void deleteAllBySessionId(UUID sessionId);

  void deleteAllBySessionIdAndExerciseId(UUID sessionId, UUID exerciseId);

  long countByUserIdAndAchievedAtGreaterThanEqual(UUID userId, Instant since);
}
