package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.UserFinanceSettings;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserFinanceSettingsRepository extends JpaRepository<UserFinanceSettings, UUID> {}
