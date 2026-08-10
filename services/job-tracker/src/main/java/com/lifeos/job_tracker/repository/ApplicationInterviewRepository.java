package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ApplicationInterview;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationInterviewRepository extends JpaRepository<ApplicationInterview, UUID> {

  List<ApplicationInterview> findAllByApplicationIdOrderByRoundAsc(UUID applicationId);

  Optional<ApplicationInterview> findByIdAndApplicationId(UUID id, UUID applicationId);
}
