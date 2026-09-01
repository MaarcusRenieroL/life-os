package com.lifeos.finance_tracker.domains.record;

import java.util.List;
import org.springframework.data.domain.Page;

// Spring Data's Page<T> no longer serializes to a flat JSON shape by
// default - newer versions nest paging metadata under a "page" key and log
// "Serializing PageImpl instances as-is is not supported... no guarantee
// about the stability of the resulting JSON structure". Returning Page<T>
// directly from a controller broke the frontend's pagination (it read
// totalPages/number/totalElements at the top level, which no longer exist
// there). This is a stable, explicit shape to serialize instead.
public record PageResponse<T>(
    List<T> content,
    long totalElements,
    int totalPages,
    int size,
    int number,
    int numberOfElements,
    boolean first,
    boolean last,
    boolean empty) {

  public static <T> PageResponse<T> from(Page<T> page) {
    return new PageResponse<>(
        page.getContent(),
        page.getTotalElements(),
        page.getTotalPages(),
        page.getSize(),
        page.getNumber(),
        page.getNumberOfElements(),
        page.isFirst(),
        page.isLast(),
        page.isEmpty());
  }
}
