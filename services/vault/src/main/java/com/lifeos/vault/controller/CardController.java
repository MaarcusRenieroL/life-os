package com.lifeos.vault.controller;

import com.lifeos.vault.domains.dto.request.CreateCardRequest;
import com.lifeos.vault.domains.dto.request.UpdateCardRequest;
import com.lifeos.vault.domains.dto.response.ApiResponse;
import com.lifeos.vault.domains.dto.response.CardResponse;
import com.lifeos.vault.service.CardService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/vault/cards")
@RequiredArgsConstructor
public class CardController {

  private final CardService cardService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<CardResponse>>> getCards(Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(cardService.getCards(authentication), "Cards fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<CardResponse>> getCard(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(cardService.getCard(authentication, id), "Card fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<CardResponse>> createCard(
      Authentication authentication, @Valid @RequestBody CreateCardRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            cardService.createCard(authentication, request), "Card created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<CardResponse>> updateCard(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateCardRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            cardService.updateCard(authentication, id, request), "Card updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteCard(
      Authentication authentication, @PathVariable UUID id) {
    cardService.deleteCard(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Card deleted successfully"));
  }
}
