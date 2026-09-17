package com.lifeos.finance_tracker.controller;

import com.lifeos.common.domains.dto.response.ApiResponse;
import com.lifeos.finance_tracker.domains.dto.request.CreateCategoryRequest;
import com.lifeos.finance_tracker.domains.dto.request.UpdateCategoryRequest;
import com.lifeos.finance_tracker.domains.dto.response.CategoryResponse;
import com.lifeos.finance_tracker.service.CategoryService;
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
@RequestMapping("/v1/finance/categories")
@RequiredArgsConstructor
public class CategoryController {

  private final CategoryService categoryService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories(
      Authentication authentication) {
    return ResponseEntity.ok(
        ApiResponse.success(categoryService.getAll(authentication), "Categories fetched successfully"));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<CategoryResponse>> getCategory(
      Authentication authentication, @PathVariable UUID id) {
    return ResponseEntity.ok(
        ApiResponse.success(categoryService.get(authentication, id), "Category fetched successfully"));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
      Authentication authentication, @Valid @RequestBody CreateCategoryRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            categoryService.save(authentication, request), "Category created successfully"));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
      Authentication authentication,
      @PathVariable UUID id,
      @Valid @RequestBody UpdateCategoryRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success(
            categoryService.update(authentication, id, request), "Category updated successfully"));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deleteCategory(
      Authentication authentication, @PathVariable UUID id) {
    categoryService.delete(authentication, id);

    return ResponseEntity.ok(ApiResponse.success(null, "Category deleted successfully"));
  }
}
