package com.lifeos.job_tracker.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

/**
 * A dedicated producer/template for {@link JobEvent} so job-tracker's events serialize with a
 * JavaTime-aware mapper independently of the shared audit-event template in
 * {@code com.lifeos.common}.
 */
@Configuration
public class KafkaConfig {

  @Bean
  public ProducerFactory<String, JobEvent> jobEventProducerFactory(KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildProducerProperties();
    ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    return new DefaultKafkaProducerFactory<>(
        properties, new StringSerializer(), new JsonSerializer<>(mapper));
  }

  @Bean
  public KafkaTemplate<String, JobEvent> jobEventKafkaTemplate(
      ProducerFactory<String, JobEvent> jobEventProducerFactory) {
    return new KafkaTemplate<>(jobEventProducerFactory);
  }

  @Bean
  public ConsumerFactory<String, JobEvent> jobEventConsumerFactory(KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<JobEvent> deserializer =
        new JsonDeserializer<>(JobEvent.class, mapper).ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), deserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, JobEvent>
      jobEventKafkaListenerContainerFactory(
          ConsumerFactory<String, JobEvent> jobEventConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, JobEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(jobEventConsumerFactory);

    return factory;
  }

  @Bean
  public NewTopic jobDiscoveredTopic() {
    return TopicBuilder.name(JobEventTopics.JOB_DISCOVERED).partitions(1).replicas(1).build();
  }

  @Bean
  public NewTopic applicationSubmittedTopic() {
    return TopicBuilder.name(JobEventTopics.APPLICATION_SUBMITTED).partitions(1).replicas(1).build();
  }

  @Bean
  public NewTopic interviewScheduledTopic() {
    return TopicBuilder.name(JobEventTopics.INTERVIEW_SCHEDULED).partitions(1).replicas(1).build();
  }

  @Bean
  public NewTopic emailParsedTopic() {
    return TopicBuilder.name(JobEventTopics.EMAIL_PARSED).partitions(1).replicas(1).build();
  }

  @Bean
  public NewTopic referralInitiatedTopic() {
    return TopicBuilder.name(JobEventTopics.REFERRAL_INITIATED).partitions(1).replicas(1).build();
  }

  @Bean
  public NewTopic jobScoringTopic() {
    return TopicBuilder.name(JobEventTopics.JOB_SCORING).partitions(1).replicas(1).build();
  }

  @Bean
  public NewTopic followUpDueTopic() {
    return TopicBuilder.name(JobEventTopics.FOLLOW_UP_DUE).partitions(1).replicas(1).build();
  }
}
