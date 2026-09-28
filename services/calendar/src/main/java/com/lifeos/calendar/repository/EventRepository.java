package com.lifeos.calendar.repository;

import com.lifeos.calendar.domains.entity.Event;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

  List<Event> findAllByUserId(UUID userId);

  Optional<Event> findByIdAndUserId(UUID id, UUID userId);
}
