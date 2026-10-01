package com.lifeos.core.automation;

import com.lifeos.core.exception.ResourceNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AutomationRuleService {

  public record SaveRule(String name, String description, TriggerType triggerType, Map<String, Object> triggerConfig, ActionType actionType, Map<String, Object> actionConfig, Boolean enabled) {}

  private static final int MAX_RULES_PER_USER = 100;

  private final AutomationRuleRepository ruleRepository;
  private final AutomationExecutionRepository executionRepository;
  private final AutomationEngine engine;

  @Transactional(readOnly = true)
  public List<AutomationRule> list(UUID userId) {
    return ruleRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
  }

  @Transactional(readOnly = true)
  public AutomationRule get(UUID userId, UUID id) {
    return ruleRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ResourceNotFoundException.of("Automation rule", id));
  }

  @Transactional
  public AutomationRule create(UUID userId, SaveRule request) {
    if (ruleRepository.findAllByUserIdOrderByCreatedAtDesc(userId).size() >= MAX_RULES_PER_USER) {
      throw new IllegalArgumentException("You've reached the limit of " + MAX_RULES_PER_USER + " rules");
    }
    AutomationRule rule = AutomationRule.builder().userId(userId).build();
    apply(rule, request);
    // A schedule counts from creation - a rule made at 20:00 for "Sunday 18:00" must not fire
    // retroactively for the Sunday that already passed.
    rule.setLastRunAt(Instant.now());
    return ruleRepository.save(rule);
  }

  @Transactional
  public AutomationRule createFromTemplate(UUID userId, String key) {
    AutomationTemplates.Template template =
        AutomationTemplates.find(key).orElseThrow(() -> ResourceNotFoundException.of("Automation template", key));
    AutomationRule rule = create(userId, new SaveRule(template.name(), template.description(), template.triggerType(), template.triggerConfig(), template.actionType(), template.actionConfig(), true));
    rule.setTemplateKey(template.key());
    return ruleRepository.save(rule);
  }

  @Transactional
  public AutomationRule update(UUID userId, UUID id, SaveRule request) {
    AutomationRule rule = get(userId, id);
    TriggerType oldType = rule.getTriggerType();
    Map<String, Object> oldTrigger = rule.getTriggerConfig();
    apply(rule, request);
    // Changing what a rule waits for resets its state, so it's judged fresh against the new trigger.
    if (oldType != rule.getTriggerType() || !java.util.Objects.equals(oldTrigger, rule.getTriggerConfig())) {
      rule.setThresholdActive(false);
      rule.setLastRunAt(Instant.now());
    }
    return ruleRepository.save(rule);
  }

  @Transactional
  public AutomationRule setEnabled(UUID userId, UUID id, boolean enabled) {
    AutomationRule rule = get(userId, id);
    // Re-enabling starts from now - it shouldn't replay everything that came due while it was off.
    if (enabled && !rule.isEnabled()) {
      rule.setLastRunAt(Instant.now());
      rule.setThresholdActive(false);
    }
    rule.setEnabled(enabled);
    return ruleRepository.save(rule);
  }

  @Transactional
  public void delete(UUID userId, UUID id) {
    ruleRepository.delete(get(userId, id));
  }

  public AutomationExecution testRun(UUID userId, UUID id) {
    return engine.testRun(get(userId, id));
  }

  @Transactional(readOnly = true)
  public List<AutomationExecution> history(UUID userId, UUID ruleId, int limit) {
    PageRequest page = PageRequest.of(0, Math.max(1, Math.min(limit, 200)));
    if (ruleId == null) return executionRepository.findAllByUserIdOrderByExecutedAtDesc(userId, page);
    get(userId, ruleId);
    return executionRepository.findAllByRuleIdAndUserIdOrderByExecutedAtDesc(ruleId, userId, page);
  }

  private void apply(AutomationRule rule, SaveRule request) {
    if (request.name() == null || request.name().isBlank()) throw new IllegalArgumentException("Give the rule a name");
    if (request.name().trim().length() > 200) throw new IllegalArgumentException("The rule name can be at most 200 characters");
    if (request.description() != null && request.description().trim().length() > 1000) throw new IllegalArgumentException("The description can be at most 1000 characters");
    RuleValidator.validate(request.triggerType(), request.triggerConfig(), request.actionType(), request.actionConfig());
    rule.setName(request.name().trim());
    rule.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
    rule.setTriggerType(request.triggerType());
    rule.setTriggerConfig(request.triggerConfig());
    rule.setActionType(request.actionType());
    rule.setActionConfig(request.actionConfig());
    if (request.enabled() != null) rule.setEnabled(request.enabled());
  }
}
