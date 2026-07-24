package com.lifeos.auth.service;

import com.lifeos.auth.domains.dto.response.UserProfileResponse;
import com.lifeos.auth.domains.entity.User;
import com.lifeos.auth.exception.UserNotFoundException;
import com.lifeos.auth.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;

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

    return UserProfileResponse.builder()
        .id(user.getId())
        .name(user.getName())
        .email(user.getEmail())
        .build();
  }

  public UserProfileResponse updateProfile(UUID userId, String name) {
    User existingUser =
        userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

    existingUser.setName(name);

    userRepository.save(existingUser);

    return UserProfileResponse.builder()
        .id(existingUser.getId())
        .name(existingUser.getName())
        .email(existingUser.getEmail())
        .build();
  }
}
