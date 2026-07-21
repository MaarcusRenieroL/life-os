package com.lifeos.vault.service;

import com.lifeos.vault.domains.dto.response.RecoveryCodeStatusResponse;
import com.lifeos.vault.domains.entity.RecoveryCode;
import com.lifeos.vault.domains.entity.VaultMasterPassword;
import com.lifeos.vault.exception.InvalidMasterPasswordException;
import com.lifeos.vault.exception.InvalidRecoveryCodeException;
import com.lifeos.vault.repository.RecoveryCodeRepository;
import com.lifeos.vault.repository.VaultMasterPasswordRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecoveryCodeService {

  private static final int CODE_COUNT = 10;

  private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  private static final SecureRandom SECURE_RANDOM = new SecureRandom();

  private final RecoveryCodeRepository recoveryCodeRepository;
  private final VaultMasterPasswordRepository vaultMasterPasswordRepository;
  private final PasswordEncoder passwordEncoder;

  @Transactional
  public List<String> generate(UUID userId, String currentPassword) {
    VaultMasterPassword vaultMasterPassword =
        vaultMasterPasswordRepository
            .findByUserId(userId)
            .orElseThrow(InvalidMasterPasswordException::new);

    if (!passwordEncoder.matches(currentPassword, vaultMasterPassword.getPasswordHash())) {
      throw new InvalidMasterPasswordException();
    }

    recoveryCodeRepository.deleteAllByUserId(userId);

    List<String> plainTextCodes = new ArrayList<>();
    List<RecoveryCode> recoveryCodes = new ArrayList<>();

    for (int i = 0; i < CODE_COUNT; i++) {
      String code = generateSingleCode();

      plainTextCodes.add(code);

      recoveryCodes.add(
          RecoveryCode.builder()
              .used(false)
              .usedAt(null)
              .userId(userId)
              .codeHash(passwordEncoder.encode(code))
              .build());
    }

    recoveryCodeRepository.saveAll(recoveryCodes);

    return plainTextCodes;
  }

  public List<RecoveryCodeStatusResponse> listStatus(UUID userId) {
    List<RecoveryCode> recoveryCodes =
        recoveryCodeRepository.findAllByUserIdOrderByCreatedAtAsc(userId);

    return recoveryCodes.stream().map(this::toResponse).toList();
  }

  @Transactional
  public void redeem(UUID userId, String code) {
    List<RecoveryCode> recoveryCodes = recoveryCodeRepository.findAllByUserIdAndUsedFalse(userId);

    for (RecoveryCode recoveryCode : recoveryCodes) {
      if (passwordEncoder.matches(code, recoveryCode.getCodeHash())) {
        recoveryCode.setUsed(true);
        recoveryCode.setUsedAt(Instant.now());

        recoveryCodeRepository.save(recoveryCode);

        return;
      }
    }

    throw new InvalidRecoveryCodeException();
  }

  private RecoveryCodeStatusResponse toResponse(RecoveryCode code) {
    return RecoveryCodeStatusResponse.builder()
        .id(code.getId())
        .used(code.isUsed())
        .usedAt(code.getUsedAt())
        .createdAt(code.getCreatedAt())
        .build();
  }

  private String generateSingleCode() {
    Supplier<String> makeBlock =
        () -> {
          StringBuilder block = new StringBuilder();
          for (int i = 0; i < 4; i++) {
            block.append(CODE_ALPHABET.charAt(SECURE_RANDOM.nextInt(CODE_ALPHABET.length())));
          }
          return block.toString();
        };

    return String.join("-", makeBlock.get(), makeBlock.get(), makeBlock.get());
  }
}
