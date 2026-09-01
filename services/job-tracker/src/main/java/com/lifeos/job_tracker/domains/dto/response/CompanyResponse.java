package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Company;
import java.util.UUID;

public record CompanyResponse(
    UUID id, String name, String industry, String size, String website, String linkedinUrl) {

  public static CompanyResponse from(Company company) {
    return new CompanyResponse(
        company.getId(),
        company.getName(),
        company.getIndustry(),
        company.getSize() == null ? null : company.getSize().name(),
        company.getWebsite(),
        company.getLinkedinUrl());
  }
}
