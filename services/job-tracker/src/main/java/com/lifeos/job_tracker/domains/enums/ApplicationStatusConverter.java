package com.lifeos.job_tracker.domains.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ApplicationStatusConverter implements AttributeConverter<ApplicationStatus, String> {

  @Override
  public String convertToDatabaseColumn(ApplicationStatus attribute) {
    return attribute == null ? null : attribute.value();
  }

  @Override
  public ApplicationStatus convertToEntityAttribute(String dbData) {
    return dbData == null ? null : ApplicationStatus.fromValue(dbData);
  }
}
