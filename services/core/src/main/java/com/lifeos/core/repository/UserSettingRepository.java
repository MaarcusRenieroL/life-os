package com.lifeos.core.repository;

import com.lifeos.core.domains.entity.UserSetting;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSettingRepository extends JpaRepository<UserSetting, UUID> {

  List<UserSetting> findAllByUserId(UUID userId);

  List<UserSetting> findAllByUserIdAndModule(UUID userId, String module);

  Optional<UserSetting> findByUserIdAndModuleAndKey(UUID userId, String module, String key);

  void deleteByUserIdAndModuleAndKey(UUID userId, String module, String key);
}
