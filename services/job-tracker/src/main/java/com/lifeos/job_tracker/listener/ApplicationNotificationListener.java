package com.lifeos.job_tracker.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.dto.response.NotificationResponse;
import com.lifeos.job_tracker.domains.entity.Notification;
import com.lifeos.job_tracker.domains.enums.NotificationReferenceType;
import com.lifeos.job_tracker.events.ApplicationAppliedEvent;
import com.lifeos.job_tracker.repository.NotificationRepository;
import java.time.Instant;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Configuration
public class ApplicationNotificationListener {

  @Bean
  public ConsumerFactory<String, ApplicationAppliedEvent> applicationAppliedConsumerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<ApplicationAppliedEvent> valueDeserializer =
        new JsonDeserializer<>(ApplicationAppliedEvent.class, objectMapper).ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, ApplicationAppliedEvent>
      applicationAppliedKafkaListenerContainerFactory(
          ConsumerFactory<String, ApplicationAppliedEvent> applicationAppliedConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, ApplicationAppliedEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(applicationAppliedConsumerFactory);

    return factory;
  }

  @Component
  @RequiredArgsConstructor
  public static class Consumer {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate simpMessagingTemplate;

    @KafkaListener(
        topics = "applications.applied",
        groupId = "job-tracker",
        containerFactory = "applicationAppliedKafkaListenerContainerFactory")
    public void consume(ApplicationAppliedEvent event) {

      Notification savedNotification =
          notificationRepository.save(
              Notification.builder()
                  .userId(event.userId())
                  .referenceType(NotificationReferenceType.APPLICATION)
                  .referenceId(event.applicationId())
                  .message("You applied to a new job")
                  .isRead(false)
                  .build());

      simpMessagingTemplate.convertAndSendToUser(
          event.userId().toString(),
          "/queue/notifications",
          NotificationResponse.builder()
              .id(savedNotification.getId())
              .referenceType(savedNotification.getReferenceType())
              .referenceId(savedNotification.getReferenceId())
              .message(savedNotification.getMessage())
              .createdAt(Instant.now())
              .build());
    }
  }
}
