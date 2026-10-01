package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.DiscoveryPreferences;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscoveryPreferencesRepository extends JpaRepository<DiscoveryPreferences, UUID> {}
