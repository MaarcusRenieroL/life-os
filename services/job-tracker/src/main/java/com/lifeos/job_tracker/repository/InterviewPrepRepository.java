package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.InterviewPrep;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewPrepRepository extends JpaRepository<InterviewPrep, UUID> {

  List<InterviewPrep> findAllByInterviewRoundIdOrderByCreatedAtAsc(UUID interviewRoundId);
}
