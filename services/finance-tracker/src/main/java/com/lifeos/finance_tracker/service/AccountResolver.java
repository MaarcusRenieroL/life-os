package com.lifeos.finance_tracker.service;

import com.lifeos.common.security.EncryptionService;
import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.enums.AccountType;
import com.lifeos.finance_tracker.repository.AccountRepository;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Finds the account a bank alert belongs to. This used to be an exact match on the bank's name, so
 * an account the user called "HDFC" never matched an alert from "HDFC Bank" and the alert was
 * dropped. Now, in order of how much the alert actually says:
 * <ol>
 *   <li>the account's own last digits, when the alert names the account (the strongest evidence);
 *   <li>the same type of account at the same bank, spelled loosely ("HDFC" = "HDFC Bank");
 *   <li>if that still leaves several, the one whose digits match, else the primary one.
 * </ol>
 * Several equally good candidates are never guessed between: the alert waits in the import inbox.
 */
@Service
@RequiredArgsConstructor
public class AccountResolver {

  private static final Set<String> NOISE = Set.of("bank", "banks", "ltd", "limited", "pvt", "private", "of", "the");

  private final AccountRepository accountRepository;
  private final EncryptionService encryptionService;

  public Optional<Account> resolve(UUID userId, String bankName, AccountType type, String suffix) {
    List<Account> accounts = accountRepository.findAllByUserId(userId).stream().filter(Account::isActive).toList();

    String digits = digitsOnly(suffix);
    if (!digits.isEmpty()) {
      List<Account> byDigits = accounts.stream().filter(a -> lastFour(a).endsWith(lastFour(digits))).toList();
      if (byDigits.size() == 1) {
        return Optional.of(byDigits.get(0));
      }
    }

    // An alert that names specific digits is never booked into an account whose own digits are known
    // and different - the same bank can hold several accounts (savings, a loan), and an unlucky
    // match would put the money in the wrong one. Accounts with no number on file stay candidates.
    List<Account> sameKind =
        accounts.stream()
            .filter(a -> a.getAccountType() == type && sameBank(a.getBankName(), bankName))
            .filter(a -> digits.isEmpty() || lastFour(a).isEmpty() || lastFour(a).endsWith(lastFour(digits)))
            .toList();
    if (sameKind.size() == 1) {
      return Optional.of(sameKind.get(0));
    }
    if (sameKind.size() > 1) {
      if (!digits.isEmpty()) {
        List<Account> narrowed = sameKind.stream().filter(a -> lastFour(a).endsWith(lastFour(digits))).toList();
        if (narrowed.size() == 1) {
          return Optional.of(narrowed.get(0));
        }
      }
      List<Account> primary = sameKind.stream().filter(Account::isPrimary).toList();
      if (primary.size() == 1) {
        return Optional.of(primary.get(0));
      }
    }
    return Optional.empty();
  }

  /** "HDFC Bank Ltd." and "hdfc" are the same bank; so are "Canara Bank" and "Canara". */
  static boolean sameBank(String a, String b) {
    String x = normaliseBank(a);
    String y = normaliseBank(b);
    if (x.isEmpty() || y.isEmpty()) {
      return false;
    }
    return x.equals(y) || (Math.min(x.length(), y.length()) >= 3 && (x.startsWith(y) || y.startsWith(x)));
  }

  static String normaliseBank(String name) {
    if (name == null) {
      return "";
    }
    StringBuilder out = new StringBuilder();
    for (String word : name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").trim().split("\\s+")) {
      if (!word.isEmpty() && !NOISE.contains(word)) {
        out.append(word);
      }
    }
    return out.toString();
  }

  private String lastFour(Account account) {
    if (account.getAccountNumberEncrypted() == null) {
      return "";
    }
    try {
      return lastFour(digitsOnly(encryptionService.decrypt(account.getAccountNumberEncrypted())));
    } catch (RuntimeException exception) {
      return "";
    }
  }

  private static String lastFour(String digits) {
    return digits.length() <= 4 ? digits : digits.substring(digits.length() - 4);
  }

  private static String digitsOnly(String value) {
    return value == null ? "" : value.replaceAll("\\D", "");
  }
}
