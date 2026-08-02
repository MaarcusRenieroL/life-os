package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Application;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {}
