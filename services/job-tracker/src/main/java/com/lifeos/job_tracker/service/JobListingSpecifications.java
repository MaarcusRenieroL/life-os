package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.JobListing;
import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import com.lifeos.job_tracker.domains.enums.WorkModel;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class JobListingSpecifications {

  private JobListingSpecifications() {}

  public static Specification<JobListing> ownedBy(UUID userId) {
    return (root, query, cb) -> cb.equal(root.get("userId"), userId);
  }

  public static Specification<JobListing> textLike(String q) {
    if (q == null || q.isBlank()) {
      return null;
    }
    String pattern = "%" + q.trim().toLowerCase() + "%";
    return (root, query, cb) ->
        cb.or(
            cb.like(cb.lower(root.get("title")), pattern),
            cb.like(cb.lower(root.get("company")), pattern));
  }

  public static Specification<JobListing> locationLike(String location) {
    if (location == null || location.isBlank()) {
      return null;
    }
    return (root, query, cb) ->
        cb.like(cb.lower(root.get("location")), "%" + location.trim().toLowerCase() + "%");
  }

  public static Specification<JobListing> salaryAtLeast(BigDecimal min) {
    if (min == null) {
      return null;
    }
    return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("salaryMax"), min);
  }

  public static Specification<JobListing> workModel(WorkModel workModel) {
    return workModel == null ? null : (root, query, cb) -> cb.equal(root.get("workModel"), workModel);
  }

  public static Specification<JobListing> seniority(SeniorityLevel level) {
    return level == null ? null : (root, query, cb) -> cb.equal(root.get("seniorityLevel"), level);
  }

  public static Specification<JobListing> source(String source) {
    if (source == null || source.isBlank()) {
      return null;
    }
    return (root, query, cb) -> cb.equal(root.get("source"), source);
  }

  public static Specification<JobListing> minScore(Integer minScore) {
    return minScore == null
        ? null
        : (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("fitScore"), minScore);
  }

  public static Specification<JobListing> notDismissed() {
    return (root, query, cb) -> cb.isFalse(root.get("dismissed"));
  }
}
