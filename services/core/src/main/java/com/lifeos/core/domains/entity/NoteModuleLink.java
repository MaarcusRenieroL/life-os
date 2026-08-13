package com.lifeos.core.domains.entity;

import com.lifeos.core.domains.enums.NoteModuleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "note_module_links", schema = "core_schema")
public class NoteModuleLink {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "note_id")
  UUID noteId;

  @Enumerated(EnumType.STRING)
  @Column(name = "module_type")
  NoteModuleType moduleType;

  @Column(name = "module_id")
  UUID moduleId;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
