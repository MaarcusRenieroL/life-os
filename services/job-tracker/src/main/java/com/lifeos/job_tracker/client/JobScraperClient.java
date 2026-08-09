package com.lifeos.job_tracker.client;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
public class JobScraperClient {

  private final RestClient jobScraperRestClient;

  public void triggerLinkedInScrape() {
    jobScraperRestClient.post().uri("/scrape/linkedin").retrieve().toBodilessEntity();
  }

  public void triggerNaukriScrape() {
    jobScraperRestClient.post().uri("/scrape/naukri").retrieve().toBodilessEntity();
  }
}
