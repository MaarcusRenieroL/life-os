package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Offer;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OfferRepository extends JpaRepository<Offer, UUID> {

  Optional<Offer> findByApplicationId(UUID applicationId);
}
