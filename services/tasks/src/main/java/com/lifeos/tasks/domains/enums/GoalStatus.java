package com.lifeos.tasks.domains.enums;

/** ACTIVE/ON_TRACK/AT_RISK are the "in flight" states - GoalService derives ON_TRACK vs AT_RISK
 * from progress vs elapsed time (see GoalProgressCalculator), so those three are effectively one
 * state the user doesn't pick by hand. PAUSED, COMPLETED and ARCHIVED are explicit user choices
 * that auto-status never overrides. */
public enum GoalStatus {
  ACTIVE,
  ON_TRACK,
  AT_RISK,
  PAUSED,
  COMPLETED,
  ARCHIVED;

  public boolean isInFlight() {
    return this == ACTIVE || this == ON_TRACK || this == AT_RISK;
  }
}
