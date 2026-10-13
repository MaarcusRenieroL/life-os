package com.lifeos.common.events;

import java.util.Optional;

/**
 * All modules now run in one JVM, so {@code spring.application.name} no longer says which module
 * raised an event. Audit and notification rows keep the per-module label ("finance-tracker",
 * "habit-tracker", ...) that the inbox, deep links and filters key off, so the publisher derives it
 * from the calling code's package ({@code com.lifeos.finance_tracker...} becomes "finance-tracker").
 */
final class ModuleNames {

  private static final String ROOT = "com.lifeos.";
  private static final String FALLBACK = "app";
  private static final StackWalker WALKER = StackWalker.getInstance();

  private ModuleNames() {}

  static String caller() {
    Optional<String> module =
        WALKER.walk(
            frames ->
                frames
                    .map(frame -> frame.getClassName())
                    .filter(name -> name.startsWith(ROOT) && !name.startsWith(ROOT + "common."))
                    .findFirst()
                    .map(ModuleNames::moduleOf));
    return module.orElse(FALLBACK);
  }

  static String moduleOf(String className) {
    String rest = className.substring(ROOT.length());
    int dot = rest.indexOf('.');
    String segment = dot < 0 ? rest : rest.substring(0, dot);
    return segment.replace('_', '-');
  }
}
