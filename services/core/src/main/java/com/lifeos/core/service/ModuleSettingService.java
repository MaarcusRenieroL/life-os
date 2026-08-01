package com.lifeos.core.service;

import com.lifeos.core.domains.dto.response.ModuleSettingResponse;
import com.lifeos.core.domains.entity.UserModuleSetting;
import com.lifeos.core.repository.UserModuleSettingRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ModuleSettingService {

  private final UserModuleSettingRepository userModuleSettingRepository;

  // Only rows the user has actually toggled exist here - a module with no row is
  // meant to fall back to its static default (e.g. Password Manager enabled, every
  // other module disabled) on the frontend, not to something seeded here.
  public List<ModuleSettingResponse> getSettings(UUID userId) {
    return userModuleSettingRepository.findAllByUserId(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public ModuleSettingResponse setEnabled(UUID userId, String moduleCode, boolean enabled) {
    UserModuleSetting setting =
        userModuleSettingRepository
            .findByUserIdAndModuleCode(userId, moduleCode)
            .orElseGet(
                () -> UserModuleSetting.builder().userId(userId).moduleCode(moduleCode).build());

    setting.setEnabled(enabled);

    return toResponse(userModuleSettingRepository.save(setting));
  }

  private ModuleSettingResponse toResponse(UserModuleSetting setting) {
    return ModuleSettingResponse.builder()
        .moduleCode(setting.getModuleCode())
        .enabled(setting.isEnabled())
        .build();
  }
}
