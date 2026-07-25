package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.CategorizationRule;
import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.enums.MatchField;
import com.lifeos.finance_tracker.repository.CategorizationRuleRepository;
import com.lifeos.finance_tracker.repository.CategoryRepository;
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

  private String extractValue(Transaction transaction, MatchField matchField) {
    return switch (matchField) {
      case DESCRIPTION, MERCHANT_NAME -> transaction.getDescription();
      case TAGS -> transaction.getTags() == null ? null : String.join(" ", transaction.getTags());
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
