package com.lifeos.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.AuditEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

/**
 * Kafka's client instantiates the producer's value serializer via reflection from the
 * spring.kafka.producer.value-serializer property, using a bare no-arg constructor - it never
 * sees Spring Boot's autoconfigured ObjectMapper (the one with JavaTimeModule already
 * registered). Without this, JsonSerializer's own bare ObjectMapper throws on any
 * AuditEventRecord, since occurredAt is an Instant.
 */
@Configuration
public class KafkaProducerConfig {

  @Bean
  public ProducerFactory<String, AuditEventRecord> auditEventProducerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, AuditEventRecord> kafkaTemplate(
      ProducerFactory<String, AuditEventRecord> auditEventProducerFactory) {
    return new KafkaTemplate<>(auditEventProducerFactory);
  }
}
