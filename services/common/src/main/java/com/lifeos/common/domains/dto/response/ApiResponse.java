package com.lifeos.common.domains.dto.response;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// @Builder alone generates a package-private all-args constructor for the builder and suppresses
// the implicit public no-args one - fine as long as this only ever gets serialized OUT to JSON
// (which is all every controller does with it). The one exception: core's TodayService is the
// first place one service deserializes ANOTHER service's ApiResponse<T> wrapper directly in Java
// (via RestClient + ParameterizedTypeReference), and without a no-args constructor Jackson has
// nothing to instantiate with - "Type definition error" at runtime, not a compile error, so this
// was silently broken until traced through a live request. @NoArgsConstructor is purely additive
// (Lombok still generates the builder's own all-args constructor alongside it) and doesn't change
// how this serializes for every existing caller.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

  boolean success;
  String message;
  T data;
  Instant timestamp;

  public static <T> ApiResponse<T> success(T data, String message) {
    return ApiResponse.<T>builder()
        .success(true)
        .message(message)
        .data(data)
        .timestamp(Instant.now())
        .build();
  }

  public static ApiResponse<Void> error(String message) {
    return ApiResponse.<Void>builder()
        .success(false)
        .message(message)
        .timestamp(Instant.now())
        .build();
  }
}
