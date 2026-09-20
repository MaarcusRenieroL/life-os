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

  private final UserSettingRepository userSettingRepository;

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
    UserSetting setting =
        userSettingRepository
            .findByUserIdAndModuleAndKey(userId, module, key)
            .orElseGet(
                () -> UserSetting.builder().userId(userId).module(module).key(key).build());

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
