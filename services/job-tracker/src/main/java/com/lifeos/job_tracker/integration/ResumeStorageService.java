package com.lifeos.job_tracker.integration;

import com.lifeos.job_tracker.config.JobTrackerProperties;
import com.lifeos.job_tracker.exception.InvalidRequestException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Stores resume PDFs on a local/volume-mounted directory keyed by {@code <userId>/<uuid>.pdf}. */
@Service
@RequiredArgsConstructor
public class ResumeStorageService {

  private final JobTrackerProperties properties;

  public String store(UUID userId, MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new InvalidRequestException("Resume file is empty");
    }

    String key = userId + "/" + UUID.randomUUID() + ".pdf";
    Path target = root().resolve(key);

    try {
      Files.createDirectories(target.getParent());
      file.transferTo(target);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to store resume", exception);
    }

    return key;
  }

  public String storeBytes(UUID userId, byte[] content, String extension) {
    String key = userId + "/" + UUID.randomUUID() + "." + extension;
    Path target = root().resolve(key);

    try {
      Files.createDirectories(target.getParent());
      Files.write(target, content);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to store generated resume", exception);
    }

    return key;
  }

  public byte[] read(String fileKey) {
    try {
      return Files.readAllBytes(root().resolve(fileKey));
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to read resume " + fileKey, exception);
    }
  }

  public void delete(String fileKey) {
    try {
      Files.deleteIfExists(root().resolve(fileKey));
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to delete resume " + fileKey, exception);
    }
  }

  private Path root() {
    return Path.of(properties.storage().resumeDir());
  }
}
