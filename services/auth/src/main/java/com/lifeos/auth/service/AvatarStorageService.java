package com.lifeos.auth.service;

import com.lifeos.auth.exception.InvalidAvatarException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Stores one avatar image per user on a local/volume-mounted directory, same pattern as
 * job-tracker's ResumeStorageService. A new upload overwrites the previous file (a profile photo
 * has no history worth keeping, unlike a resume). */
@Service
public class AvatarStorageService {

  private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
  private static final long MAX_SIZE_BYTES = 2 * 1024 * 1024;

  private final String storageDir;

  public AvatarStorageService(@Value("${avatar.storage-dir:/data/avatars}") String storageDir) {
    this.storageDir = storageDir;
  }

  public String store(UUID userId, String previousKey, MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new InvalidAvatarException("Avatar file is empty");
    }
    if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
      throw new InvalidAvatarException("Avatar must be a PNG, JPEG, or WebP image");
    }
    if (file.getSize() > MAX_SIZE_BYTES) {
      throw new InvalidAvatarException("Avatar must be under 2MB");
    }

    String extension = switch (file.getContentType()) {
      case "image/png" -> "png";
      case "image/webp" -> "webp";
      default -> "jpg";
    };
    String key = userId + "-" + UUID.randomUUID() + "." + extension;
    Path target = root().resolve(key);

    try {
      Files.createDirectories(target.getParent());
      file.transferTo(target);
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to store avatar", exception);
    }

    if (previousKey != null) {
      deleteQuietly(previousKey);
    }

    return key;
  }

  public byte[] read(String key) {
    try {
      return Files.readAllBytes(root().resolve(key));
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to read avatar " + key, exception);
    }
  }

  public void delete(String key) {
    deleteQuietly(key);
  }

  private void deleteQuietly(String key) {
    try {
      Files.deleteIfExists(root().resolve(key));
    } catch (IOException exception) {
      throw new UncheckedIOException("Failed to delete avatar " + key, exception);
    }
  }

  private Path root() {
    return Path.of(storageDir);
  }
}
