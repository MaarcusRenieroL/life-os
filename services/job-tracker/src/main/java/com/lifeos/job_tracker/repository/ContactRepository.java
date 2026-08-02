package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.Contact;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRepository extends JpaRepository<Contact, UUID> {}
