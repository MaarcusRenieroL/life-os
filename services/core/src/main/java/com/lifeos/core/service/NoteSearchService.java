package com.lifeos.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.core.domains.dto.response.RecentSearchResponse;
import com.lifeos.core.domains.dto.response.SearchResultResponse;
import com.lifeos.core.domains.dto.response.SearchSuggestionResponse;
import com.lifeos.core.domains.dto.response.TagResponse;
import com.lifeos.core.domains.entity.Note;
import com.lifeos.core.domains.entity.NoteTag;
import com.lifeos.core.domains.entity.Tag;
import com.lifeos.core.repository.NoteFolderRepository;
import com.lifeos.core.repository.NoteRepository;
import com.lifeos.core.repository.NoteTagRepository;
import com.lifeos.core.repository.TagRepository;
import com.lifeos.core.util.NoteContentUtil;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

// Search query language: free text plus operators - tag:name, folder:name,
// before:date, after:date, is:pinned, is:favorite - parsed out of the raw
// query before the remainder is handed to Postgres full-text search.
@Service
@RequiredArgsConstructor
@Transactional
public class NoteSearchService {

  private static final Pattern OPERATOR_PATTERN =
      Pattern.compile("(tag|folder|before|after|is):(\\S+)");
  private static final int RECENT_SEARCHES_LIMIT = 20;

  private final NoteRepository noteRepository;
  private final NoteTagRepository noteTagRepository;
  private final TagRepository tagRepository;
  private final NoteFolderRepository noteFolderRepository;
  private final StringRedisTemplate redisTemplate;

  // Not Spring-managed: spring-boot-starter-webmvc (the modular Boot 4
  // starter this service uses) doesn't pull in Jackson's autoconfiguration
  // the way spring-boot-starter-web does, so there's no ObjectMapper bean to
  // inject here. A plain instance is all recent-searches JSON needs.
  private final ObjectMapper objectMapper = new ObjectMapper();

  public Page<SearchResultResponse> search(UUID userId, String rawQuery, int page, int size) {
    ParsedQuery parsed = parse(rawQuery);
    Pageable pageable = PageRequest.of(page, size);

    Page<Note> results;

    if (StringUtils.hasText(parsed.freeText()) && parsed.operators().isEmpty()) {
      // No operators - use Postgres full-text search directly for
      // relevance-ranked results (title 3x / content 1x weighting lives in
      // the generated tsvector column).
      results = noteRepository.searchByFullText(userId, parsed.freeText(), pageable);
    } else {
      results = noteRepository.findAll(buildSpecification(userId, parsed), pageable);
    }

    recordRecentSearch(userId, rawQuery, results.getTotalElements());

    return results.map(note -> toSearchResult(note, parsed));
  }

  private org.springframework.data.jpa.domain.Specification<Note> buildSpecification(
      UUID userId, ParsedQuery parsed) {
    var spec =
        org.springframework.data.jpa.domain.Specification.allOf(
                NoteSpecifications.userId(userId), NoteSpecifications.notDeleted())
            .and(NoteSpecifications.archived(false));

    Map<String, String> ops = parsed.operators();

    if (ops.containsKey("is")) {
      String flag = ops.get("is");
      if ("pinned".equalsIgnoreCase(flag)) {
        spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isPinned")));
      } else if ("favorite".equalsIgnoreCase(flag)) {
        spec = spec.and((root, query, cb) -> cb.isTrue(root.get("isFavorite")));
      }
    }

    if (ops.containsKey("tag")) {
      var tag = tagRepository.findAllByUserId(userId).stream()
          .filter(t -> t.getName().equalsIgnoreCase(ops.get("tag")))
          .findFirst();
      spec =
          spec.and(
              tag.<org.springframework.data.jpa.domain.Specification<Note>>map(t -> NoteSpecifications.hasTag(t.getId()))
                  .orElse((root, query, cb) -> cb.disjunction()));
    }

    if (ops.containsKey("folder")) {
      var folder = noteFolderRepository.findAllByUserId(userId).stream()
          .filter(f -> f.getName().equalsIgnoreCase(ops.get("folder")))
          .findFirst();
      spec =
          spec.and(
              folder.<org.springframework.data.jpa.domain.Specification<Note>>map(f -> NoteSpecifications.inFolder(f.getId()))
                  .orElse((root, query, cb) -> cb.disjunction()));
    }

    if (ops.containsKey("before")) {
      java.time.Instant before = parseDate(ops.get("before"));
      if (before != null) {
        spec = spec.and((root, query, cb) -> cb.lessThan(root.get("createdAt"), before));
      }
    }

    if (ops.containsKey("after")) {
      java.time.Instant after = parseDate(ops.get("after"));
      if (after != null) {
        spec = spec.and((root, query, cb) -> cb.greaterThan(root.get("createdAt"), after));
      }
    }

    if (StringUtils.hasText(parsed.freeText())) {
      String like = "%" + parsed.freeText().toLowerCase() + "%";
      spec =
          spec.and(
              (root, query, cb) ->
                  cb.or(
                      cb.like(cb.lower(root.get("title")), like),
                      cb.like(cb.lower(root.get("contentPlainText")), like)));
    }

    return spec;
  }

