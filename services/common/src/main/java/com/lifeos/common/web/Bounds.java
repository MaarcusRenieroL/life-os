package com.lifeos.common.web;

/**
 * Clamps client-supplied paging and window parameters so a request such as {@code ?size=1000000000},
 * {@code ?page=-1} or {@code ?days=99999} cannot ask the database for everything or turn into a 500.
 * Out-of-range values are brought to the nearest allowed one rather than rejected.
 */
public final class Bounds {

  private Bounds() {}

  public static int clamp(int value, int min, int max) {
    return Math.max(min, Math.min(value, max));
  }

  /** A zero-based page number: never negative. */
  public static int page(int page) {
    return Math.max(0, page);
  }

  /** A page size between 1 and {@code max}. */
  public static int size(int size, int max) {
    return clamp(size, 1, max);
  }
}
