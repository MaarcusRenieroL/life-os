package com.lifeos.core.automation;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.common.events.AutomationEventRecord;
import com.lifeos.common.events.AutomationEventRecord.Kind;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RuleMatcherTest {

  private AutomationRule rule(TriggerType type, Map<String, Object> config) {
    return AutomationRule.builder().triggerType(type).triggerConfig(config).build();
  }

  private AutomationEventRecord event(String entity, Kind kind, String title, Map<String, String> attrs) {
    return new AutomationEventRecord(UUID.randomUUID(), UUID.randomUUID(), entity, UUID.randomUUID(), kind, title, attrs, Instant.now());
  }

  @Test
  void kindsMapToTheirTriggerTypes() {
    assertThat(RuleMatcher.triggerFor(Kind.CREATED)).isEqualTo(TriggerType.ON_CREATE);
    assertThat(RuleMatcher.triggerFor(Kind.COMPLETED)).isEqualTo(TriggerType.ON_COMPLETE);
    assertThat(RuleMatcher.triggerFor(Kind.UPDATED)).isEqualTo(TriggerType.ON_UPDATE);
  }

  @Test
  void matchesOnKindAndEntityType() {
    AutomationRule r = rule(TriggerType.ON_CREATE, Map.of("entityType", "TASK"));

    assertThat(RuleMatcher.matches(r, event("TASK", Kind.CREATED, "x", Map.of()))).isTrue();
    assertThat(RuleMatcher.matches(r, event("TASK", Kind.COMPLETED, "x", Map.of()))).isFalse();
    assertThat(RuleMatcher.matches(r, event("GOAL", Kind.CREATED, "x", Map.of()))).isFalse();
  }

  @Test
  void entityTypeIsComparedCaseInsensitively() {
    assertThat(RuleMatcher.matches(rule(TriggerType.ON_CREATE, Map.of("entityType", "task")), event("TASK", Kind.CREATED, "x", Map.of()))).isTrue();
  }

  @Test
  void everyConditionMustHoldCaseInsensitively() {
    AutomationRule r = rule(TriggerType.ON_UPDATE, Map.of("entityType", "JOB_APPLICATION", "conditions", Map.of("status", "applied", "company", "Acme")));

    assertThat(RuleMatcher.matches(r, event("JOB_APPLICATION", Kind.UPDATED, "x", Map.of("status", "APPLIED", "company", "acme")))).isTrue();
    assertThat(RuleMatcher.matches(r, event("JOB_APPLICATION", Kind.UPDATED, "x", Map.of("status", "APPLIED", "company", "Other")))).isFalse();
    assertThat(RuleMatcher.matches(r, event("JOB_APPLICATION", Kind.UPDATED, "x", Map.of("status", "APPLIED")))).isFalse();
  }

  @Test
  void aConditionOnAFieldTheEventDoesntCarryNeverMatches() {
    AutomationRule r = rule(TriggerType.ON_CREATE, Map.of("entityType", "TASK", "conditions", Map.of("priority", "URGENT")));

    assertThat(RuleMatcher.matches(r, event("TASK", Kind.CREATED, "x", null))).isFalse();
  }

  @Test
  void titleContainsMatchesAFragmentIgnoringCase() {
    AutomationRule r = rule(TriggerType.ON_CREATE, Map.of("entityType", "TASK", "conditions", Map.of("titleContains", "invoice")));

    assertThat(RuleMatcher.matches(r, event("TASK", Kind.CREATED, "Send INVOICE to client", Map.of()))).isTrue();
    assertThat(RuleMatcher.matches(r, event("TASK", Kind.CREATED, "Buy milk", Map.of()))).isFalse();
    assertThat(RuleMatcher.matches(r, event("TASK", Kind.CREATED, null, Map.of()))).isFalse();
  }

  @Test
  void aBlankConditionValueIsIgnored() {
    assertThat(RuleMatcher.matches(rule(TriggerType.ON_CREATE, Map.of("entityType", "TASK", "conditions", Map.of("priority", ""))), event("TASK", Kind.CREATED, "x", Map.of()))).isTrue();
  }

  @Test
  void aRuleWithNoTriggerConfigNeverMatches() {
    assertThat(RuleMatcher.matches(rule(TriggerType.ON_CREATE, null), event("TASK", Kind.CREATED, "x", Map.of()))).isFalse();
  }
}
