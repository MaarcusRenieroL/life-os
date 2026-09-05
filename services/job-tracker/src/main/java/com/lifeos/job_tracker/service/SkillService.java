package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertSkillRequest;
import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.SkillCategory;
import com.lifeos.job_tracker.domains.enums.SkillProficiency;
import com.lifeos.job_tracker.domains.enums.SkillSource;
import com.lifeos.job_tracker.domains.record.ExtractedSkill;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.repository.SkillRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SkillService {

  private static final Logger log = LoggerFactory.getLogger(SkillService.class);

  private final SkillRepository skillRepository;

  @Transactional(readOnly = true)
  public List<Skill> list(UUID userId) {
    return skillRepository.findAllByUserIdOrderByNameAsc(userId);
  }

  @Transactional
  public Skill upsert(UUID userId, UpsertSkillRequest request) {
    Skill skill =
        skillRepository
            .findByUserIdAndNameIgnoreCase(userId, request.name().trim())
            .orElseGet(
                () ->
                    Skill.builder()
                        .userId(userId)
                        .name(request.name().trim())
                        .source(SkillSource.MANUAL)
                        .build());

    if (request.category() != null) {
      skill.setCategory(request.category());
    } else if (skill.getCategory() == null) {
      skill.setCategory(SkillCategory.OTHER);
    }
    if (request.proficiency() != null) {
      skill.setProficiency(request.proficiency());
    } else if (skill.getProficiency() == null) {
      skill.setProficiency(SkillProficiency.INTERMEDIATE);
    }
    if (request.yearsOfExperience() != null) {
      skill.setYearsOfExperience(request.yearsOfExperience());
    }

    return skillRepository.save(skill);
  }

  @Transactional
  public void delete(UUID userId, UUID skillId) {
    Skill skill =
        skillRepository
            .findByIdAndUserId(skillId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Skill", skillId));
    skillRepository.delete(skill);
  }

  /** Merges Claude-extracted skills into the user's library without clobbering manual edits. */
  @Transactional
  public void mergeExtracted(UUID userId, List<ExtractedSkill> extracted) {
    if (extracted == null) {
      return;
    }

    for (ExtractedSkill candidate : extracted) {
      if (candidate.name() == null || candidate.name().isBlank()) {
        continue;
      }

      Skill skill =
          skillRepository
              .findByUserIdAndNameIgnoreCase(userId, candidate.name().trim())
              .orElseGet(
                  () ->
                      Skill.builder()
                          .userId(userId)
                          .name(candidate.name().trim())
                          .source(SkillSource.RESUME_EXTRACTION)
                          .build());

      if (skill.getSource() == SkillSource.MANUAL) {
        continue; // respect user-owned entries
      }

      skill.setCategory(parseCategory(candidate.category()));
      skill.setProficiency(parseProficiency(candidate.proficiency()));
      if (candidate.yearsOfExperience() != null) {
        skill.setYearsOfExperience(BigDecimal.valueOf(candidate.yearsOfExperience()));
      }
      if (candidate.confidence() != null) {
        skill.setConfidenceScore(BigDecimal.valueOf(candidate.confidence()));
      }
      skillRepository.save(skill);
    }

    log.info("merged {} extracted skills for user {}", extracted.size(), userId);
  }

  private static SkillCategory parseCategory(String raw) {
    try {
      return raw == null ? SkillCategory.OTHER : SkillCategory.valueOf(raw.trim().toUpperCase());
    } catch (IllegalArgumentException exception) {
      return SkillCategory.OTHER;
    }
  }

  private static SkillProficiency parseProficiency(String raw) {
    try {
      return raw == null
          ? SkillProficiency.INTERMEDIATE
          : SkillProficiency.valueOf(raw.trim().toUpperCase());
    } catch (IllegalArgumentException exception) {
      return SkillProficiency.INTERMEDIATE;
    }
  }
}
