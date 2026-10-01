package com.lifeos.batches.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class EmailHubSyncServiceTest {

  @Test
  void hubSearchLeavesBankAlertsAndJobBoardMailToTheirOwnPipelines() {
    EmailHubSyncService service = new EmailHubSyncService(mock(GmailMessageService.class), mock(GmailOAuthService.class), null, null);
    ReflectionTestUtils.setField(service, "bankAlertSenders", "alerts@hdfcbank.net, canarabank@canarabank.com");
    ReflectionTestUtils.setField(service, "jobSenders", "jobs-noreply@linkedin.com,noreply@greenhouse.io");

    String query = service.searchClause();

    assertThat(query)
        .contains("in:inbox")
        .contains("-from:alerts@hdfcbank.net")
        .contains("-from:canarabank@canarabank.com")
        .contains("-from:jobs-noreply@linkedin.com")
        .contains("-from:noreply@greenhouse.io");
  }
}
