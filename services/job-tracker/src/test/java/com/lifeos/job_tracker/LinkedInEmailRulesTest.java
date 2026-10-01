package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.service.LinkedInEmailRules;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class LinkedInEmailRulesTest {

  private static final String BODY =
      """
      Your application was sent to Meetswap

      Back End Developer
      Meetswap · India (Remote)
      Applied on September 30, 2026
      """;

  private Optional<EmailClassification> classify(String from, String subject, String body) {
    return LinkedInEmailRules.classify(from, subject, body);
  }

  @Test
  void readsCompanyFromTheSubjectAndTitleFromTheBody() {
    EmailClassification c =
        classify("LinkedIn <jobs-noreply@linkedin.com>", "Maarcus, your application was sent to Meetswap", BODY).orElseThrow();

    assertThat(c.type()).isEqualTo("APPLICATION_CONFIRMATION");
    assertThat(c.confidence()).isEqualTo("HIGH");
    assertThat(c.company()).isEqualTo("Meetswap");
    assertThat(c.title()).isEqualTo("Back End Developer");
  }

  @Test
  void aBodyWithoutATitleLineLeavesTheTitleBlankInsteadOfGuessing() {
    EmailClassification c =
        classify(
                "jobs-noreply@linkedin.com",
                "Maarcus, your application was sent to Codewalla",
                "Your application was sent to Codewalla\nCodewalla · Pune\nApplied on September 30, 2026")
            .orElseThrow();

    assertThat(c.company()).isEqualTo("Codewalla");
    assertThat(c.title()).isNull();
  }

  @Test
  void theTitleAtCompanySubjectFormIsRead() {
    EmailClassification c =
        classify("jobs-noreply@linkedin.com", "Your application to Full Stack Engineer at Startupvisors", "").orElseThrow();

    assertThat(c.company()).isEqualTo("Startupvisors");
    assertThat(c.title()).isEqualTo("Full Stack Engineer");
  }

  @Test
  void otherSendersAndOtherLinkedInMailAreLeftToTheModel() {
    assertThat(classify("careers@acme.com", "Your application was sent to Acme", BODY)).isEmpty();
    assertThat(classify("jobs-noreply@linkedin.com", "Meetswap is hiring a Back End Developer", BODY)).isEmpty();
    assertThat(classify("jobs-noreply@linkedin.com", "Your update from Meetswap", BODY)).isEmpty();
  }
}
