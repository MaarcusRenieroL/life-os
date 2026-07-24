package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.UserModuleSetting;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserModuleSettingRepository extends JpaRepository<UserModuleSetting, UUID> {

  List<UserModuleSetting> findAllByUserId(UUID userId);

  Optional<UserModuleSetting> findByUserIdAndModuleCode(UUID userId, String moduleCode);
}
