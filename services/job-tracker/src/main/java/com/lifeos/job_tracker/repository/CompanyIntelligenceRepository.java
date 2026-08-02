package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.CompanyIntelligence;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyIntelligenceRepository extends JpaRepository<CompanyIntelligence, UUID> {}
