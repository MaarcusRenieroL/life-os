package com.lifeos.workouts.controller;

import com.lifeos.workouts.domains.dto.response.ExerciseRecordsResponse;
import com.lifeos.workouts.service.PersonalRecordService;
import com.lifeos.common.domains.dto.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/workouts/records")
@RequiredArgsConstructor
public class RecordController {

  private final PersonalRecordService personalRecordService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<ExerciseRecordsResponse>>> list(Authentication authentication) {
    return ResponseEntity.ok(ApiResponse.success(personalRecordService.list((UUID) authentication.getPrincipal()), "Records fetched successfully"));
  }
}
