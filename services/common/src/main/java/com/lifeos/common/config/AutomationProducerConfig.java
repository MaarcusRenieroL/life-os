package com.lifeos.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.AutomationEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

/** Mirror of NotificationProducerConfig for the automation-events topic - any module may publish
 * one, so the producer lives here in common. */
@Configuration
public class AutomationProducerConfig {

  @Bean
  public ProducerFactory<String, AutomationEventRecord> automationEventProducerFactory(KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    return new DefaultKafkaProducerFactory<>(properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, AutomationEventRecord> automationEventKafkaTemplate(
      ProducerFactory<String, AutomationEventRecord> automationEventProducerFactory) {
    return new KafkaTemplate<>(automationEventProducerFactory);
  }
}
