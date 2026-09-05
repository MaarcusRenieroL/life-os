package com.lifeos.job_tracker.repository;

import com.lifeos.job_tracker.domains.entity.CoverLetterVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoverLetterVersionRepository extends JpaRepository<CoverLetterVersion, UUID> {

  List<CoverLetterVersion> findAllByCoverLetterIdOrderByVersionDesc(UUID coverLetterId);

  Optional<CoverLetterVersion> findByCoverLetterIdAndVersion(UUID coverLetterId, int version);

  Optional<CoverLetterVersion> findFirstByCoverLetterIdOrderByVersionDesc(UUID coverLetterId);
}
