package com.lifeos.core.domains.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

// Used for both backlinks and outgoing links - the id/title/excerpt always
// refer to the *other* note in the relationship, so the same shape works
// for GET /notes/{id}/backlinks and GET /notes/{id}/outgoing-links.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NoteLinkResponse {

  UUID id;

  String title;

  String excerpt;

  Instant linkedAt;
}
