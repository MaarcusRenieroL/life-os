package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.common.events.AutomationEventRecord;
import com.lifeos.common.events.AutomationEventRecord.Kind;
import com.lifeos.core.analytics.AnalyticsService;
import com.lifeos.core.analytics.ModuleData;
import com.lifeos.core.analytics.ModuleDataClient;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AutomationEngineTest {

  @Mock private AutomationRuleRepository ruleRepository;
  @Mock private AutomationExecutionRepository executionRepository;
  @Mock private ActionExecutor actionExecutor;
  @Mock private AnalyticsService analyticsService;
  @Mock private ModuleDataClient moduleDataClient;

  private AutomationEngine engine;
  private final UUID userId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    engine = new AutomationEngine(ruleRepository, executionRepository, actionExecutor, analyticsService, moduleDataClient);
    when(moduleDataClient.zone()).thenReturn("Asia/Kolkata");
    when(analyticsService.today()).thenReturn(LocalDate.of(2026, 9, 30));
    when(ruleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(executionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(actionExecutor.execute(any(), any(), any())).thenReturn(new ActionExecutor.Result(true, "done"));
  }

  private AutomationRule rule(TriggerType type, Map<String, Object> trigger) {
    return AutomationRule.builder()
        .id(UUID.randomUUID())
        .userId(userId)
        .name("R")
        .triggerType(type)
        .triggerConfig(trigger)
        .actionType(ActionType.CREATE_TASK)
        .actionConfig(Map.of("title", "Follow up: {{title}}"))
        .build();
  }

  private AutomationEventRecord event(Kind kind, String title, Map<String, String> attrs) {
    return new AutomationEventRecord(UUID.randomUUID(), userId, "JOB_APPLICATION", UUID.randomUUID(), kind, title, attrs, Instant.now());
  }

  @Test
  void aMatchingEventRunsTheActionWithTheItemsTitleAndAttributesAsVariablesAndLogsIt() {
    AutomationRule r = rule(TriggerType.ON_UPDATE, Map.of("entityType", "JOB_APPLICATION", "conditions", Map.of("status", "APPLIED")));
    when(ruleRepository.findAllByUserIdAndEnabledTrueAndTriggerTypeIn(eq(userId), any())).thenReturn(List.of(r));
    AutomationEventRecord e = event(Kind.UPDATED, "SWE at Acme", Map.of("status", "APPLIED", "company", "Acme"));

    assertThat(engine.handleEvent(e)).isEqualTo(1);

    ArgumentCaptor<ActionExecutor.Context> ctx = ArgumentCaptor.forClass(ActionExecutor.Context.class);
    verify(actionExecutor).execute(eq(ActionType.CREATE_TASK), any(), ctx.capture());
    assertThat(ctx.getValue().vars()).containsEntry("title", "SWE at Acme").containsEntry("status", "APPLIED").containsEntry("company", "Acme").containsKey("date");
    assertThat(ctx.getValue().entityId()).isEqualTo(e.entityId());

    ArgumentCaptor<AutomationExecution> logged = ArgumentCaptor.forClass(AutomationExecution.class);
    verify(executionRepository).save(logged.capture());
    assertThat(logged.getValue().getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
    assertThat(logged.getValue().getEventId()).isEqualTo(e.eventId());
    assertThat(r.getRunCount()).isEqualTo(1);
    assertThat(r.getLastRunAt()).isNotNull();
  }

  @Test
  void aNonMatchingEventRunsNothing() {
    AutomationRule r = rule(TriggerType.ON_UPDATE, Map.of("entityType", "JOB_APPLICATION", "conditions", Map.of("status", "APPLIED")));
    when(ruleRepository.findAllByUserIdAndEnabledTrueAndTriggerTypeIn(eq(userId), any())).thenReturn(List.of(r));

    assertThat(engine.handleEvent(event(Kind.UPDATED, "x", Map.of("status", "REJECTED")))).isZero();

    verify(actionExecutor, never()).execute(any(), any(), any());
    verify(executionRepository, never()).save(any());
  }

  @Test
  void aRedeliveredEventDoesNotRunTheRuleAgain() {
    AutomationRule r = rule(TriggerType.ON_CREATE, Map.of("entityType", "JOB_APPLICATION"));
    when(ruleRepository.findAllByUserIdAndEnabledTrueAndTriggerTypeIn(eq(userId), any())).thenReturn(List.of(r));
    AutomationEventRecord e = event(Kind.CREATED, "x", Map.of());
    when(executionRepository.existsByRuleIdAndEventId(r.getId(), e.eventId())).thenReturn(true);

    assertThat(engine.handleEvent(e)).isZero();

    verify(actionExecutor, never()).execute(any(), any(), any());
  }

  @Test
  void aFailedActionIsLoggedAsFailedAndStillCounted() {
    AutomationRule r = rule(TriggerType.ON_CREATE, Map.of("entityType", "JOB_APPLICATION"));
    when(ruleRepository.findAllByUserIdAndEnabledTrueAndTriggerTypeIn(eq(userId), any())).thenReturn(List.of(r));
    when(actionExecutor.execute(any(), any(), any())).thenReturn(new ActionExecutor.Result(false, "Failed: tasks is down"));

    engine.handleEvent(event(Kind.CREATED, "x", Map.of()));

    ArgumentCaptor<AutomationExecution> logged = ArgumentCaptor.forClass(AutomationExecution.class);
    verify(executionRepository).save(logged.capture());
    assertThat(logged.getValue().getStatus()).isEqualTo(ExecutionStatus.FAILED);
    assertThat(logged.getValue().getMessage()).contains("tasks is down");
  }

  @Test
  void aScheduledRuleThatIsDueRunsOnceAndThenNotAgainUntilItsNextSlot() {
    AutomationRule r = rule(TriggerType.SCHEDULED, Map.of("frequency", "DAILY", "time", "08:30"));
    r.setLastRunAt(Instant.parse("2026-09-29T03:00:20Z"));
    when(ruleRepository.findAllByEnabledTrueAndTriggerType(TriggerType.SCHEDULED)).thenReturn(List.of(r));
    ZonedDateTime morning = ZonedDateTime.of(2026, 9, 30, 8, 31, 0, 0, ZoneId.of("Asia/Kolkata"));

    assertThat(engine.sweepScheduled(morning)).isEqualTo(1);
    assertThat(engine.sweepScheduled(morning.plusMinutes(1))).isZero();
    assertThat(r.getRunCount()).isEqualTo(1);
  }

  @Test
  void aDisabledOrNotYetDueScheduledRuleDoesNothing() {
    AutomationRule r = rule(TriggerType.SCHEDULED, Map.of("frequency", "DAILY", "time", "08:30"));
    r.setLastRunAt(Instant.now());
    when(ruleRepository.findAllByEnabledTrueAndTriggerType(TriggerType.SCHEDULED)).thenReturn(List.of(r));

    assertThat(engine.sweepScheduled(ZonedDateTime.now(ZoneId.of("Asia/Kolkata")))).isZero();
  }

  private ModuleData.Bundle bundleWithOverdue(int overdue) {
    return new ModuleData.Bundle(new ModuleData.TaskStats(List.of(), overdue, overdue, 0), null, null, null, null, null, List.of(), List.of());
  }

  @Test
  void aThresholdRuleFiresWhenTheConditionBecomesTrueThenStaysQuietUntilItClearsAndReturns() {
    AutomationRule r = rule(TriggerType.THRESHOLD, Map.of("metric", "OVERDUE_TASKS_ABOVE", "value", 5));
    when(ruleRepository.findAllByEnabledTrueAndTriggerType(TriggerType.THRESHOLD)).thenReturn(List.of(r));

    when(moduleDataClient.fetch(eq(userId), any(), any())).thenReturn(bundleWithOverdue(8));
    assertThat(engine.sweepThresholds()).isEqualTo(1);
    assertThat(r.isThresholdActive()).isTrue();

    // Still over the line half an hour later: no second notification.
    assertThat(engine.sweepThresholds()).isZero();

    // Cleared - re-arms without firing.
    when(moduleDataClient.fetch(eq(userId), any(), any())).thenReturn(bundleWithOverdue(2));
    assertThat(engine.sweepThresholds()).isZero();
    assertThat(r.isThresholdActive()).isFalse();

    // Comes back - fires again.
    when(moduleDataClient.fetch(eq(userId), any(), any())).thenReturn(bundleWithOverdue(9));
    assertThat(engine.sweepThresholds()).isEqualTo(1);
    verify(actionExecutor, org.mockito.Mockito.times(2)).execute(any(), any(), any());
  }

  @Test
  void thresholdDataIsFetchedOncePerUserNoMatterHowManyRules() {
    AutomationRule a = rule(TriggerType.THRESHOLD, Map.of("metric", "OVERDUE_TASKS_ABOVE", "value", 5));
    AutomationRule b = rule(TriggerType.THRESHOLD, Map.of("metric", "OVERDUE_TASKS_ABOVE", "value", 20));
    when(ruleRepository.findAllByEnabledTrueAndTriggerType(TriggerType.THRESHOLD)).thenReturn(List.of(a, b));
    when(moduleDataClient.fetch(eq(userId), any(), any())).thenReturn(bundleWithOverdue(8));

    engine.sweepThresholds();

    verify(moduleDataClient, org.mockito.Mockito.times(1)).fetch(eq(userId), any(), any());
  }

  @Test
  void aTestRunLogsTheOutcomeWithoutTouchingTheRulesRunState() {
    AutomationRule r = rule(TriggerType.THRESHOLD, Map.of("metric", "OVERDUE_TASKS_ABOVE", "value", 5));

    AutomationExecution execution = engine.testRun(r);

    assertThat(execution.getTriggerSummary()).isEqualTo("Manual test run");
    assertThat(execution.getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
    assertThat(r.getRunCount()).isZero();
    assertThat(r.getLastRunAt()).isNull();
    assertThat(r.isThresholdActive()).isFalse();
  }
}
