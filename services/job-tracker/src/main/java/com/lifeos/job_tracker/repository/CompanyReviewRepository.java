package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.CompanyReview;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyReviewRepository extends JpaRepository<CompanyReview, UUID> {}
