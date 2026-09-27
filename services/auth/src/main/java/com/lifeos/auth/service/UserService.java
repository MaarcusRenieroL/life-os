package com.lifeos.auth.service;

import com.lifeos.auth.domains.dto.response.UserProfileResponse;
import com.lifeos.auth.domains.entity.User;
import com.lifeos.auth.exception.UserNotFoundException;
import com.lifeos.auth.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;
  private final AvatarStorageService avatarStorageService;

  public User createUser(String email, String passwordHash) {
    return userRepository.save(User.builder().email(email).passwordHash(passwordHash).build());
  }

  public Optional<User> findByEmail(String email) {
    return userRepository.findByEmail(email);
  }

  public User findById(UUID userId) {
    return userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
  }

  public boolean existsByEmail(String email) {
    return userRepository.existsByEmail(email);
  }

  public UserProfileResponse getProfile(UUID userId) {
    User user =
        userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

    return toResponse(user);
  }

  public UserProfileResponse updateProfile(UUID userId, String name) {
    User existingUser =
        userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

    existingUser.setName(name);

    userRepository.save(existingUser);

    return toResponse(existingUser);
  }

  public UserProfileResponse updateAvatar(UUID userId, MultipartFile file) {
    User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

    String newKey = avatarStorageService.store(userId, user.getAvatarKey(), file);
    user.setAvatarKey(newKey);
    userRepository.save(user);

    return toResponse(user);
  }

  public UserProfileResponse deleteAvatar(UUID userId) {
    User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

    if (user.getAvatarKey() != null) {
      avatarStorageService.delete(user.getAvatarKey());
      user.setAvatarKey(null);
      userRepository.save(user);
    }

    return toResponse(user);
  }

  public byte[] getAvatarBytes(UUID userId) {
    User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

    if (user.getAvatarKey() == null) {
      throw new UserNotFoundException(userId);
    }

    return avatarStorageService.read(user.getAvatarKey());
  }

  public String getAvatarContentType(UUID userId) {
    User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
    String key = user.getAvatarKey();

    if (key != null && key.endsWith(".png")) return "image/png";
    if (key != null && key.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  }

  private UserProfileResponse toResponse(User user) {
    return UserProfileResponse.builder()
        .id(user.getId())
        .name(user.getName())
        .email(user.getEmail())
        .hasAvatar(user.getAvatarKey() != null)
        .build();
  }
}
