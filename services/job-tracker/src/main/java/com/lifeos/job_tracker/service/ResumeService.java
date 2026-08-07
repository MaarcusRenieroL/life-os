package com.lifeos.job_tracker.service;

import com.lifeos.job_tracker.domains.entity.ResumeTemplate;
import com.lifeos.job_tracker.domains.record.ResumeUploadResult;
import com.lifeos.job_tracker.repository.ResumeTemplateRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ResumeService {

  @Value("${resume.storage-path}")
  private String resumeStoragePath;

  private final ResumeTemplateRepository resumeTemplateRepository;

  public ResumeUploadResult upload(Authentication authentication, MultipartFile file)
      throws IOException {
    UUID userId = (UUID) authentication.getPrincipal();
    byte[] fileBytes = file.getBytes();

    String resumeText;

    try (PDDocument document = Loader.loadPDF(fileBytes)) {
      resumeText = new PDFTextStripper().getText(document);
    }

    Path userDir = Path.of(resumeStoragePath, userId.toString());
    Files.createDirectories(userDir);

    Path filePath = userDir.resolve(UUID.randomUUID() + ".pdf");
    Files.write(filePath, fileBytes);

    resumeTemplateRepository
        .findByUserIdAndIsActiveTrue(userId)
        .ifPresent(
            existing -> {
              existing.setIsActive(false);
              resumeTemplateRepository.save(existing);
            });

    ResumeTemplate resumeTemplate =
        ResumeTemplate.builder()
            .userId(userId)
            .s3Path(filePath.toString())
            .uploadedAt(Instant.now())
            .updatedAt(Instant.now())
            .version(String.valueOf(Instant.now().toEpochMilli()))
            .isActive(true)
            .resumeText(resumeText)
            .build();

    ResumeTemplate saved = resumeTemplateRepository.saveAndFlush(resumeTemplate);

    return new ResumeUploadResult(saved, resumeText);
  }
}
