package com.lifeos.core.automation;

import com.lifeos.common.events.AfterCommit;
import com.lifeos.common.events.AutomationEventRecord;
import com.lifeos.common.events.SerialEventQueue;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Consumes automation events and hands each event to the engine. core is the sole
 * consumer; any module can publish. A failure running rules is logged and swallowed - retrying a
 * poison event forever would only block everyone else's automation. */
@Component
@RequiredArgsConstructor
public class AutomationEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(AutomationEventConsumer.class);

  private final AutomationEngine engine;

  private final SerialEventQueue queue = new SerialEventQueue("automation");

  @AfterCommit
  public void listen(AutomationEventRecord event) {
    queue.submit(
        () -> {
          try {
            engine.handleEvent(event);
          } catch (Exception exception) {
            log.warn("Automation event {} could not be processed ({})", event.eventId(), exception.getMessage());
          }
        });
  }
}
