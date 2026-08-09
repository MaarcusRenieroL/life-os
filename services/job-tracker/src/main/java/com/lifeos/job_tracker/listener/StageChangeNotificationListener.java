package com.lifeos.job_tracker.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.dto.response.NotificationResponse;
import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.domains.entity.Notification;
import com.lifeos.job_tracker.domains.entity.NotificationSettings;
import com.lifeos.job_tracker.domains.enums.NotificationReferenceType;
import com.lifeos.job_tracker.domains.record.ApplicationStageChangedEvent;
import com.lifeos.job_tracker.repository.JobRepository;
import com.lifeos.job_tracker.repository.NotificationRepository;
import com.lifeos.job_tracker.repository.NotificationSettingsRepository;
import com.lifeos.job_tracker.service.EmailService;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
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
public class StageChangeNotificationListener {

  @Bean
  public ConsumerFactory<String, ApplicationStageChangedEvent>
      applicationStageChangedConsumerFactory(KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<ApplicationStageChangedEvent> valueDeserializer =
        new JsonDeserializer<>(ApplicationStageChangedEvent.class, objectMapper)
            .ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, ApplicationStageChangedEvent>
      applicationStageChangedKafkaListenerContainerFactory(
          ConsumerFactory<String, ApplicationStageChangedEvent>
              applicationStageChangedConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, ApplicationStageChangedEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(applicationStageChangedConsumerFactory);

    return factory;
  }

  @Component
  @RequiredArgsConstructor
  public static class Consumer {

    @Value("${owner.email}")
    private String ownerEmail;

    private final NotificationRepository notificationRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;
    private final JobRepository jobRepository;
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final EmailService emailService;

    @KafkaListener(
        topics = "applications.stage_changed",
        groupId = "job-tracker",
        containerFactory = "applicationStageChangedKafkaListenerContainerFactory")
    public void consume(ApplicationStageChangedEvent event) {
      Optional<Job> job = jobRepository.findById(event.jobId());
      String jobTitle = job.map(Job::getJobTitle).orElse("a job");
      String company = job.map(Job::getCompany).orElse("Unknown company");

      String message =
          jobTitle
              + " at "
              + company
              + " moved from "
              + event.previousStage()
              + " to "
              + event.newStage();

      Notification savedNotification =
          notificationRepository.save(
              Notification.builder()
                  .userId(event.userId())
                  .referenceType(NotificationReferenceType.APPLICATION)
                  .referenceId(event.applicationId())
                  .message(message)
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
              .isRead(false)
              .createdAt(savedNotification.getCreatedAt())
              .build());

      boolean shouldEmail =
          notificationSettingsRepository
              .findByUserId(event.userId())
              .map(NotificationSettings::getEmailOnStageChange)
              .orElse(true);

      if (shouldEmail && ownerEmail != null && !ownerEmail.isBlank()) {
        emailService.sendEmail(
            ownerEmail,
            company + " - " + jobTitle + ": moved to " + event.newStage(),
            buildStageChangeEmailHtml(jobTitle, company, event.previousStage(), event.newStage()));
      }
    }

    private String buildStageChangeEmailHtml(
        String jobTitle, String company, String previousStage, String newStage) {
      return "<div style=\"font-family: -apple-system, Arial, sans-serif; max-width: 480px; "
          + "margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;\">"
          + "<h2 style=\"margin-top: 0; color: #111;\">Application Update</h2>"
          + "<table style=\"width: 100%; border-collapse: collapse; margin-bottom: 16px;\">"
          + "<tr>"
          + "<td style=\"padding: 8px 0; color: #666;\">Job</td>"
          + "<td style=\"padding: 8px 0; text-align: right; font-weight: bold;\">"
          + jobTitle
          + "</td>"
          + "</tr>"
          + "<tr>"
          + "<td style=\"padding: 8px 0; color: #666;\">Company</td>"
          + "<td style=\"padding: 8px 0; text-align: right; font-weight: bold;\">"
          + company
          + "</td>"
          + "</tr>"
          + "</table>"
          + "<div style=\"display: flex; align-items: center; justify-content: center; "
          + "gap: 12px; padding: 16px; background: #f7f7f7; border-radius: 6px;\">"
          + "<span style=\"padding: 6px 12px; background: #e5e5e5; border-radius: 4px; "
          + "font-size: 13px;\">"
          + previousStage
          + "</span>"
          + "<span style=\"color: #999;\">&rarr;</span>"
          + "<span style=\"padding: 6px 12px; background: #111; color: #fff; "
          + "border-radius: 4px; font-size: 13px;\">"
          + newStage
          + "</span>"
          + "</div>"
          + "</div>";
    }
  }
}
