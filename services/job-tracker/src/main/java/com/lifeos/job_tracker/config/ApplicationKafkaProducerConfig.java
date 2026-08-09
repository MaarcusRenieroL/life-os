package com.lifeos.job_tracker.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.record.ApplicationStageChangedEvent;
import com.lifeos.job_tracker.events.ApplicationAppliedEvent;
import java.util.Map;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

// common's own KafkaProducerConfig defines a bean literally named "kafkaTemplate" (typed to
// AuditEventRecord), and since job-tracker's @ComponentScan reaches com.lifeos.common for the
// security filters, that bean's name blocks Spring Boot's own general-purpose KafkaTemplate
// autoconfiguration from being created too. This defines job-tracker's own uniquely-named
// producer factory + template for ApplicationAppliedEvent instead of relying on either.
@Configuration
public class ApplicationKafkaProducerConfig {

  @Bean
  public ProducerFactory<String, ApplicationAppliedEvent> applicationAppliedProducerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, ApplicationAppliedEvent> applicationAppliedKafkaTemplate(
      ProducerFactory<String, ApplicationAppliedEvent> applicationAppliedProducerFactory) {
    return new KafkaTemplate<>(applicationAppliedProducerFactory);
  }

  @Bean
  public ProducerFactory<String, ApplicationStageChangedEvent>
      applicationStageChangedProducerFactory(KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, ApplicationStageChangedEvent> applicationStageChangedKafkaTemplate(
      ProducerFactory<String, ApplicationStageChangedEvent>
          applicationStageChangedProducerFactory) {
    return new KafkaTemplate<>(applicationStageChangedProducerFactory);
  }
}
