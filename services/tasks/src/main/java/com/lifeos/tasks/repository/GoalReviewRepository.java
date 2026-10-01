package com.lifeos.tasks.repository;

import com.lifeos.tasks.domains.entity.GoalReview;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalReviewRepository extends JpaRepository<GoalReview, UUID> {

  List<GoalReview> findAllByGoalIdOrderByReviewDateDescCreatedAtDesc(UUID goalId);
}
