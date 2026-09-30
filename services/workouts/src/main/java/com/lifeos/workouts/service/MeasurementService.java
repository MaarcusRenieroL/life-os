package com.lifeos.workouts.service;

import com.lifeos.workouts.domains.dto.request.SaveMeasurementRequest;
import com.lifeos.workouts.domains.dto.response.MeasurementResponse;
import com.lifeos.workouts.domains.entity.BodyMeasurement;
import com.lifeos.workouts.exception.InvalidRequestException;
import com.lifeos.workouts.exception.ResourceNotFoundException;
import com.lifeos.workouts.repository.BodyMeasurementRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class MeasurementService {

  private final BodyMeasurementRepository measurementRepository;

  /** Oldest first when a range is given (the trend charts want that order); newest first for the
   * plain history list. */
  @Transactional(readOnly = true)
  public List<MeasurementResponse> list(UUID userId, LocalDate from, LocalDate to) {
    if (from == null && to == null) {
      return measurementRepository.findAllByUserIdOrderByMeasuredOnDescCreatedAtDesc(userId).stream().map(this::toResponse).toList();
    }
    return measurementRepository
        .findAllByUserIdAndMeasuredOnBetweenOrderByMeasuredOnAscCreatedAtAsc(
            userId, from == null ? LocalDate.of(1970, 1, 1) : from, to == null ? LocalDate.of(9999, 12, 31) : to)
        .stream()
        .map(this::toResponse)
        .toList();
  }

  public MeasurementResponse create(UUID userId, SaveMeasurementRequest request) {
    BodyMeasurement measurement = BodyMeasurement.builder().userId(userId).build();
    apply(measurement, request);
    return toResponse(measurementRepository.save(measurement));
  }

  public MeasurementResponse update(UUID userId, UUID id, SaveMeasurementRequest request) {
    BodyMeasurement measurement = findOwned(userId, id);
    apply(measurement, request);
    return toResponse(measurementRepository.save(measurement));
  }

  public void delete(UUID userId, UUID id) {
    measurementRepository.delete(findOwned(userId, id));
  }

  private BodyMeasurement findOwned(UUID userId, UUID id) {
    return measurementRepository.findByIdAndUserId(id, userId).orElseThrow(() -> ResourceNotFoundException.of("Measurement", id));
  }

  private void apply(BodyMeasurement m, SaveMeasurementRequest r) {
    if (r.weightKg() == null && r.chestCm() == null && r.waistCm() == null && r.armsCm() == null && r.legsCm() == null && r.bodyFatPct() == null) {
      throw new InvalidRequestException("Enter at least one measurement");
    }
    LocalDate date = r.measuredOn() == null ? LocalDate.now() : r.measuredOn();
    if (date.isAfter(LocalDate.now())) throw new InvalidRequestException("A measurement can't be dated in the future");
    m.setMeasuredOn(date);
    m.setWeightKg(r.weightKg());
    m.setChestCm(r.chestCm());
    m.setWaistCm(r.waistCm());
    m.setArmsCm(r.armsCm());
    m.setLegsCm(r.legsCm());
    m.setBodyFatPct(r.bodyFatPct());
    m.setNotes(r.notes() == null || r.notes().isBlank() ? null : r.notes().trim());
  }

  private MeasurementResponse toResponse(BodyMeasurement m) {
    return new MeasurementResponse(
        m.getId(), m.getMeasuredOn(), m.getWeightKg(), m.getChestCm(), m.getWaistCm(), m.getArmsCm(), m.getLegsCm(), m.getBodyFatPct(), m.getNotes());
  }
}
