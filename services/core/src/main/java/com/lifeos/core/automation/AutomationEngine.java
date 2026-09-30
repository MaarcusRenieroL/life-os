package com.lifeos.core.automation;

import com.lifeos.common.events.AutomationEventRecord;
import com.lifeos.core.analytics.AnalyticsService;
import com.lifeos.core.analytics.ModuleData;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Runs rules: matching incoming events to event rules, firing scheduled rules that are due, and
 * evaluating threshold rules. Every run - success or failure - is written to the execution log.
 * Not transactional on purpose: a run makes HTTP calls to other modules and each rule's outcome
 * should be recorded independently of the others. */
@Service
@RequiredArgsConstructor
public class AutomationEngine {

  private static final Logger log = LoggerFactory.getLogger(AutomationEngine.class);

  private final AutomationRuleRepository ruleRepository;
  private final AutomationExecutionRepository executionRepository;
  private final ActionExecutor actionExecutor;
  private final AnalyticsService analyticsService;
  private final com.lifeos.core.analytics.ModuleDataClient moduleDataClient;

  /** Runs every enabled rule of the user whose event trigger matches. */
  public int handleEvent(AutomationEventRecord event) {
    TriggerType type = RuleMatcher.triggerFor(event.event());
    int ran = 0;
    for (AutomationRule rule : ruleRepository.findAllByUserIdAndEnabledTrueAndTriggerTypeIn(event.userId(), List.of(type))) {
      if (!RuleMatcher.matches(rule, event)) continue;
      // Kafka is at-least-once: the same event redelivered must not run the rule twice.
      if (executionRepository.existsByRuleIdAndEventId(rule.getId(), event.eventId())) continue;

      Map<String, String> vars = new HashMap<>();
      vars.put("title", event.title() == null ? "" : event.title());
      vars.put("entityType", event.entityType());
      if (event.attributes() != null) event.attributes().forEach(vars::putIfAbsent);
      vars.put("date", LocalDate.now(ZoneId.of(moduleDataClient.zone())).toString());

      run(rule, new ActionExecutor.Context(event.userId(), event.entityType(), event.entityId(), vars), event.eventId(), event.entityType() + " " + event.event().name().toLowerCase() + ": " + event.title());
      ran++;
    }
    return ran;
  }

  /** Fires every scheduled rule that's due as of `now`. */
  public int sweepScheduled(ZonedDateTime now) {
    int ran = 0;
    for (AutomationRule rule : ruleRepository.findAllByEnabledTrueAndTriggerType(TriggerType.SCHEDULED)) {
      try {
        Optional<Instant> due = ScheduleEvaluator.dueRun(rule.getTriggerConfig(), rule.getLastRunAt(), now);
        if (due.isEmpty()) continue;
        run(rule, scheduleContext(rule, now.toLocalDate()), null, "Scheduled run");
        ran++;
      } catch (Exception exception) {
        log.warn("Automation schedule check failed for rule {} ({})", rule.getId(), exception.getMessage());
      }
    }
    return ran;
  }

  /** Evaluates threshold rules. A rule fires when its condition becomes true and stays quiet
   * until the condition has cleared and returned. The user's numbers are fetched once per user,
   * however many threshold rules they have. */
  public int sweepThresholds() {
    Map<UUID, List<AutomationRule>> byUser =
        ruleRepository.findAllByEnabledTrueAndTriggerType(TriggerType.THRESHOLD).stream().collect(Collectors.groupingBy(AutomationRule::getUserId));

    int ran = 0;
    for (Map.Entry<UUID, List<AutomationRule>> entry : byUser.entrySet()) {
      try {
        ThresholdEvaluator.Data data = thresholdData(entry.getKey());
        for (AutomationRule rule : entry.getValue()) {
          ThresholdEvaluator.Result result = ThresholdEvaluator.evaluate(rule.getTriggerConfig(), data);
          if (result.met() && !rule.isThresholdActive()) {
            Map<String, String> vars = new HashMap<>(scheduleContext(rule, LocalDate.now(ZoneId.of(moduleDataClient.zone()))).vars());
            vars.put("detail", result.message());
            rule.setThresholdActive(true);
            run(rule, new ActionExecutor.Context(rule.getUserId(), null, null, vars), null, result.message());
            ran++;
          } else if (!result.met() && rule.isThresholdActive()) {
            rule.setThresholdActive(false);
            ruleRepository.save(rule);
          }
        }
      } catch (Exception exception) {
        log.warn("Automation threshold check failed for user {} ({})", entry.getKey(), exception.getMessage());
      }
    }
    return ran;
  }

