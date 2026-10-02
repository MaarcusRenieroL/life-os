package com.lifeos.core.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.core.domains.entity.UserSetting;
import com.lifeos.core.repository.UserSettingRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserSettingServiceTest {

  @Mock private UserSettingRepository repository;
  @InjectMocks private UserSettingService service;

  private final UUID user = UUID.randomUUID();

  @Test
  void badModuleOrKeyNamesAndHugeValuesAreRefusedBeforeTouchingTheDatabase() {
    assertThatThrownBy(() -> service.set(user, "m".repeat(51), "key", "v")).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.set(user, "tasks", "k".repeat(101), "v")).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.set(user, "tasks", "has space", "v")).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.set(user, "tasks", "../etc", "v")).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.set(user, "tasks", "key", "x".repeat(UserSettingService.MAX_VALUE_CHARS + 1))).isInstanceOf(IllegalArgumentException.class);

    verify(repository, never()).save(any());
  }

  @Test
  void aNewSettingIsRefusedOnceTheUserHasTooMany() {
    when(repository.findByUserIdAndModuleAndKey(user, "tasks", "view")).thenReturn(Optional.empty());
    when(repository.countByUserId(user)).thenReturn((long) UserSettingService.MAX_SETTINGS_PER_USER);

    assertThatThrownBy(() -> service.set(user, "tasks", "view", "list")).isInstanceOf(IllegalArgumentException.class);
    verify(repository, never()).save(any());
  }

  @Test
  void updatingAnExistingSettingStillWorksAtTheLimit() {
    UserSetting existing = UserSetting.builder().id(UUID.randomUUID()).userId(user).module("tasks").key("view").build();
    when(repository.findByUserIdAndModuleAndKey(user, "tasks", "view")).thenReturn(Optional.of(existing));
    when(repository.save(any(UserSetting.class))).thenAnswer(i -> i.getArgument(0));

    var result = service.set(user, "tasks", "view", "board");

    assertThat(result.getValue()).isEqualTo("board");
  }
}