  private java.time.Instant parseDate(String value) {
    try {
      return java.time.LocalDate.parse(value).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
    } catch (Exception e) {
      return null;
    }
  }

  public List<SearchSuggestionResponse> suggestions(UUID userId, String query, String type) {
    if (!StringUtils.hasText(query)) {
      return List.of();
    }

    return switch (type == null ? "title" : type) {
      case "tag" ->
          tagRepository.findAllByUserIdAndNameStartingWithIgnoreCase(userId, query).stream()
              .limit(10)
              .map(tag -> SearchSuggestionResponse.builder().id(tag.getId()).label(tag.getName()).type("tag").build())
              .toList();
      case "folder" ->
          noteFolderRepository.findAllByUserId(userId).stream()
              .filter(f -> f.getName().toLowerCase().startsWith(query.toLowerCase()))
              .limit(10)
              .map(
                  folder ->
                      SearchSuggestionResponse.builder()
                          .id(folder.getId())
                          .label(folder.getName())
                          .type("folder")
                          .build())
              .toList();
      default ->
          noteRepository
              .searchByFullText(userId, query, PageRequest.of(0, 10))
              .stream()
              .map(
                  note ->
                      SearchSuggestionResponse.builder()
                          .id(note.getId())
                          .label(note.getTitle())
                          .type("title")
                          .build())
              .toList();
    };
  }

  public List<RecentSearchResponse> recentSearches(UUID userId) {
    List<String> raw =
        redisTemplate.opsForList().range(recentSearchesKey(userId), 0, RECENT_SEARCHES_LIMIT - 1);

    if (raw == null) {
      return List.of();
    }

    return raw.stream()
        .map(
            json -> {
              try {
                return objectMapper.readValue(json, RecentSearchResponse.class);
              } catch (Exception e) {
                return null;
              }
            })
        .filter(java.util.Objects::nonNull)
        .toList();
  }

  private void recordRecentSearch(UUID userId, String query, long resultCount) {
    if (!StringUtils.hasText(query)) {
      return;
    }

    try {
      RecentSearchResponse entry =
          RecentSearchResponse.builder()
              .query(query)
              .timestamp(Instant.now().toEpochMilli())
              .resultCount((int) resultCount)
              .build();

      String key = recentSearchesKey(userId);
      redisTemplate.opsForList().leftPush(key, objectMapper.writeValueAsString(entry));
      redisTemplate.opsForList().trim(key, 0, RECENT_SEARCHES_LIMIT - 1);
      redisTemplate.expire(key, java.time.Duration.ofDays(1));
    } catch (Exception ignored) {
      // Recent-search history is a convenience feature, not the search
      // result itself - never fail the actual search over a Redis hiccup.
    }
  }

  private String recentSearchesKey(UUID userId) {
    return "user:" + userId + ":recent-searches";
  }

  private ParsedQuery parse(String rawQuery) {
    if (!StringUtils.hasText(rawQuery)) {
      return new ParsedQuery("", Map.of());
    }

    Matcher matcher = OPERATOR_PATTERN.matcher(rawQuery);
    java.util.Map<String, String> operators = new java.util.HashMap<>();

    while (matcher.find()) {
      operators.put(matcher.group(1), matcher.group(2));
    }

    String freeText = OPERATOR_PATTERN.matcher(rawQuery).replaceAll("").trim();

    return new ParsedQuery(freeText, operators);
  }

  private SearchResultResponse toSearchResult(Note note, ParsedQuery parsed) {
    List<TagResponse> tags = tagsFor(note.getId());
    List<String> matchedFields = new java.util.ArrayList<>();

    if (StringUtils.hasText(parsed.freeText())) {
      if (note.getTitle() != null
          && note.getTitle().toLowerCase().contains(parsed.freeText().toLowerCase())) {
        matchedFields.add("title");
      }
      matchedFields.add("content");
    }

    return SearchResultResponse.builder()
        .id(note.getId())
        .title(note.getTitle())
        .excerpt(NoteContentUtil.excerpt(note.getContentPlainText(), 200))
        .tags(tags)
        .matchedFields(matchedFields)
        .updatedAt(note.getUpdatedAt())
        .build();
  }

  private List<TagResponse> tagsFor(UUID noteId) {
    List<UUID> tagIds = noteTagRepository.findAllByNoteId(noteId).stream().map(NoteTag::getTagId).toList();

    if (tagIds.isEmpty()) {
      return List.of();
    }

    return tagRepository.findAllById(tagIds).stream()
        .map((Tag tag) -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
        .toList();
  }

  private record ParsedQuery(String freeText, Map<String, String> operators) {}
}