  /** A manual "run it now" from the rules page: executes the action with a stand-in context and
   * logs it, without touching the rule's run count, schedule or threshold state. */
  public AutomationExecution testRun(AutomationRule rule) {
    Map<String, String> vars = new HashMap<>();
    vars.put("title", "Test item");
    vars.put("entityType", rule.getTriggerConfig() == null ? "" : String.valueOf(rule.getTriggerConfig().getOrDefault("entityType", "")));
    vars.put("date", LocalDate.now(ZoneId.of(moduleDataClient.zone())).toString());
    // Actions that act on a triggering item can't run without one, and pretending otherwise would
    // change a real item - they report that clearly instead.
    ActionExecutor.Result result = actionExecutor.execute(rule.getActionType(), rule.getActionConfig(), new ActionExecutor.Context(rule.getUserId(), null, null, vars));
    return executionRepository.save(
        AutomationExecution.builder()
            .ruleId(rule.getId())
            .userId(rule.getUserId())
            .status(result.success() ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED)
            .message(result.message())
            .triggerSummary("Manual test run")
            .build());
  }

  private void run(AutomationRule rule, ActionExecutor.Context ctx, UUID eventId, String summary) {
    ActionExecutor.Result result = actionExecutor.execute(rule.getActionType(), rule.getActionConfig(), ctx);
    executionRepository.save(
        AutomationExecution.builder()
            .ruleId(rule.getId())
            .userId(rule.getUserId())
            .status(result.success() ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED)
            .message(result.message())
            .triggerSummary(summary == null ? null : summary.length() > 500 ? summary.substring(0, 500) : summary)
            .eventId(eventId)
            .build());
    rule.setLastRunAt(Instant.now());
    rule.setRunCount(rule.getRunCount() + 1);
    ruleRepository.save(rule);
  }

  private ActionExecutor.Context scheduleContext(AutomationRule rule, LocalDate today) {
    Map<String, String> vars = new HashMap<>();
    vars.put("title", rule.getName());
    vars.put("entityType", "");
    vars.put("date", today.toString());
    return new ActionExecutor.Context(rule.getUserId(), null, null, vars);
  }

  private ThresholdEvaluator.Data thresholdData(UUID userId) {
    LocalDate today = analyticsService.today();
    ModuleData.Bundle bundle = moduleDataClient.fetch(userId, today.minusDays(13), today);

    Integer habitPct = null;
    if (bundle.habits() != null) {
      int scheduled = bundle.habits().days().stream().mapToInt(ModuleData.HabitDay::scheduled).sum();
      int done = bundle.habits().days().stream().mapToInt(ModuleData.HabitDay::completed).sum();
      if (scheduled > 0) habitPct = (int) Math.round(100.0 * done / scheduled);
    }
    BigDecimal weeklySpend = null;
    if (bundle.spending() != null) {
      weeklySpend =
          bundle.spending().days().stream().filter(d -> !d.date().isBefore(today.minusDays(6))).map(ModuleData.SpendDay::spend).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    return new ThresholdEvaluator.Data(bundle.goals(), habitPct, weeklySpend, bundle.tasks() == null ? null : bundle.tasks().overdueOpen());
  }
}
