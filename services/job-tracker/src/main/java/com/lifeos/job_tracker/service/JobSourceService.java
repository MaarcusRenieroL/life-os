package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertJobSourceRequest;
import com.lifeos.job_tracker.domains.entity.JobSource;
import com.lifeos.job_tracker.domains.enums.ScrapeFrequency;
import com.lifeos.job_tracker.exception.DuplicateResourceException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.ScraperClient;
import com.lifeos.job_tracker.repository.JobSourceRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class JobSourceService {

  private final JobSourceRepository jobSourceRepository;
  private final ScraperClient scraperClient;
  private final JobIngestionService jobIngestionService;
  private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Transactional(readOnly = true)
  public List<JobSource> list(UUID userId) {
    return jobSourceRepository.findAllByUserIdOrderByNameAsc(userId);
  }

  @Transactional
  public JobSource create(UUID userId, UpsertJobSourceRequest request) {
    if (jobSourceRepository.existsByUserIdAndName(userId, request.name())) {
      throw new DuplicateResourceException("A source named '" + request.name() + "' already exists");
    }
    return jobSourceRepository.save(
        JobSource.builder()
            .userId(userId)
            .name(request.name())
            .url(request.url())
            .scrapeFrequency(
                request.scrapeFrequency() == null ? ScrapeFrequency.MANUAL : request.scrapeFrequency())
            .active(request.active() == null || request.active())
            .build());
  }

  @Transactional
  public JobSource update(UUID userId, UUID sourceId, UpsertJobSourceRequest request) {
    JobSource source =
        jobSourceRepository
            .findByIdAndUserId(sourceId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job source", sourceId));
    source.setName(request.name());
    source.setUrl(request.url());
    if (request.scrapeFrequency() != null) {
      source.setScrapeFrequency(request.scrapeFrequency());
    }
    if (request.active() != null) {
      source.setActive(request.active());
    }
    return jobSourceRepository.save(source);
  }

  @Transactional
  public void delete(UUID userId, UUID sourceId) {
    JobSource source =
        jobSourceRepository
            .findByIdAndUserId(sourceId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Job source", sourceId));
    jobSourceRepository.delete(source);
  }

  /** Runs every active source through the scraper microservice and ingests what comes back. */
  @Transactional
  public Map<String, Object> runScrape(UUID userId) {
    List<JobSource> active =
        jobSourceRepository.findAllByUserIdOrderByNameAsc(userId).stream()
            .filter(JobSource::isActive)
            .toList();
    if (active.isEmpty()) {
      return Map.of("created", 0, "duplicates", 0, "skipped", 0, "note", "No active sources configured");
    }

    List<Map<String, Object>> payload =
        active.stream()
            .map(
                source -> {
                  Map<String, Object> map = new LinkedHashMap<>();
                  map.put("name", source.getName());
                  map.put("url", source.getUrl());
                  return map;
                })
            .toList();

    var response = scraperClient.scrape(userId, payload);
    var jobs =
        objectMapper.convertValue(
            response.has("jobs") ? response.get("jobs") : response,
            new com.fasterxml.jackson.core.type.TypeReference<
                List<com.lifeos.job_tracker.domains.dto.request.ScrapedJob>>() {});

    Map<String, Object> result = jobIngestionService.ingest(userId, jobs);
    active.forEach(source -> source.setLastScraped(Instant.now()));
    jobSourceRepository.saveAll(active);
    return result;
  }
}
