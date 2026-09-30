package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.Task;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {

  List<Task> findAllByUserId(UUID userId);

  Optional<Task> findByIdAndUserId(UUID id, UUID userId);

  List<Task> findAllByParentTaskId(UUID parentTaskId);

  List<Task> findAllByRecurringParentId(UUID recurringParentId);

  List<Task> findAllByRecurrencePatternIsNotNullAndRecurringParentIdIsNull();

  List<Task> findAllByDueDateIsNotNullAndDueTimeIsNotNullAndReminderMinutesBeforeIsNotNull();
}
