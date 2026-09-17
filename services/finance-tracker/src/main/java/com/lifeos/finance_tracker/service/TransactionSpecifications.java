package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.TransactionCategory;
import com.lifeos.finance_tracker.domains.enums.SourceType;
import com.lifeos.finance_tracker.domains.enums.TransactionType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

// Server-side equivalent of what the transactions list used to filter
// client-side over only the currently-loaded page - search/status/category/
// source now apply across the whole result set before pagination, not just
// the 50 rows on screen.
public final class TransactionSpecifications {

  private TransactionSpecifications() {}

  public static Specification<Transaction> matching(
      UUID userId, String search, String status, UUID categoryId, SourceType sourceType) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      predicates.add(cb.equal(root.get("userId"), userId));

      if (search != null && !search.isBlank()) {
        String pattern = "%" + search.trim().toLowerCase() + "%";
        predicates.add(
            cb.or(
                cb.like(cb.lower(root.get("description")), pattern),
                cb.like(root.get("amount").as(String.class), pattern)));
      }

      if (status != null && !status.isBlank() && !status.equalsIgnoreCase("all")) {
        Predicate needsReview =
            cb.and(
                cb.isNull(root.get("categoryId")),
                cb.notEqual(root.get("type"), TransactionType.CREDIT));

        switch (status.toUpperCase()) {
          case "DUPLICATE" -> predicates.add(cb.isTrue(root.get("isDuplicate")));
          case "NEEDS_REVIEW" -> predicates.add(needsReview);
          case "CATEGORIZED" -> {
            predicates.add(cb.isFalse(root.get("isDuplicate")));
            predicates.add(cb.not(needsReview));
          }
          default -> {}
        }
      }

      if (categoryId != null) {
        Subquery<UUID> linkedCategory = query.subquery(UUID.class);
        var linkRoot = linkedCategory.from(TransactionCategory.class);
        linkedCategory
            .select(linkRoot.get("transactionId"))
            .where(cb.equal(linkRoot.get("categoryId"), categoryId));

        predicates.add(
            cb.or(cb.equal(root.get("categoryId"), categoryId), root.get("id").in(linkedCategory)));
      }

      if (sourceType != null) {
        predicates.add(cb.equal(root.get("sourceType"), sourceType));
      }

      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }
}
