package com.lifeos.tasks.domains.enums;

/** Directional: a BLOCKS link from A to B means "B can't really move until A is done"; SUPPORTS
 * from A to B means "A contributes to B". Both read naturally from either goal's detail page
 * (blocks / blocked by, supports / supported by). */
public enum GoalLinkType {
  BLOCKS,
  SUPPORTS
}
