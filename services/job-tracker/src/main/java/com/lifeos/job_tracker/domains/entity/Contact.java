package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.RelationshipType;
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
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "contacts", schema = "job_tracker_schema")
public class Contact {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "company_id")
  UUID companyId;

  String name;

  String role;

  String email;

  String phone;

  @Column(name = "linkedin_url")
  String linkedinUrl;

  @Enumerated(EnumType.STRING)
  @Column(name = "relationship_type")
  RelationshipType relationshipType;

  @Column(name = "is_vip")
  boolean vip;

  @Column(name = "last_interaction_date")
  Instant lastInteractionDate;

  String notes;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
