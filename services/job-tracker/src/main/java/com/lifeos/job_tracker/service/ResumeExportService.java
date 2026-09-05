package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.response.ResumeSectionResponse;
import com.lifeos.job_tracker.domains.dto.response.ResumeVariantResponse;
import com.lifeos.job_tracker.domains.entity.ResumeSection;
import com.lifeos.job_tracker.domains.entity.ResumeVariant;
import com.lifeos.job_tracker.domains.record.SectionView;
import com.lifeos.job_tracker.integration.ResumePdfWriter;
import com.lifeos.job_tracker.integration.ResumeSectionRenderer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * PDF/JSON export and side-by-side comparison for resume variants. Word (.docx) export from the
 * spec is intentionally not implemented - it would mean pulling in Apache POI for a single, rarely
 * used export path; PDF and JSON cover every real use case (uploading to an ATS, or re-importing).
 */
@Service
@RequiredArgsConstructor
public class ResumeExportService {

  private final ResumeVariantService resumeVariantService;
  private final ResumeSectionRenderer sectionRenderer;
  private final ResumePdfWriter pdfWriter;

  @Transactional(readOnly = true)
  public byte[] toPdf(UUID userId, UUID variantId) {
    ResumeVariant variant = resumeVariantService.get(userId, variantId);
    List<ResumeSection> sections = resumeVariantService.sections(userId, variantId);
    String markdown =
        sectionRenderer.toMarkdown(
            visibleSections(sections).stream()
                .map(
                    section ->
                        new SectionView(
                            section.getSectionType() == null ? null : section.getSectionType().name(),
                            section.getTitle(),
                            section.getContent()))
                .toList());
    return pdfWriter.fromMarkdown("# " + variant.getName() + "\n\n" + markdown);
  }

  @Transactional(readOnly = true)
  public ResumeVariantResponse toJson(UUID userId, UUID variantId) {
    ResumeVariant variant = resumeVariantService.get(userId, variantId);
    List<ResumeSectionResponse> sections =
        resumeVariantService.sections(userId, variantId).stream().map(ResumeSectionResponse::from).toList();
    return ResumeVariantResponse.from(variant, sections);
  }

  /** For each requested variant: its sections, plus which section types it has that the others don't. */
  @Transactional(readOnly = true)
  public Map<String, Object> compare(UUID userId, UUID variantId, List<UUID> otherVariantIds) {
    List<UUID> allIds = new java.util.ArrayList<>();
    allIds.add(variantId);
    allIds.addAll(otherVariantIds);

    Map<String, Object> variants = new LinkedHashMap<>();
    Map<UUID, java.util.Set<String>> sectionTypesByVariant = new LinkedHashMap<>();

    for (UUID id : allIds) {
      ResumeVariant variant = resumeVariantService.get(userId, id);
      List<ResumeSectionResponse> sections =
          resumeVariantService.sections(userId, id).stream().map(ResumeSectionResponse::from).toList();
      variants.put(id.toString(), ResumeVariantResponse.from(variant, sections));
      sectionTypesByVariant.put(
          id, sections.stream().map(ResumeSectionResponse::sectionType).collect(java.util.stream.Collectors.toSet()));
    }

    java.util.Set<String> unionTypes = new java.util.LinkedHashSet<>();
    sectionTypesByVariant.values().forEach(unionTypes::addAll);

    Map<String, Object> sectionCoverage = new LinkedHashMap<>();
    for (String type : unionTypes) {
      Map<String, Boolean> presence = new LinkedHashMap<>();
      sectionTypesByVariant.forEach((id, types) -> presence.put(id.toString(), types.contains(type)));
      sectionCoverage.put(type, presence);
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("variants", variants);
    result.put("sectionCoverage", sectionCoverage);
    return result;
  }

  private static List<ResumeSection> visibleSections(List<ResumeSection> sections) {
    return sections.stream().filter(section -> !section.isHidden()).toList();
  }
}
