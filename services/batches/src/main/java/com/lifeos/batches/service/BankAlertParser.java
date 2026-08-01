package com.lifeos.batches.service;

import com.lifeos.batches.domains.record.ParsedAlert;
import java.time.Instant;

public interface BankAlertParser {

  boolean supports(String fromAddress);

  ParsedAlert parse(
      String messageId, String fromAddress, String subject, String body, Instant receivedAt);
}
