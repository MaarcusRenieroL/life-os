package com.lifeos.core.automation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.AutomationEventRecord;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.stereotype.Component;

/** Consumes the automation-events topic and hands each event to the engine. core is the sole
 * consumer; any module can publish. A failure running rules is logged and swallowed - retrying a
 * poison event forever would only block everyone else's automation. */
@Component
@RequiredArgsConstructor
public class AutomationEventConsumer {

  private static final Logger log = LoggerFactory.getLogger(AutomationEventConsumer.class);

  private final AutomationEngine engine;

  @KafkaListener(topics = "automation-events", groupId = "core-automation", containerFactory = "automationEventListenerContainerFactory")
  public void listen(AutomationEventRecord event) {
    try {
      engine.handleEvent(event);
    } catch (Exception exception) {
      log.warn("Automation event {} could not be processed ({})", event.eventId(), exception.getMessage());
    }
  }

  /** Same shape as NotificationConsumerConfig - common's default factory is typed to audit events,
   * so this topic needs its own. */
  @Configuration
  static class Config {

    @Bean
    public ConsumerFactory<String, AutomationEventRecord> automationEventConsumerFactory(KafkaProperties kafkaProperties) {
      Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
      ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
      JsonDeserializer<AutomationEventRecord> value = new JsonDeserializer<>(AutomationEventRecord.class, objectMapper).ignoreTypeHeaders();
      return new DefaultKafkaConsumerFactory<>(properties, new StringDeserializer(), value);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, AutomationEventRecord> automationEventListenerContainerFactory(
        ConsumerFactory<String, AutomationEventRecord> automationEventConsumerFactory) {
      ConcurrentKafkaListenerContainerFactory<String, AutomationEventRecord> factory = new ConcurrentKafkaListenerContainerFactory<>();
      factory.setConsumerFactory(automationEventConsumerFactory);
      return factory;
    }
  }
}
