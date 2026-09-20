package com.lifeos.finance_tracker.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.BankAlertEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

/** Mirror of job-tracker's JobEmailEventConsumerConfig, scoped to BankAlertEventRecord - common's
 * default "kafkaListenerContainerFactory" bean (also present here via component scan) is typed to
 * AuditEventRecord, so this topic needs its own named factory. */
@Configuration
public class BankAlertEventConsumerConfig {

  @Bean
  public ConsumerFactory<String, BankAlertEventRecord> bankAlertEventConsumerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<BankAlertEventRecord> valueDeserializer =
        new JsonDeserializer<>(BankAlertEventRecord.class, objectMapper).ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, BankAlertEventRecord>
      bankAlertEventListenerContainerFactory(
          ConsumerFactory<String, BankAlertEventRecord> bankAlertEventConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, BankAlertEventRecord> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(bankAlertEventConsumerFactory);

    return factory;
  }
}
