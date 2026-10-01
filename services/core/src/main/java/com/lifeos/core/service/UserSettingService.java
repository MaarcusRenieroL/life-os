package com.lifeos.core.service;

import com.lifeos.core.domains.dto.response.UserSettingResponse;
import com.lifeos.core.domains.entity.UserSetting;
import com.lifeos.core.repository.UserSettingRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Generic per-user, per-module settings - the "almost everything you can possibly think of"
 * store. Every module owns the meaning of its own keys; this service just persists and caches
 * them. A missing key means "use that setting's default," same convention as module settings -
 * nothing is seeded here on account creation. */
@Service
@RequiredArgsConstructor
public class UserSettingService {

  static final int MAX_VALUE_CHARS = 10_000;
  static final int MAX_SETTINGS_PER_USER = 500;

  private final UserSettingRepository userSettingRepository;

  /** Module and key are path variables that end up in indexed columns: short, plain identifiers only. */
  private static void requireName(String name, int max, String what) {
    if (name == null || name.isBlank() || name.length() > max || !name.matches("[A-Za-z0-9._-]+")) {
      throw new IllegalArgumentException("The setting " + what + " must be 1 to " + max + " letters, digits, dots, dashes or underscores");
    }
  }

  @Cacheable(value = "user-settings", key = "#userId")
  @Transactional(readOnly = true)
  public List<UserSettingResponse> getAll(UUID userId) {
    return userSettingRepository.findAllByUserId(userId).stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<UserSettingResponse> getForModule(UUID userId, String module) {
    return userSettingRepository.findAllByUserIdAndModule(userId, module).stream()
        .map(this::toResponse)
        .toList();
  }

  @CacheEvict(value = "user-settings", key = "#userId")
  @Transactional
  public UserSettingResponse set(UUID userId, String module, String key, String value) {
    requireName(module, 50, "module");
    requireName(key, 100, "key");
    if (value != null && value.length() > MAX_VALUE_CHARS) {
      throw new IllegalArgumentException("A setting value can be at most " + MAX_VALUE_CHARS + " characters");
    }
    UserSetting setting =
        userSettingRepository
            .findByUserIdAndModuleAndKey(userId, module, key)
            .orElseGet(
                () -> UserSetting.builder().userId(userId).module(module).key(key).build());

    if (setting.getId() == null && userSettingRepository.countByUserId(userId) >= MAX_SETTINGS_PER_USER) {
      throw new IllegalArgumentException("You've reached the limit of " + MAX_SETTINGS_PER_USER + " saved settings");
    }
    setting.setValue(value);

    return toResponse(userSettingRepository.save(setting));
  }

  @CacheEvict(value = "user-settings", key = "#userId")
  @Transactional
  public void delete(UUID userId, String module, String key) {
    userSettingRepository.deleteByUserIdAndModuleAndKey(userId, module, key);
  }

  private UserSettingResponse toResponse(UserSetting setting) {
    return UserSettingResponse.builder()
        .module(setting.getModule())
        .key(setting.getKey())
        .value(setting.getValue())
        .build();
  }
}
