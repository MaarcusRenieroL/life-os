package com.lifeos.tasks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.lifeos.tasks.domains.dto.request.UpdateTaskRequest;
import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.entity.Project;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.GoalRepository;
import com.lifeos.tasks.repository.ProjectRepository;
import com.lifeos.tasks.repository.TaskRepository;
import com.lifeos.tasks.service.TaskService;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

  @Mock private TaskRepository taskRepository;
  @Mock private ProjectRepository projectRepository;
  @Mock private GoalRepository goalRepository;
  @InjectMocks private TaskService taskService;

  private final UUID user = UUID.randomUUID();
  private final JsonMapper json = JsonMapper.builder().build();
  private Task task;

  @BeforeEach
  void setUp() {
    task = Task.builder().id(UUID.randomUUID()).userId(user).title("Write report").dueDate(LocalDate.of(2026, 10, 5)).projectId(UUID.randomUUID()).build();
    lenient().when(taskRepository.findByIdAndUserId(task.getId(), user)).thenReturn(Optional.of(task));
    lenient().when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));
  }

  private UpdateTaskRequest body(String jsonText) throws Exception {
    return json.readValue(jsonText, UpdateTaskRequest.class);
  }

  @Test
  void aNullThatIsInTheRequestClearsTheFieldButAMissingKeyLeavesItAlone() throws Exception {
    taskService.update(user, task.getId(), body("{\"dueDate\": null, \"projectId\": null}"));

    assertThat(task.getDueDate()).isNull();
    assertThat(task.getProjectId()).isNull();
    assertThat(task.getTitle()).isEqualTo("Write report");
  }

  @Test
  void aPartialUpdateWithoutThoseKeysChangesNothingElse() throws Exception {
    LocalDate due = task.getDueDate();
    UUID project = task.getProjectId();

    taskService.update(user, task.getId(), body("{\"status\": \"DONE\"}"));

    assertThat(task.getDueDate()).isEqualTo(due);
    assertThat(task.getProjectId()).isEqualTo(project);
  }

  @Test
  void pointingAtAProjectOrGoalThatIsNotTheUsersIsRefused() throws Exception {
    UUID foreignProject = UUID.randomUUID();
    when(projectRepository.findByIdAndUserId(foreignProject, user)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> taskService.update(user, task.getId(), body("{\"projectId\": \"" + foreignProject + "\"}")))
        .isInstanceOf(ResourceNotFoundException.class);

    UUID foreignGoal = UUID.randomUUID();
    when(goalRepository.findByIdAndUserId(foreignGoal, user)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> taskService.update(user, task.getId(), body("{\"goalId\": \"" + foreignGoal + "\"}")))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void aTaskCannotBeItsOwnParentOrAParentOfItsAncestor() throws Exception {
    assertThatThrownBy(() -> taskService.update(user, task.getId(), body("{\"parentTaskId\": \"" + task.getId() + "\"}")))
        .isInstanceOf(IllegalArgumentException.class);

    Task child = Task.builder().id(UUID.randomUUID()).userId(user).title("child").parentTaskId(task.getId()).build();
    when(taskRepository.findByIdAndUserId(child.getId(), user)).thenReturn(Optional.of(child));

    assertThatThrownBy(() -> taskService.update(user, task.getId(), body("{\"parentTaskId\": \"" + child.getId() + "\"}")))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void aBlankTitleIsRefused() throws Exception {
    assertThatThrownBy(() -> taskService.update(user, task.getId(), body("{\"title\": \"   \"}"))).isInstanceOf(IllegalArgumentException.class);
  }
}
