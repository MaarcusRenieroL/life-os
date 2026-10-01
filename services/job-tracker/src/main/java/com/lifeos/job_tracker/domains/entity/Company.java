package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.CompanySize;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import com.lifeos.job_tracker.domains.record.KnownPerson;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "companies", schema = "job_tracker_schema")
public class Company {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  String name;

  String industry;

  @Enumerated(EnumType.STRING)
  CompanySize size;

  String website;

  @Column(name = "linkedin_url")
  String linkedinUrl;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "known_people_json")
  List<KnownPerson> knownPeople;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
