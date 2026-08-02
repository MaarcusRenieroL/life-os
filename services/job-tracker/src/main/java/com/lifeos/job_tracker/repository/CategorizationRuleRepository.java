package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.CategorizationRule;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategorizationRuleRepository extends JpaRepository<CategorizationRule, UUID> {}
