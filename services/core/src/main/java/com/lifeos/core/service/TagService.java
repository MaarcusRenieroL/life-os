package com.lifeos.core.service;

import com.lifeos.core.domains.dto.request.CreateTagRequest;
import com.lifeos.core.domains.dto.request.UpdateTagRequest;
import com.lifeos.core.domains.dto.response.TagResponse;
import com.lifeos.core.domains.entity.Tag;
import com.lifeos.core.exception.NoteConflictException;
import com.lifeos.core.exception.TagNotFoundException;
import com.lifeos.core.repository.NoteTagRepository;
import com.lifeos.core.repository.TagRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class TagService {

  private final TagRepository tagRepository;
  private final NoteTagRepository noteTagRepository;

  @Cacheable(value = "user-tags", key = "#userId")
  public List<TagResponse> getAll(UUID userId) {
    return withUsageCounts(tagRepository.findAllByUserId(userId));
  }

  public List<TagResponse> search(UUID userId, String search, int limit) {
    List<Tag> tags =
        StringUtils.hasText(search)
            ? tagRepository.findAllByUserIdAndNameContainingIgnoreCase(userId, search)
            : tagRepository.findAllByUserId(userId);

    return withUsageCounts(tags.stream().limit(limit).toList());
  }

  @CacheEvict(value = "user-tags", key = "#userId")
  public TagResponse create(UUID userId, CreateTagRequest request) {
    tagRepository
        .findByUserIdAndNameIgnoreCase(userId, request.getName())
        .ifPresent(
            existing -> {
              throw new NoteConflictException("Tag already exists");
            });

    Tag tag =
        Tag.builder().userId(userId).name(request.getName()).color(request.getColor()).build();

    return toResponse(tagRepository.save(tag), 0);
  }

  // Used when a note's tag list includes a name that doesn't exist yet
  // (POST/PUT note with free-text tags) - creates it on the fly instead of
  // requiring a separate "create tag" round trip first.
  @CacheEvict(value = "user-tags", key = "#userId")
  public Tag getOrCreateEntity(UUID userId, String name) {
    return tagRepository
        .findByUserIdAndNameIgnoreCase(userId, name)
        .orElseGet(() -> tagRepository.save(Tag.builder().userId(userId).name(name).build()));
  }

  @CacheEvict(value = "user-tags", key = "#userId")
  public TagResponse update(UUID userId, UUID id, UpdateTagRequest request) {
    Tag tag = tagRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new TagNotFoundException(id));

    if (StringUtils.hasText(request.getName())) {
      tag.setName(request.getName());
    }

    if (request.getColor() != null) {
      tag.setColor(request.getColor());
    }

    Tag saved = tagRepository.save(tag);
    return toResponse(saved, noteTagRepository.countByTagId(saved.getId()));
  }

  @CacheEvict(value = "user-tags", key = "#userId")
  public void delete(UUID userId, UUID id) {
    tagRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new TagNotFoundException(id));

    tagRepository.deleteByIdAndUserId(id, userId);
  }

  Tag requireOwned(UUID userId, UUID id) {
    return tagRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new TagNotFoundException(id));
  }

  private List<TagResponse> withUsageCounts(List<Tag> tags) {
    if (tags.isEmpty()) {
      return List.of();
    }

    List<UUID> ids = tags.stream().map(Tag::getId).toList();
    Map<UUID, Long> usage =
        tagRepository.countUsageForTags(ids).stream()
            .collect(Collectors.toMap(TagRepository.TagUsage::getTagId, TagRepository.TagUsage::getUsageCount));

    return tags.stream().map(tag -> toResponse(tag, usage.getOrDefault(tag.getId(), 0L))).toList();
  }

  private TagResponse toResponse(Tag tag, long usageCount) {
    return TagResponse.builder()
        .id(tag.getId())
        .name(tag.getName())
        .color(tag.getColor())
        .usageCount(usageCount)
        .createdAt(tag.getCreatedAt())
        .build();
  }
}
