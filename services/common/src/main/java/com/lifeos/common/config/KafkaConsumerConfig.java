package com.lifeos.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.AuditEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

/**
 * Mirror of KafkaProducerConfig on the consumer side - without an explicit value-deserializer,
 * Spring Boot defaults to StringDeserializer, and @KafkaListener methods typed to
 * AuditEventRecord would never actually receive a deserialized object. ignoreTypeHeaders() forces
 * deserialization straight to AuditEventRecord regardless of what type header the producer sent,
 * so this side doesn't need spring.json.trusted.packages configured.
 *
 * <p>Named "kafkaListenerContainerFactory" so @KafkaListener uses it as the default without
 * needing a containerFactory attribute on every listener.
 */
@Configuration
public class KafkaConsumerConfig {

  @Bean
  public ConsumerFactory<String, AuditEventRecord> auditEventConsumerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<AuditEventRecord> valueDeserializer =
        new JsonDeserializer<>(AuditEventRecord.class, objectMapper).ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, AuditEventRecord>
      kafkaListenerContainerFactory(ConsumerFactory<String, AuditEventRecord> auditEventConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, AuditEventRecord> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(auditEventConsumerFactory);

    return factory;
  }
}
