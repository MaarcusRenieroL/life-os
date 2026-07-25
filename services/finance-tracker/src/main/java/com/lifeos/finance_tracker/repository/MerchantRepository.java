package com.lifeos.finance_tracker.repository;

import com.lifeos.finance_tracker.domains.entity.Merchant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MerchantRepository extends JpaRepository<Merchant, UUID> {

  List<Merchant> findAllByUserIdOrUserIdIsNull(UUID userId);

  Optional<Merchant> findByIdAndUserId(UUID id, UUID userId);

  void deleteByIdAndUserId(UUID id, UUID userId);
}
