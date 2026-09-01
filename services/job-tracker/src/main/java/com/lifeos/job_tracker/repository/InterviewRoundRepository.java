package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.InterviewRound;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRoundRepository extends JpaRepository<InterviewRound, UUID> {

  List<InterviewRound> findAllByApplicationIdOrderByScheduledDateAsc(UUID applicationId);

  Optional<InterviewRound> findByIdAndApplicationId(UUID id, UUID applicationId);
}
