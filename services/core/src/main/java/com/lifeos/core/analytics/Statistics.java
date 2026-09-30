package com.lifeos.core.analytics;

import java.util.List;

/** Small numeric helpers, kept apart so they can be tested against known values. */
public final class Statistics {

  private Statistics() {}

  public static double mean(List<Double> values) {
    return values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
  }

  /** Population standard deviation. */
  public static double stdDev(List<Double> values) {
    if (values.isEmpty()) return 0;
    double mean = mean(values);
    return Math.sqrt(values.stream().mapToDouble(v -> (v - mean) * (v - mean)).average().orElse(0));
  }

  /** Pearson correlation of two equal-length series, or null if it can't be computed (fewer than
   * two points, or one series is constant so has no variance to correlate). */
  public static Double pearson(List<Double> xs, List<Double> ys) {
    if (xs.size() != ys.size() || xs.size() < 2) return null;
    double mx = mean(xs);
    double my = mean(ys);
    double cov = 0;
    double vx = 0;
    double vy = 0;
    for (int i = 0; i < xs.size(); i++) {
      double dx = xs.get(i) - mx;
      double dy = ys.get(i) - my;
      cov += dx * dy;
      vx += dx * dx;
      vy += dy * dy;
    }
    if (vx == 0 || vy == 0) return null;
    return cov / Math.sqrt(vx * vy);
  }
}
