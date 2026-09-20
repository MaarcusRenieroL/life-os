package com.lifeos.batches.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.BankAlertEventRecord;
import java.util.Map;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonSerializer;

/** Mirror of JobEmailEventProducerConfig, scoped to BankAlertEventRecord - see that class for why
 * each Kafka-borne record type needs its own ProducerFactory/KafkaTemplate pair. */
@Configuration
public class BankAlertEventProducerConfig {

  @Bean
  public ProducerFactory<String, BankAlertEventRecord> bankAlertEventProducerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(objectMapper));
  }

  @Bean
  public KafkaTemplate<String, BankAlertEventRecord> bankAlertEventKafkaTemplate(
      ProducerFactory<String, BankAlertEventRecord> bankAlertEventProducerFactory) {
    return new KafkaTemplate<>(bankAlertEventProducerFactory);
  }
}
