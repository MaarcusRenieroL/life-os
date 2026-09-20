package com.lifeos.core.service;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.common.domains.dto.response.TodayItemResponse;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** Fans out to every module's internal /today endpoint and merges the results into one
 * cross-module view - the actual "second brain" surface: everything that needs the user's
 * attention today or soon, from every module, in one list instead of five separate pages.
 *
 * <p>A single module being down or slow must not blow up the whole Today view for every other
 * module - each call is isolated and a failure there just means that module's items are missing
 * from this load, not an error page. */
@Service
public class TodayService {

  private static final Logger log = LoggerFactory.getLogger(TodayService.class);

  private static final ParameterizedTypeReference<ApiResponse<List<TodayItemResponse>>>
      RESPONSE_TYPE = new ParameterizedTypeReference<>() {};

  private final RestClient habitTrackerRestClient;
  private final RestClient jobTrackerRestClient;
  private final RestClient financeTrackerRestClient;
  private final RestClient notesRestClient;
  private final String internalApiKey;

  public TodayService(
      RestClient habitTrackerRestClient,
      RestClient jobTrackerRestClient,
      RestClient financeTrackerRestClient,
      RestClient notesRestClient,
      @Value("${internal.api-key}") String internalApiKey) {
    this.habitTrackerRestClient = habitTrackerRestClient;
    this.jobTrackerRestClient = jobTrackerRestClient;
    this.financeTrackerRestClient = financeTrackerRestClient;
    this.notesRestClient = notesRestClient;
    this.internalApiKey = internalApiKey;
  }

  public List<TodayItemResponse> get(UUID userId) {
    return Stream.of(
            fetch(habitTrackerRestClient, "/v1/habits/internal/today", userId, "habit-tracker"),
            fetch(jobTrackerRestClient, "/v1/jobs/internal/today", userId, "job-tracker"),
            fetch(financeTrackerRestClient, "/v1/finance/internal/today", userId, "finance-tracker"),
            fetch(notesRestClient, "/v1/notes/internal/today", userId, "notes"))
        .flatMap(List::stream)
        .sorted(
            Comparator.comparing(
                TodayItemResponse::getDueAt, Comparator.nullsLast(Comparator.naturalOrder())))
        .toList();
  }

  private List<TodayItemResponse> fetch(
      RestClient restClient, String path, UUID userId, String serviceName) {
    try {
      ApiResponse<List<TodayItemResponse>> response =
          restClient
              .get()
              .uri(uriBuilder -> uriBuilder.path(path).queryParam("userId", userId).build())
              .header("X-Internal-Api-Key", internalApiKey)
              .retrieve()
              .body(RESPONSE_TYPE);

      return response == null || response.getData() == null ? List.of() : response.getData();
    } catch (Exception exception) {
      log.warn(
          "Today view: {} did not respond, omitting its items ({})",
          serviceName,
          exception.getMessage());

      return List.of();
    }
  }
}
