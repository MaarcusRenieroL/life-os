package com.lifeos.batches.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.EmailHubEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

/** Same shape as {@link JobEmailEventProducerConfig}, scoped to the email hub's payload. */
@Configuration
public class EmailHubEventProducerConfig {

  @Bean
  public ProducerFactory<String, EmailHubEventRecord> emailHubEventProducerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, EmailHubEventRecord> emailHubEventKafkaTemplate(
      ProducerFactory<String, EmailHubEventRecord> emailHubEventProducerFactory) {
    return new KafkaTemplate<>(emailHubEventProducerFactory);
  }
}
