package com.lifeos.vault.service;

import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class PasswordStrengthService {

  private static final List<String> COMMON_PASSWORDS =
      List.of("password", "123456", "qwerty", "letmein", "admin", "welcome");

  private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
  private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
  private static final Pattern DIGIT = Pattern.compile("[0-9]");
  private static final Pattern SYMBOL = Pattern.compile("[^a-zA-Z0-9]");

  public enum Strength {
    VERY_WEAK,
    WEAK,
    FAIR,
    STRONG,
    VERY_STRONG,
  }

  public Strength score(String password) {
    if (password == null || password.isEmpty()) {
      return Strength.VERY_WEAK;
    }

    if (COMMON_PASSWORDS.contains(password.toLowerCase())) {
      return Strength.VERY_WEAK;
    }

    int charsetSize = 0;

    if (LOWERCASE.matcher(password).find()) {
      charsetSize += 26;
    }

    if (UPPERCASE.matcher(password).find()) {
      charsetSize += 26;
    }

    if (DIGIT.matcher(password).find()) {
      charsetSize += 10;
    }

    if (SYMBOL.matcher(password).find()) {
      charsetSize += 32;
    }

    double entropyBits = password.length() * (Math.log(charsetSize) / Math.log(2));

    if (hasRepeatedRun(password, 3)) {
      entropyBits -= 10;
    }

    if (hasSequentialRun(password, 3)) {
      entropyBits -= 10;
    }

    return strengthFromEntropy(entropyBits);
  }

  private Strength strengthFromEntropy(double entropyBits) {
    if (entropyBits < 28) {
      return Strength.VERY_WEAK;
    }

    if (entropyBits < 36) {
      return Strength.WEAK;
    }

    if (entropyBits < 60) {
      return Strength.FAIR;
    }

    if (entropyBits < 80) {
      return Strength.STRONG;
    }

    return Strength.VERY_STRONG;
  }

  private boolean hasRepeatedRun(String password, int runLength) {
    for (int i = 0; i <= password.length() - runLength; i++) {
      String window = password.substring(i, i + runLength);
      boolean allSame = true;

      for (int j = 1; j < window.length(); j++) {
        if (window.charAt(j) != window.charAt(0)) {
          allSame = false;
          break;
        }
      }

      if (allSame) {
        return true;
      }
    }

    return false;
  }

  private boolean hasSequentialRun(String password, int runLength) {
    for (int i = 0; i <= password.length() - runLength; i++) {
      String window = password.substring(i, i + runLength);
      boolean isSequential = true;

      for (int j = 1; j < window.length(); j++) {
        if (window.charAt(j) != window.charAt(j - 1) + 1) {
          isSequential = false;
          break;
        }
      }

      if (isSequential) {
        return true;
      }
    }

    return false;
  }
}
