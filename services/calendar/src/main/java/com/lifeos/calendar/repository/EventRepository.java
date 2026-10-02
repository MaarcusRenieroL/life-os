package com.lifeos.calendar.repository;

import com.lifeos.calendar.domains.entity.Event;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

  List<Event> findAllByUserId(UUID userId);

  @Modifying
  @Query("update Event e set e.goalId = null where e.userId = :userId and e.goalId = :goalId")
  int clearGoal(@Param("userId") UUID userId, @Param("goalId") UUID goalId);

  @Modifying
  @Query("update Event e set e.sourceTaskId = null where e.userId = :userId and e.sourceTaskId = :taskId")
  int clearSourceTask(@Param("userId") UUID userId, @Param("taskId") UUID taskId);

  Optional<Event> findByIdAndUserId(UUID id, UUID userId);

  List<Event> findAllByRecurringParentId(UUID recurringParentId);

  List<Event> findAllByRecurrencePatternIsNotNullAndRecurringParentIdIsNull();

  List<Event> findAllByStartAtIsNotNullAndReminderMinutesBeforeIsNotNull();
}
