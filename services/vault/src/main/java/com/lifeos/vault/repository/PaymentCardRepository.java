package com.lifeos.vault.repository;

import com.lifeos.vault.domains.entity.PaymentCard;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentCardRepository extends JpaRepository<PaymentCard, UUID> {

  List<PaymentCard> findAllByUserId(UUID userId);

  Optional<PaymentCard> findByIdAndUserId(UUID cardId, UUID userId);

  void deleteByIdAndUserId(UUID cardId, UUID userId);
}
