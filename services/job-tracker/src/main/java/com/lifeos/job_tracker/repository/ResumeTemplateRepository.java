package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ResumeTemplate;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResumeTemplateRepository extends JpaRepository<ResumeTemplate, UUID> {}
