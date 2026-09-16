package com.lifeos.batches.domains.dto.request;

import java.util.UUID;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateEmailEventRequest {

  UUID userId;

  String gmailMessageId;

  String fromAddress;

  String subject;

  String body;
}
