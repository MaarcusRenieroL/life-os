package com.lifeos.common.domains.dto.response;

import java.util.List;
import org.springframework.data.domain.Page;

// Spring Data's Page<T> no longer serializes to a flat JSON shape by default in newer Spring
// Boot versions - this is a stable, explicit shape instead. Previously duplicated across core,
// notes, finance-tracker and job-tracker; job-tracker's copy had a different, narrower shape
// ({page, size, totalElements, totalPages} vs. this one), so its own pagination responses looked
// different from every other module's to any shared frontend code. Consolidated here so all four
// (and any future module) serialize pagination identically.
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
