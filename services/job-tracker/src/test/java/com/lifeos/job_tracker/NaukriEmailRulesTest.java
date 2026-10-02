package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.job_tracker.domains.record.EmailClassification;
import com.lifeos.job_tracker.service.NaukriEmailRules;
import org.junit.jupiter.api.Test;

class NaukriEmailRulesTest {

  private static final String HTML =
      """
      <html><body><div>Get app</div>
      <div>Your applications were sent, Good luck!</div>
      <div>Applied on September 30, 2026</div>
      <div><b>Backend developer - Software Development Engineer</b></div>
      <div>Demetrius&nbsp;Technologies</div>
      <a>Track applications</a>
      <div>Similar jobs for you</div><div>Backend Python Developer</div><div>Success Pact Consulting</div>
      </body></html>
      """;

  @Test
  void readsTheFirstApplicationFromTheDigest() {
    EmailClassification c =
        NaukriEmailRules.classify("Naukri <info@naukri.com>", "You applied for 36 jobs on 30 Sep", HTML).orElseThrow();

    assertThat(c.type()).isEqualTo("APPLICATION_CONFIRMATION");
    assertThat(c.confidence()).isEqualTo("HIGH");
    assertThat(c.title()).isEqualTo("Backend developer - Software Development Engineer");
    assertThat(c.company()).isEqualTo("Demetrius Technologies");
  }

  @Test
  void leavesEverythingElseToTheModel() {
    assertThat(NaukriEmailRules.classify("naukrialerts@naukri.com", "Urgently hiring for Full Stack Developer", HTML)).isEmpty();
    assertThat(NaukriEmailRules.classify("someone@example.com", "You applied for 3 jobs on 30 Sep", HTML)).isEmpty();
    assertThat(NaukriEmailRules.classify("info@naukri.com", "You applied for 1 job on 30 Sep", "<div>no list here</div>")).isEmpty();
  }
}
