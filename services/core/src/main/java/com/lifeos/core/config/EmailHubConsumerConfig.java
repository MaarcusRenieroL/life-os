package com.lifeos.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.common.events.EmailHubEventRecord;
import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

/** Same shape as {@link NotificationConsumerConfig}, scoped to the email hub's payload. */
@Configuration
public class EmailHubConsumerConfig {

  @Bean
  public ConsumerFactory<String, EmailHubEventRecord> emailHubEventConsumerFactory(KafkaProperties kafkaProperties) {
    Map<String, Object> properties = new HashMap<>(kafkaProperties.buildConsumerProperties());
    // Each email is a slow model call, so take a few at a time. Fetching the default 500 would
    // blow past the poll deadline and get the consumer kicked out of its group mid-backlog.
    properties.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 3);
    properties.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 600_000);
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<EmailHubEventRecord> valueDeserializer =
        new JsonDeserializer<>(EmailHubEventRecord.class, objectMapper).ignoreTypeHeaders();
    return new DefaultKafkaConsumerFactory<>(properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, EmailHubEventRecord> emailHubEventListenerContainerFactory(
      ConsumerFactory<String, EmailHubEventRecord> emailHubEventConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, EmailHubEventRecord> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(emailHubEventConsumerFactory);
    return factory;
  }
}
