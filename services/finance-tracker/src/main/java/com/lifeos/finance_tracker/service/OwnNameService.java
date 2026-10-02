package com.lifeos.finance_tracker.service;

import com.lifeos.finance_tracker.domains.entity.Transaction;
import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import com.lifeos.finance_tracker.repository.TransactionRepository;
import com.lifeos.finance_tracker.repository.UserFinanceSettingsRepository;
import com.lifeos.finance_tracker.util.Ledger;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A bank narration that contains the account holder's own name ("UPI-MAARCUS RENIERO L-...") is money
 * moving between the user's own accounts. It is flagged as a transfer so it stops counting as spending
 * or income, even when the other account is not tracked here (so there is no second leg to pair with).
 */
@Service
@RequiredArgsConstructor
public class OwnNameService {

  private final UserFinanceSettingsRepository settingsRepository;
  private final TransactionRepository transactionRepository;

  /** Flags {@code transaction} as a self-transfer when its description carries one of the user's names. */
  public void applyTo(Transaction transaction) {
    if (transaction.isTransfer() || transaction.isDuplicate()) {
      return;
    }
    if (matches(namesFor(transaction.getUserId()), transaction.getDescription())) {
      transaction.setTransfer(true);
      transaction.setCategoryId(null);
    }
  }

  public List<String> namesFor(UUID userId) {
    return settingsRepository.findById(userId).map(UserFinanceSettings::getOwnerNames).map(OwnNameService::split).orElse(List.of());
  }

  /** Saves the names and re-labels transactions already in the books; returns how many changed. */
  @Transactional
  public int setNames(UUID userId, List<String> names) {
    List<String> cleaned = names.stream().map(String::trim).filter(n -> n.length() >= 3).distinct().toList();
    UserFinanceSettings settings = settingsRepository.findById(userId).orElseGet(() -> UserFinanceSettings.builder().userId(userId).build());
    settings.setOwnerNames(cleaned.isEmpty() ? null : String.join(",", cleaned));
    settingsRepository.save(settings);

    List<Transaction> hits =
        transactionRepository.findAllByUserIdOrderByTransactionDateDesc(userId).stream()
            .filter(t -> Ledger.counts(t) && matches(cleaned, t.getDescription()))
            .toList();
    hits.forEach(
        t -> {
          t.setTransfer(true);
          t.setCategoryId(null);
        });
    transactionRepository.saveAll(hits);
    return hits.size();
  }

  static boolean matches(List<String> names, String description) {
    if (names.isEmpty() || description == null) {
      return false;
    }
    String haystack = " " + normalise(description) + " ";
    return names.stream().map(OwnNameService::normalise).filter(n -> !n.isEmpty()).anyMatch(n -> haystack.contains(" " + n + " "));
  }

  private static String normalise(String text) {
    return text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }

  private static List<String> split(String csv) {
    return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
  }
}
