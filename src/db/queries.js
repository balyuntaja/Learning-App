export const Q = {
  /* -------------------------------------------
   * USER
   * ------------------------------------------- */
  user_by_email: `
    SELECT id, email, display_name, image_path, created_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `,

  /* -------------------------------------------
   * LAST ACTIVITY
   * ------------------------------------------- */
  lastActivity: `
    SELECT GREATEST(
      COALESCE(MAX(last_viewed), '1970-01-01'),
      COALESCE(MAX(completed_at), '1970-01-01')
    ) AS last_activity
    FROM developer_journey_trackings
    WHERE developer_id = $1
  `,

  /* -------------------------------------------
   * WEEKLY RANGE
   * ------------------------------------------- */
  trackingsByRange: `
    SELECT *
    FROM developer_journey_trackings
    WHERE developer_id = $1
      AND (
        (last_viewed BETWEEN $2 AND $3) OR
        (completed_at BETWEEN $2 AND $3)
      )
  `,

  submissionsByRange: `
    SELECT *
    FROM developer_journey_submissions
    WHERE submitter_id = $1
      AND created_at BETWEEN $2 AND $3
  `,

  completionsByRange: `
    SELECT *
    FROM developer_journey_completions
    WHERE user_id = $1
      AND updated_at BETWEEN $2 AND $3
  `,

  examRegsByRange: `
    SELECT *
    FROM exam_registrations
    WHERE examinees_id = $1
      AND created_at BETWEEN $2 AND $3
  `,

  examResultsByRegIds: `
    SELECT 
  r.exam_registration_id,
  er.*,
  r.score,
  r.total_questions,
  r.is_passed,
  d.title AS quiz_title
  FROM exam_results r
    JOIN exam_registrations er ON er.id = r.exam_registration_id
    JOIN developer_journey_tutorials d ON d.id = er.tutorial_id
    WHERE r.exam_registration_id = ANY($1::bigint[]);
  `,

  /* -------------------------------------------
   * JOURNEYS
   * ------------------------------------------- */
  journeys_by_user: `
    SELECT j.id, j.name, j.image_path, j.hours_to_study,
      EXISTS (
        SELECT 1
        FROM developer_journey_trackings t
        WHERE t.journey_id = j.id
          AND t.developer_id = $1
          AND (
            (t.last_viewed BETWEEN $2 AND $3)
            OR (t.completed_at BETWEEN $2 AND $3)
          )
      ) AS active_this_week
    FROM developer_journeys j
    WHERE j.id IN (
      SELECT journey_id
      FROM developer_journey_trackings
      WHERE developer_id = $1
    )
  `,

  /* -------------------------------------------
   * WEEKLY TUTORIAL TRACKINGS WITH TITLE
   * ------------------------------------------- */
  weeklyTutorials: `
    SELECT DISTINCT ON (t.tutorial_id)
      t.tutorial_id,
      t.journey_id,
      t.status,
      t.last_viewed,
      t.completed_at,
      d.title
    FROM developer_journey_trackings t
    JOIN developer_journey_tutorials d ON d.id = t.tutorial_id
    WHERE t.developer_id = $1
      AND (
        (t.last_viewed BETWEEN $2 AND $3)
        OR (t.completed_at BETWEEN $2 AND $3)
      )
    ORDER BY t.tutorial_id,
             t.completed_at DESC NULLS LAST,
             t.last_viewed DESC NULLS LAST
  `,

  /* -------------------------------------------
   * WEEKLY COMPLETED COUNT
   * ------------------------------------------- */
  weeklyCompletedTutorials: `
  SELECT journey_id, COUNT(DISTINCT tutorial_id) AS completed
  FROM developer_journey_trackings
  WHERE developer_id = $1
    AND status = 1
    AND completed_at BETWEEN $2 AND $3
  GROUP BY journey_id
`,


  /* -------------------------------------------
   * ALL TUTORIALS PER JOURNEY (for ML)
   * ------------------------------------------- */
  allTutorialsByUserJourney: `
    SELECT id, developer_journey_id
    FROM developer_journey_tutorials
    WHERE developer_journey_id = ANY($1::bigint[])
  `,

  /* -------------------------------------------
   * TOTAL TUTORIALS
   * ------------------------------------------- */
  totalTutorialsByJourney: `
    SELECT developer_journey_id AS journey_id, COUNT(*) AS total
    FROM developer_journey_tutorials
    GROUP BY developer_journey_id
  `,

  /* -------------------------------------------
   * ML
   * ------------------------------------------- */
  insert_insight: `
    INSERT INTO ai_learning_insights (user_id, category, insight_message, metrics)
    VALUES ($1, $2, $3, $4::jsonb)
    RETURNING *
  `
};
