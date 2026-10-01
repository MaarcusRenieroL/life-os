package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.CareerProfile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerProfileRepository extends JpaRepository<CareerProfile, UUID> {}
