package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.dto.request.UpsertCareerProfileRequest;
import com.lifeos.job_tracker.domains.dto.request.UpsertProjectRequest;
import com.lifeos.job_tracker.domains.dto.request.UpsertWorkExperienceRequest;
import com.lifeos.job_tracker.domains.entity.CareerProfile;
import com.lifeos.job_tracker.domains.entity.Project;
import com.lifeos.job_tracker.domains.entity.WorkExperience;
import com.lifeos.job_tracker.domains.record.ParsedResume;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import com.lifeos.job_tracker.exception.ResourceNotFoundException;
import com.lifeos.job_tracker.integration.AiAssistant;
import com.lifeos.job_tracker.integration.PdfTextExtractor;
import com.lifeos.job_tracker.repository.CareerProfileRepository;
import com.lifeos.job_tracker.repository.ProjectRepository;
import com.lifeos.job_tracker.repository.SkillRepository;
import com.lifeos.job_tracker.repository.WorkExperienceRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * The candidate's structured career history - contact/summary, work experience, projects, and
 * (via {@link SkillService}) skills. Its existence gates the rest of the job-tracker module: a
 * candidate must complete this once, either by upload or by hand, before anything else works.
 * Every tailored resume from then on is built from this, not from re-parsing one static PDF.
 */
@Service
@RequiredArgsConstructor
public class CareerProfileService {

  private final CareerProfileRepository careerProfileRepository;
  private final WorkExperienceRepository workExperienceRepository;
  private final ProjectRepository projectRepository;
  private final SkillRepository skillRepository;
  private final SkillService skillService;
  private final PdfTextExtractor pdfTextExtractor;
  private final AiAssistant ai;

  @Transactional(readOnly = true)
  public boolean isOnboarded(UUID userId) {
    return careerProfileRepository.existsById(userId);
  }

