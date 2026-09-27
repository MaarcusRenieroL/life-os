package com.lifeos.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.NotificationEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

/** Mirror of KafkaProducerConfig, scoped to NotificationEventRecord instead of AuditEventRecord -
 * unlike the single-producer topics elsewhere in this codebase (job-email-events,
 * bank-alert-events), ANY service can publish a notification, so this producer bean lives here in
 * common rather than in one service, same as KafkaProducerConfig itself. */
@Configuration
public class NotificationProducerConfig {

  @Bean
  public ProducerFactory<String, NotificationEventRecord> notificationEventProducerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, NotificationEventRecord> notificationEventKafkaTemplate(
      ProducerFactory<String, NotificationEventRecord> notificationEventProducerFactory) {
    return new KafkaTemplate<>(notificationEventProducerFactory);
  }
}
