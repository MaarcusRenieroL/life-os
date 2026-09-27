package com.lifeos.job_tracker.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.JobEmailEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

/** Mirror of common's KafkaConsumerConfig, scoped to JobEmailEventRecord. common's default
 * "kafkaListenerContainerFactory" bean (also present here via component scan) is typed to
 * AuditEventRecord, so this topic needs its own named factory - referenced explicitly via
 * containerFactory on {@link com.lifeos.job_tracker.consumer.JobEmailEventConsumer}. */
@Configuration
public class JobEmailEventConsumerConfig {

  @Bean
  public ConsumerFactory<String, JobEmailEventRecord> jobEmailEventConsumerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<JobEmailEventRecord> valueDeserializer =
        new JsonDeserializer<>(JobEmailEventRecord.class, objectMapper).ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, JobEmailEventRecord>
      jobEmailEventListenerContainerFactory(
          ConsumerFactory<String, JobEmailEventRecord> jobEmailEventConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, JobEmailEventRecord> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(jobEmailEventConsumerFactory);

    return factory;
  }
}
