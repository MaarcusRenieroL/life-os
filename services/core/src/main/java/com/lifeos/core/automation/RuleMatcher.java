package com.lifeos.core.automation;

import com.lifeos.common.events.AutomationEventRecord;
import java.util.Locale;
import java.util.Map;

/** Decides whether an incoming event is one a rule's event trigger is waiting for. */
public final class RuleMatcher {

  private RuleMatcher() {}

  public static TriggerType triggerFor(AutomationEventRecord.Kind kind) {
    return switch (kind) {
      case CREATED -> TriggerType.ON_CREATE;
      case COMPLETED -> TriggerType.ON_COMPLETE;
      case UPDATED -> TriggerType.ON_UPDATE;
    };
  }

  /** True when the rule's trigger is the event's kind, on the event's entity type, and every
   * condition holds. Conditions are field: value pairs compared case-insensitively against the
   * event's attributes ("status": "APPLIED"); the special key titleContains matches a fragment of
   * the item's title. A condition on a field the event doesn't carry never matches. */
  public static boolean matches(AutomationRule rule, AutomationEventRecord event) {
    if (rule.getTriggerType() != triggerFor(event.event())) return false;
    Map<String, Object> config = rule.getTriggerConfig();
    if (config == null || !event.entityType().equalsIgnoreCase(String.valueOf(config.get("entityType")))) return false;

    Object conditions = config.get("conditions");
    if (!(conditions instanceof Map<?, ?> map)) return true;
    for (Map.Entry<?, ?> condition : map.entrySet()) {
      String key = String.valueOf(condition.getKey());
      String expected = String.valueOf(condition.getValue());
      if (expected.isBlank()) continue;
      if (key.equals("titleContains")) {
        if (event.title() == null || !event.title().toLowerCase(Locale.ROOT).contains(expected.toLowerCase(Locale.ROOT))) return false;
        continue;
      }
      String actual = event.attributes() == null ? null : event.attributes().get(key);
      if (actual == null || !actual.equalsIgnoreCase(expected)) return false;
    }
    return true;
  }
}
