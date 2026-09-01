package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Contact;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRepository extends JpaRepository<Contact, UUID> {

  List<Contact> findAllByUserIdOrderByNameAsc(UUID userId);

  List<Contact> findAllByUserIdAndCompanyIdOrderByNameAsc(UUID userId, UUID companyId);

  Optional<Contact> findByIdAndUserId(UUID id, UUID userId);
}
