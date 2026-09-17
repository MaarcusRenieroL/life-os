package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Company;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

  List<Company> findAllByUserIdOrderByNameAsc(UUID userId);

  Optional<Company> findByIdAndUserId(UUID id, UUID userId);

  Optional<Company> findByUserIdAndNameIgnoreCase(UUID userId, String name);
}
