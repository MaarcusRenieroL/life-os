package com.lifeos.job_tracker.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.job_tracker.domains.entity.Job;
import com.lifeos.job_tracker.domains.enums.JobSource;
import com.lifeos.job_tracker.domains.enums.JobStatus;
import com.lifeos.job_tracker.domains.enums.Seniority;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import com.lifeos.job_tracker.events.ScrapedJobEvent;
import com.lifeos.job_tracker.repository.JobRepository;
import java.util.Map;
import java.util.UUID;
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
import org.springframework.stereotype.Component;

@Configuration
public class ScrapeJobListener {

  @Value("${owner.user-id}")
  private String userId;

  @Bean
  public ConsumerFactory<String, ScrapedJobEvent> scrapedJobConsumerFactory(
      KafkaProperties kafkaProperties) {
    Map<String, Object> properties = kafkaProperties.buildConsumerProperties();
    ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    JsonDeserializer<ScrapedJobEvent> valueDeserializer =
        new JsonDeserializer<>(ScrapedJobEvent.class, objectMapper).ignoreTypeHeaders();

    return new DefaultKafkaConsumerFactory<>(
        properties, new StringDeserializer(), valueDeserializer);
  }

  @Bean
  public ConcurrentKafkaListenerContainerFactory<String, ScrapedJobEvent>
      scrapedJobKafkaListenerContainerFactory(
          ConsumerFactory<String, ScrapedJobEvent> scrapedJobConsumerFactory) {
    ConcurrentKafkaListenerContainerFactory<String, ScrapedJobEvent> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(scrapedJobConsumerFactory);

    return factory;
  }

  @Component
  public static class Consumer {

    private final JobRepository jobRepository;

    @Value("${owner.user-id}")
    private String userId;

    public Consumer(JobRepository jobRepository) {
      this.jobRepository = jobRepository;
    }

    @KafkaListener(
        topics = "jobs.scraped",
        groupId = "job-tracker",
        containerFactory = "scrapedJobKafkaListenerContainerFactory")
    public void consume(ScrapedJobEvent event) {
      UUID ownerId = UUID.fromString(userId);

      if (jobRepository.existsByUserIdAndJobUrl(ownerId, event.jobUrl())) {
        return;
      }

      UUID deDuplicatedWithJobId =
          event.deDuplicatedWithJobId() == null || event.deDuplicatedWithJobId().isBlank()
              ? null
              : UUID.fromString(event.deDuplicatedWithJobId());

      Job job =
          Job.builder()
              .userId(ownerId)
              .company(event.company())
              .jobTitle(event.jobTitle())
              .location(event.location())
              .country(event.country())
              .workModel(WorkModel.valueOf(event.workModel()))
              .salaryMin(event.salaryMin())
              .salaryMax(event.salaryMax())
              .currency(event.currency())
              .jobUrl(event.jobUrl())
              .jobDescription(event.jobDescription())
              .jobDescriptionHtml(event.jobDescriptionHtml())
              .source(JobSource.valueOf(event.source()))
              .sourceUrl(event.sourceUrl())
              .scrapeTimestamp(event.scrapeTimestamp())
              .requiredSkills(event.requiredSkills())
              .niceToHaveSkills(event.niceToHaveSkills())
              .experienceYears(event.experienceYears())
              .seniority(Seniority.valueOf(event.seniority()))
              .applicationDeadline(event.applicationDeadline())
              .status(JobStatus.valueOf(event.status()))
              .tags(event.tags())
              .notes(event.notes())
              .savedAt(event.savedAt())
              .discoveredAt(event.discoveredAt())
              .deDuplicatedWithJobId(deDuplicatedWithJobId)
              .build();

      jobRepository.save(job);
    }
  }
}
