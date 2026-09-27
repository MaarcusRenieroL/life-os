package com.lifeos.batches.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.JobEmailEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

/** Mirror of common's KafkaProducerConfig, scoped to JobEmailEventRecord instead of
 * AuditEventRecord - that bean is typed to a different payload, so this topic needs its own
 * ProducerFactory/KafkaTemplate pair rather than reusing it. Same reasoning as there: the
 * JsonSerializer needs an ObjectMapper with JavaTimeModule registered, which Kafka's
 * reflection-based no-arg construction of the configured serializer class wouldn't otherwise
 * have. */
@Configuration
public class JobEmailEventProducerConfig {

  @Bean
  public ProducerFactory<String, JobEmailEventRecord> jobEmailEventProducerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, JobEmailEventRecord> jobEmailEventKafkaTemplate(
      ProducerFactory<String, JobEmailEventRecord> jobEmailEventProducerFactory) {
    return new KafkaTemplate<>(jobEmailEventProducerFactory);
  }
}
