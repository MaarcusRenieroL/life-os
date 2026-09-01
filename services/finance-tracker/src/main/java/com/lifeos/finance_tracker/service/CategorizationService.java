package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.CategorizationRule;
import com.lifeos.finance_tracker.domains.entity.Category;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.MatchField;
import com.lifeos.finance_tracker.domains.enums.MatchType;
import com.lifeos.finance_tracker.repository.CategorizationRuleRepository;
import com.lifeos.finance_tracker.repository.CategoryRepository;
import com.lifeos.finance_tracker.util.DescriptionFingerprint;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CategorizationService {

  private final CategoryRepository categoryRepository;
  private final CategorizationRuleRepository categorizationRuleRepository;

  public Optional<UUID> categorize(Transaction transaction) {

    List<CategorizationRule> categorizationRules =
        categorizationRuleRepository.findAllByUserIdAndIsActiveTrueOrderByPriorityDesc(
            transaction.getUserId());

    for (CategorizationRule rule : categorizationRules) {
      String value = extractValue(transaction, rule.getMatchField());

      if (value == null) {
        continue;
      }

      if (matches(value, rule)) {
        rule.setHitCount(rule.getHitCount() + 1);
        categorizationRuleRepository.save(rule);

        return Optional.of(rule.getCategoryId());
      }
    }

    return Optional.empty();
  }

  // Called whenever a user manually sets/changes a transaction's category. Builds (or
  // strengthens) a CONTAINS rule from a normalized "fingerprint" of the description, so the
  // next transaction from the same merchant gets auto-categorized the same way. New rules get
  // a priority above every existing rule for this user, since a human just confirmed this
  // mapping - it should win over any looser rule already in place.
  public void learnFromCorrection(UUID userId, String description, UUID categoryId) {
    boolean excluded =
        categoryRepository.findById(categoryId).map(Category::isExcludeFromAutoLearning).orElse(false);

    if (excluded) {
      return;
    }

    String fingerprint = DescriptionFingerprint.of(description);

    if (fingerprint.isBlank()) {
      return;
    }

    Optional<CategorizationRule> existing =
        categorizationRuleRepository.findByUserIdAndMatchFieldAndMatchValueIgnoreCase(
            userId, MatchField.DESCRIPTION, fingerprint);

    // A rule the user built themselves for this exact match always wins - don't
    // shadow it with an auto-learned duplicate.
    if (existing.isPresent() && !existing.get().isAutoLearned()) {
      return;
    }

    CategorizationRule rule =
        existing.orElseGet(
            () ->
                CategorizationRule.builder()
                    .userId(userId)
                    .matchField(MatchField.DESCRIPTION)
                    .matchType(MatchType.CONTAINS)
                    .matchValue(fingerprint)
                    .hitCount(0)
                    .priority(categorizationRuleRepository.findMaxPriorityByUserId(userId) + 1)
                    .build());

    rule.setCategoryId(categoryId);
    rule.setActive(true);
    rule.setAutoLearned(true);

    categorizationRuleRepository.save(rule);
  }

  private String extractValue(Transaction transaction, MatchField matchField) {
    return switch (matchField) {
      case DESCRIPTION, MERCHANT_NAME -> transaction.getDescription();
    };
  }

  private boolean matches(String value, CategorizationRule rule) {
    String matchValue = rule.getMatchValue();

    return switch (rule.getMatchType()) {
      case EXACT -> value.equalsIgnoreCase(matchValue);
      case CONTAINS -> value.toLowerCase().contains(matchValue.toLowerCase());
      case REGEX -> {
        try {
          yield Pattern.compile(matchValue).matcher(value).find();
        } catch (PatternSyntaxException e) {
          yield false;
        }
      }
    };
  }
}
