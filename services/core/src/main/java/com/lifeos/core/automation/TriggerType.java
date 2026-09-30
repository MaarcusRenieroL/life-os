package com.lifeos.core.automation;

public enum TriggerType {
  ON_CREATE,
  ON_COMPLETE,
  ON_UPDATE,
  SCHEDULED,
  THRESHOLD;

  public boolean isEvent() {
    return this == ON_CREATE || this == ON_COMPLETE || this == ON_UPDATE;
  }
}
