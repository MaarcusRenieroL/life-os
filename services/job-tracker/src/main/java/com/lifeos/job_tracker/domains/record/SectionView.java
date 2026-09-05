package com.lifeos.job_tracker.domains.record;

import java.util.List;

/** A normalized view of one resume section, used wherever section content needs rendering. */
public record SectionView(String sectionType, String title, List<Object> content) {}
