package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.ApplicationContactLink;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationContactLinkRepository
    extends JpaRepository<ApplicationContactLink, UUID> {}
