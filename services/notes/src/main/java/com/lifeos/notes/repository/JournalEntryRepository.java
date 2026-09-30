package com.lifeos.notes.repository;

import com.lifeos.notes.domains.entity.JournalEntry;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {}
