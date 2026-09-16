package com.lifeos.job_tracker;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.lifeos.job_tracker.domains.entity.Skill;
import com.lifeos.job_tracker.domains.enums.SkillSource;
import com.lifeos.job_tracker.domains.record.ExtractedSkill;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.repository.SkillRepository;
import com.lifeos.job_tracker.service.SkillService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SkillServiceTest {

  @Mock private SkillRepository skillRepository;
  @InjectMocks private SkillService skillService;

  private final UUID userId = UUID.randomUUID();

  @Test
  void mergeExtractedSkipsSkillsTheUserOwnsManually() {
    Skill manual = Skill.builder().userId(userId).name("Java").source(SkillSource.MANUAL).build();
    when(skillRepository.findByUserIdAndNameIgnoreCase(userId, "Java")).thenReturn(Optional.of(manual));

    skillService.mergeExtracted(
        userId, List.of(new ExtractedSkill("Java", "LANGUAGE", "EXPERT", 5.0, 0.9)));

    verify(skillRepository, never()).save(any());
  }

  @Test
  void deleteUnknownSkillThrowsNotFound() {
    UUID skillId = UUID.randomUUID();
    when(skillRepository.findByIdAndUserId(skillId, userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> skillService.delete(userId, skillId))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  void listDelegatesToRepository() {
    when(skillRepository.findAllByUserIdOrderByNameAsc(userId))
        .thenReturn(List.of(Skill.builder().name("Go").build()));

    assertThat(skillService.list(userId)).hasSize(1);
  }
}
