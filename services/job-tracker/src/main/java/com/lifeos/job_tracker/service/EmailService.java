package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.record.ResendEmailRequest;
import com.lifeos.job_tracker.domains.record.ResendEmailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
public class EmailService {

  @Value("${resend.from-email}")
  private String fromEmail;

  private final RestClient resendRestClient;

  public void sendEmail(String to, String subject, String html) {
    ResendEmailRequest request = new ResendEmailRequest(fromEmail, to, subject, html);

    resendRestClient
        .post()
        .uri("/emails")
        .body(request)
        .retrieve()
        .body(ResendEmailResponse.class);
  }
}