  @Transactional(readOnly = true)
  public CareerProfile getProfile(UUID userId) {
    return careerProfileRepository
        .findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("Complete your career profile first"));
  }

  @Transactional
  public CareerProfile upsertProfile(UUID userId, UpsertCareerProfileRequest request) {
    CareerProfile profile =
        careerProfileRepository
            .findById(userId)
            .orElseGet(() -> CareerProfile.builder().userId(userId).build());
    profile.setFullName(request.fullName());
    profile.setEmail(request.email());
    profile.setPhone(request.phone());
    profile.setLocation(request.location());
    profile.setGithubUrl(request.githubUrl());
    profile.setLinkedinUrl(request.linkedinUrl());
    profile.setPortfolioUrl(request.portfolioUrl());
    profile.setSummary(request.summary());
    return careerProfileRepository.save(profile);
  }

  @Transactional(readOnly = true)
  public List<WorkExperience> listExperiences(UUID userId) {
    return workExperienceRepository.findAllByUserIdOrderByDisplayOrderAsc(userId);
  }

  @Transactional
  public WorkExperience upsertExperience(UUID userId, UUID experienceId, UpsertWorkExperienceRequest request) {
    WorkExperience experience =
        experienceId == null
            ? WorkExperience.builder().userId(userId).build()
            : workExperienceRepository
                .findByIdAndUserId(experienceId, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("Work experience", experienceId));
    experience.setTitle(request.title());
    experience.setCompany(request.company());
    experience.setLocation(request.location());
    experience.setStartDate(request.startDate());
    experience.setEndDate(request.endDate());
    experience.setCurrent(request.current());
    experience.setBullets(request.bullets());
    experience.setDisplayOrder(request.displayOrder());
    return workExperienceRepository.save(experience);
  }

  @Transactional
  public void deleteExperience(UUID userId, UUID experienceId) {
    WorkExperience experience =
        workExperienceRepository
            .findByIdAndUserId(experienceId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Work experience", experienceId));
    workExperienceRepository.delete(experience);
  }

  @Transactional(readOnly = true)
  public List<Project> listProjects(UUID userId) {
    return projectRepository.findAllByUserIdOrderByDisplayOrderAsc(userId);
  }

  @Transactional
  public Project upsertProject(UUID userId, UUID projectId, UpsertProjectRequest request) {
    Project project =
        projectId == null
            ? Project.builder().userId(userId).build()
            : projectRepository
                .findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("Project", projectId));
    project.setName(request.name());
    project.setDescription(request.description());
    project.setTechStack(request.techStack());
    project.setLink(request.link());
    project.setStartDate(request.startDate());
    project.setEndDate(request.endDate());
    project.setBullets(request.bullets());
    project.setDisplayOrder(request.displayOrder());
    return projectRepository.save(project);
  }

  @Transactional
  public void deleteProject(UUID userId, UUID projectId) {
    Project project =
        projectRepository
            .findByIdAndUserId(projectId, userId)
            .orElseThrow(() -> ResourceNotFoundException.of("Project", projectId));
    projectRepository.delete(project);
  }

  /**
   * The upload path through onboarding: parses a resume PDF into the full structured profile in
   * one shot (contact info, summary, every work experience, every project, every skill) so the
   * candidate reviews and edits rather than typing it all from scratch. Replaces any existing
   * profile/experience/project rows - this is meant for first-time onboarding or a deliberate
   * full re-import, not an incremental merge.
   */
  @Transactional
  public CareerProfile seedFromResume(UUID userId, MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new InvalidRequestException("No file was uploaded");
    }
    byte[] bytes;
    try {
      bytes = file.getBytes();
    } catch (java.io.IOException exception) {
      throw new InvalidRequestException("Could not read the uploaded file");
    }
    if (!ai.available()) {
      throw new InvalidRequestException("Reading a resume needs an AI provider; set ANTHROPIC_API_KEY or enable Ollama");
    }

    String text = pdfTextExtractor.extract(bytes);
    if (text == null || text.isBlank()) {
      throw new InvalidRequestException("Could not read text from this PDF");
    }

    ParsedResume parsed = ai.parseResume(text);

    CareerProfile profile =
        careerProfileRepository
            .findById(userId)
            .orElseGet(() -> CareerProfile.builder().userId(userId).build());
    profile.setFullName(parsed.name());
    profile.setEmail(parsed.email());
    profile.setPhone(parsed.phone());
    profile.setLocation(parsed.location());
    profile.setGithubUrl(parsed.githubUrl());
    profile.setLinkedinUrl(parsed.linkedinUrl());
    profile.setPortfolioUrl(parsed.portfolioUrl());
    profile.setSummary(parsed.summary());
    profile = careerProfileRepository.save(profile);

    workExperienceRepository.deleteByUserId(userId);
    List<ParsedResume.Experience> experiences = parsed.experience() == null ? List.of() : parsed.experience();
    for (int i = 0; i < experiences.size(); i++) {
      ParsedResume.Experience e = experiences.get(i);
      workExperienceRepository.save(
          WorkExperience.builder()
              .userId(userId)
              .title(blank(e.title()))
              .company(blank(e.company()))
              .location(e.location())
              .startDate(parseDate(e.startDate()))
              .endDate(parseDate(e.endDate()))
              .current(e.endDate() != null && e.endDate().toLowerCase().contains("present"))
              .bullets(e.bullets())
              .displayOrder(i)
              .build());
    }

    projectRepository.deleteByUserId(userId);
    List<ParsedResume.ProjectExtract> projects = parsed.projects() == null ? List.of() : parsed.projects();
    for (int i = 0; i < projects.size(); i++) {
      ParsedResume.ProjectExtract p = projects.get(i);
      projectRepository.save(
          Project.builder()
              .userId(userId)
              .name(blank(p.name()))
              .description(p.description())
              .techStack(p.techStack())
              .link(p.link())
              .startDate(parseDate(p.startDate()))
              .endDate(parseDate(p.endDate()))
              .bullets(p.bullets())
              .displayOrder(i)
              .build());
    }

    skillService.mergeExtracted(userId, parsed.skills());

    return profile;
  }

  /**
   * Renders the full profile as plain text for the tailoring/cover-letter prompts - contact info,
   * summary, every work experience and project with its real bullets and links, and the full
   * skill library. This is what "candidate background" means from here on, not one resume's text.
   */
  @Transactional(readOnly = true)
  public String buildProfileText(UUID userId) {
    CareerProfile profile = getProfile(userId);
    StringBuilder text = new StringBuilder();
    text.append(blank(profile.getFullName())).append('\n');
    text.append(
        String.join(
            " | ",
            List.of(
                    profile.getEmail(),
                    profile.getPhone(),
                    profile.getLocation(),
                    profile.getGithubUrl(),
                    profile.getLinkedinUrl(),
                    profile.getPortfolioUrl())
                .stream()
                .filter(v -> v != null && !v.isBlank())
                .toList()));
    text.append("\n\n");
    if (profile.getSummary() != null && !profile.getSummary().isBlank()) {
      text.append("SUMMARY\n").append(profile.getSummary()).append("\n\n");
    }

    text.append("EXPERIENCE\n");
    for (WorkExperience e : listExperiences(userId)) {
      text.append(blank(e.getTitle())).append(" at ").append(blank(e.getCompany()));
      if (e.getLocation() != null && !e.getLocation().isBlank()) {
        text.append(", ").append(e.getLocation());
      }
      text.append(" (")
          .append(e.getStartDate() == null ? "?" : e.getStartDate())
          .append(" to ")
          .append(e.isCurrent() ? "Present" : e.getEndDate() == null ? "?" : e.getEndDate().toString())
          .append(")\n");
      for (String bullet : safe(e.getBullets())) {
        text.append("- ").append(bullet).append('\n');
      }
      text.append('\n');
    }

    text.append("PROJECTS\n");
    for (Project p : listProjects(userId)) {
      text.append(blank(p.getName()));
      if (p.getLink() != null && !p.getLink().isBlank()) {
        text.append(" (").append(p.getLink()).append(")");
      }
      if (p.getTechStack() != null && !p.getTechStack().isEmpty()) {
        text.append(" - ").append(String.join(", ", p.getTechStack()));
      }
      text.append('\n');
      if (p.getDescription() != null && !p.getDescription().isBlank()) {
        text.append(p.getDescription()).append('\n');
      }
      for (String bullet : safe(p.getBullets())) {
        text.append("- ").append(bullet).append('\n');
      }
      text.append('\n');
    }

    text.append("SKILLS (grouped by category - keep this grouping in the resume's Skills section,\n");
    text.append("don't flatten it into one undifferentiated list)\n");
    skillRepository.findAllByUserIdOrderByNameAsc(userId).stream()
        .collect(java.util.stream.Collectors.groupingBy(
            s -> s.getCategory() == null ? com.lifeos.job_tracker.domains.enums.SkillCategory.OTHER : s.getCategory(),
            java.util.LinkedHashMap::new,
            java.util.stream.Collectors.mapping(com.lifeos.job_tracker.domains.entity.Skill::getName, java.util.stream.Collectors.toList())))
        .forEach((category, names) -> text.append(category).append(": ").append(String.join(", ", names)).append('\n'));

    return text.toString();
  }

  private static <T> List<T> safe(List<T> list) {
    return list == null ? List.of() : list;
  }

  private static String blank(String value) {
    return value == null ? "" : value;
  }

  private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
  private static final DateTimeFormatter YEAR_MONTH = DateTimeFormatter.ofPattern("yyyy-MM", java.util.Locale.ENGLISH);
  private static final DateTimeFormatter MONTH_NAME_YEAR =
      DateTimeFormatter.ofPattern("MMM yyyy", java.util.Locale.ENGLISH);
  private static final DateTimeFormatter FULL_MONTH_NAME_YEAR =
      DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.ENGLISH);

  /** Resume dates come back as free text - "Aug 2024", "August 2024", "2024-08", full ISO, or
   * "Present" - despite the prompt asking for ISO. Tries each real shape in turn; only "Present"
   * (or something genuinely unparseable) is left null rather than guessing a day. */
  private static LocalDate parseDate(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    String trimmed = raw.trim();
    try {
      return LocalDate.parse(trimmed, ISO_DATE);
    } catch (DateTimeParseException ignored) {
      // fall through
    }
    try {
      return java.time.YearMonth.parse(trimmed, YEAR_MONTH).atDay(1);
    } catch (DateTimeParseException ignored) {
      // fall through
    }
    try {
      return java.time.YearMonth.parse(trimmed, MONTH_NAME_YEAR).atDay(1);
    } catch (DateTimeParseException ignored) {
      // fall through
    }
    try {
      return java.time.YearMonth.parse(trimmed, FULL_MONTH_NAME_YEAR).atDay(1);
    } catch (DateTimeParseException exception) {
      return null;
    }
  }
}
