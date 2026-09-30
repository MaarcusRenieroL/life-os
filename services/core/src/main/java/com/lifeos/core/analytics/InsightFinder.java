package com.lifeos.core.analytics;

import com.lifeos.core.analytics.AnalyticsModels.Insight;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

/** Looks for relationships between the daily series the user already has - "on days you rate your
 * energy higher you log more focus time". Each candidate pair is a Pearson correlation over the
 * days where both sides have data; only pairs with enough days and a clear-enough relationship are
 * reported. These are correlations, not causes, and the wording says so. There is no sleep data in
 * the system, so energy (from journal entries) stands in as the "how rested am I" signal. */
public final class InsightFinder {

  static final int MIN_DAYS = 10;
  static final double MIN_ABS_CORRELATION = 0.3;

  private InsightFinder() {}

  /** One day with every measure that might exist that day; null where the module had nothing. */
  public record Day(Double mood, Double energy, Double tasksCompleted, Double focusMinutes, Double habitPct, Double workedOut) {}

  public static List<Insight> find(List<Day> days) {
    List<Insight> insights = new ArrayList<>();
    add(insights, days, Day::energy, Day::focusMinutes, "Energy and focus time", "higher energy", "more focus time", "lower energy", "less focus time");
    add(insights, days, Day::mood, Day::tasksCompleted, "Mood and tasks done", "a better mood", "more tasks completed", "a lower mood", "fewer tasks completed");
    add(insights, days, Day::workedOut, Day::mood, "Workouts and mood", "workout days", "a better mood", "rest days", "a lower mood");
    add(insights, days, Day::habitPct, Day::tasksCompleted, "Habits and productivity", "days you keep your habits", "more tasks completed", "days you skip habits", "fewer tasks completed");
    insights.sort((a, b) -> Double.compare(Math.abs(b.correlation()), Math.abs(a.correlation())));
    return insights;
  }

  private static void add(
      List<Insight> out,
      List<Day> days,
      Function<Day, Double> x,
      Function<Day, Double> y,
      String title,
      String xHigh,
      String yHigh,
      String xLow,
      String yLow) {
    List<Double> xs = new ArrayList<>();
    List<Double> ys = new ArrayList<>();
    for (Day day : days) {
      Double xv = x.apply(day);
      Double yv = y.apply(day);
      if (xv != null && yv != null) {
        xs.add(xv);
        ys.add(yv);
      }
    }
    if (xs.size() < MIN_DAYS) return;
    Double r = Statistics.pearson(xs, ys);
    if (r == null || Math.abs(r) < MIN_ABS_CORRELATION) return;

    String strength = Math.abs(r) >= 0.6 ? "strongly" : "moderately";
    String detail =
        r > 0
            ? String.format(Locale.ROOT, "%s tend to go with %s (%s linked, r = %.2f over %d days). That's a pattern, not proof of cause.", capitalise(xHigh), yHigh, strength, r, xs.size())
            : String.format(Locale.ROOT, "%s tend to go with %s (%s linked, r = %.2f over %d days). That's a pattern, not proof of cause.", capitalise(xHigh), yLow, strength, r, xs.size());
    out.add(new Insight(title, detail, Math.round(r * 100) / 100.0, xs.size()));
  }

  private static String capitalise(String s) {
    return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
  }
}
