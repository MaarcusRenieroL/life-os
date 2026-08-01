package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Account;
import com.lifeos.finance_tracker.domains.enums.AccountType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, UUID> {

  List<Account> findAllByUserId(UUID userId);

  Optional<Account> findByIdAndUserId(UUID id, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);

  Optional<Account> findByUserIdAndBankNameAndAccountType(
      UUID userId, String bankName, AccountType type);
}
