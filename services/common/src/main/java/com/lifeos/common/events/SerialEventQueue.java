package com.lifeos.common.events;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Runs one consumer's events one at a time, in the order they were published, on a thread of its
 * own, so a slow handler (an email-hub model call) never blocks the code that published the event
 * and never runs alongside itself. This is what a single Kafka partition and consumer used to give
 * each topic. Events are held in memory: one still queued when the app stops is dropped, and the
 * Gmail poll re-reads whatever was not recorded.
 */
public final class SerialEventQueue {

  private static final Logger log = LoggerFactory.getLogger(SerialEventQueue.class);

  private final String name;
  private final ExecutorService executor;

  public SerialEventQueue(String name) {
    this.name = name;
    this.executor =
        Executors.newSingleThreadExecutor(
            runnable -> {
              Thread thread = new Thread(runnable, "events-" + name);
              thread.setDaemon(true);
              return thread;
            });
  }

  public void submit(Runnable handler) {
    executor.execute(
        () -> {
          try {
            handler.run();
          } catch (RuntimeException failure) {
            log.error("{} event handler failed: {}", name, failure.getMessage(), failure);
          }
        });
  }
}
