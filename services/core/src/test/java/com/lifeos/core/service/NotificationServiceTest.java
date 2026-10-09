package com.lifeos.core.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.core.domains.entity.Notification;
import com.lifeos.core.exception.ResourceNotFoundException;
import com.lifeos.core.repository.NotificationRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

  @Mock private NotificationRepository repository;
  @InjectMocks private NotificationService service;

  private final UUID user = UUID.randomUUID();
  private final UUID id = UUID.randomUUID();

  @Test
  void deletingYourOwnNotificationRemovesIt() {
    Notification notification = new Notification();
    when(repository.findByIdAndUserId(id, user)).thenReturn(Optional.of(notification));

    service.delete(user, id);

    verify(repository).delete(notification);
  }

  @Test
  void deletingSomeoneElsesOrAMissingNotificationFailsAndDeletesNothing() {
    when(repository.findByIdAndUserId(id, user)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.delete(user, id)).isInstanceOf(ResourceNotFoundException.class);
    verify(repository, never()).delete(org.mockito.ArgumentMatchers.any(Notification.class));
  }

  @Test
  void clearingReportsHowManyWentAndLeavesUnansweredApprovalsToTheQuery() {
    when(repository.deleteAnsweredForUser(user)).thenReturn(3);
    when(repository.deleteReadForUser(user)).thenReturn(1);

    assertThat(service.clearAll(user)).isEqualTo(3);
    assertThat(service.clearRead(user)).isEqualTo(1);
  }
}
