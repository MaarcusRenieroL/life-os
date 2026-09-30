package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.lifeos.core.automation.AutomationRuleService.SaveRule;
import com.lifeos.core.exception.ResourceNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AutomationRuleServiceTest {

  @Mock private AutomationRuleRepository ruleRepository;
  @Mock private AutomationExecutionRepository executionRepository;
  @Mock private AutomationEngine engine;

  private AutomationRuleService service;
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new AutomationRuleService(ruleRepository, executionRepository, engine);
    when(ruleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(ruleRepository.findAllByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of());
  }

  private SaveRule valid() {
    return new SaveRule(" Notify me ", "  ", TriggerType.ON_CREATE, Map.of("entityType", "TASK"), ActionType.SEND_NOTIFICATION, Map.of("title", "Hi"), null);
  }

  private AutomationRule stored(boolean enabled) {
    AutomationRule r = AutomationRule.builder().id(UUID.randomUUID()).userId(userId).name("R").enabled(enabled).triggerType(TriggerType.ON_CREATE).triggerConfig(Map.of("entityType", "TASK")).actionType(ActionType.SEND_NOTIFICATION).actionConfig(Map.of("title", "Hi")).build();
    when(ruleRepository.findByIdAndUserId(r.getId(), userId)).thenReturn(Optional.of(r));
    return r;
  }

  @Test
  void createTrimsFieldsDefaultsToEnabledAndStartsTheClockAtCreation() {
    AutomationRule created = service.create(userId, valid());

    assertThat(created.getName()).isEqualTo("Notify me");
    assertThat(created.getDescription()).isNull();
    assertThat(created.isEnabled()).isTrue();
    assertThat(created.getLastRunAt()).isNotNull();
  }

  @Test
  void createRejectsAnInvalidRuleOrABlankName() {
    assertThatThrownBy(() -> service.create(userId, new SaveRule("x", null, TriggerType.THRESHOLD, Map.of(), ActionType.SEND_NOTIFICATION, Map.of("title", "t"), null))).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> service.create(userId, new SaveRule("  ", null, TriggerType.ON_CREATE, Map.of("entityType", "TASK"), ActionType.SEND_NOTIFICATION, Map.of("title", "t"), null))).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void aUserCantExceedTheRuleLimit() {
    when(ruleRepository.findAllByUserIdOrderByCreatedAtDesc(userId)).thenReturn(java.util.Collections.nCopies(100, mock(AutomationRule.class)));

    assertThatThrownBy(() -> service.create(userId, valid())).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("limit");
  }

  @Test
  void aTemplateBecomesTheUsersOwnRuleRememberingWhereItCameFrom() {
    AutomationRule created = service.createFromTemplate(userId, "weekly-review");

    assertThat(created.getTemplateKey()).isEqualTo("weekly-review");
    assertThat(created.getTriggerType()).isEqualTo(TriggerType.SCHEDULED);
    assertThat(created.getActionType()).isEqualTo(ActionType.GENERATE_REPORT);
  }

  @Test
  void anUnknownTemplateIsNotFound() {
    assertThatThrownBy(() -> service.createFromTemplate(userId, "nope")).isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void changingTheTriggerResetsThresholdStateButAPlainRenameDoesNot() {
    AutomationRule r = stored(true);
    r.setThresholdActive(true);

    service.update(userId, r.getId(), new SaveRule("Renamed", null, TriggerType.ON_CREATE, Map.of("entityType", "TASK"), ActionType.SEND_NOTIFICATION, Map.of("title", "Hi"), null));
    assertThat(r.isThresholdActive()).isTrue();

    service.update(userId, r.getId(), new SaveRule("Renamed", null, TriggerType.ON_COMPLETE, Map.of("entityType", "TASK"), ActionType.SEND_NOTIFICATION, Map.of("title", "Hi"), null));
    assertThat(r.isThresholdActive()).isFalse();
  }

  @Test
  void reEnablingARuleStartsFromNowSoItDoesntReplayWhatCameDueWhileOff() {
    AutomationRule r = stored(false);
    r.setLastRunAt(Instant.parse("2026-01-01T00:00:00Z"));

    service.setEnabled(userId, r.getId(), true);

    assertThat(r.isEnabled()).isTrue();
    assertThat(r.getLastRunAt()).isAfter(Instant.parse("2026-09-01T00:00:00Z"));
  }

  @Test
  void anotherUsersRuleIsNotFound() {
    UUID id = UUID.randomUUID();
    when(ruleRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(userId, id)).isInstanceOf(ResourceNotFoundException.class);
    assertThatThrownBy(() -> service.delete(userId, id)).isInstanceOf(ResourceNotFoundException.class);
    assertThatThrownBy(() -> service.history(userId, id, 10)).isInstanceOf(ResourceNotFoundException.class);
  }
}
