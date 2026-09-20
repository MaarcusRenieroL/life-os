package com.lifeos.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.NotificationEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

/** Mirror of the other per-topic consumer configs in this codebase (see job-tracker's
 * JobEmailEventConsumerConfig) - common's default "kafkaListenerContainerFactory" bean is typed
 * to AuditEventRecord, so notification-events needs its own named factory. core is the sole
 * consumer of this topic even though any service can publish to it. */
@Configuration
public class NotificationConsumerConfig {

  @Bean
  public ConsumerFactory<String, NotificationEventRecord> notificationEventConsumerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<NotificationEventRecord> valueDeserializer =
        new JsonDeserializer<>(NotificationEventRecord.class, objectMapper).ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, NotificationEventRecord>
      notificationEventListenerContainerFactory(
          ConsumerFactory<String, NotificationEventRecord> notificationEventConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, NotificationEventRecord> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(notificationEventConsumerFactory);

    return factory;
  }
}
