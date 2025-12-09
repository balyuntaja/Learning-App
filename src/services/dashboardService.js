import pool from "../config/db.js";

export const getDashboardData = async (userId) => {
  // 1. User Profile
  const user = await pool.query(
    `SELECT id, name, display_name, image_path 
     FROM users WHERE id = $1`,
    [userId]
  );

  // 2. Latest AI Insight
  const insight = await pool.query(
    `SELECT * FROM ai_learning_insights 
     WHERE user_id = $1
     ORDER BY generated_at DESC
     LIMIT 1`,
    [userId]
  );

  // 3. Study Time Chart
  const studyTime = await pool.query(
    `SELECT DATE(first_opened_at) AS day, COUNT(*) AS total
     FROM developer_journey_trackings
     WHERE developer_id = $1
     GROUP BY day
     ORDER BY day`,
    [userId]
  );

  // 4. Completion Speed Chart
  const completionSpeed = await pool.query(
    `SELECT DATE(completed_at) AS day, COUNT(*) AS completed
     FROM developer_journey_trackings
     WHERE developer_id = $1 AND completed_at IS NOT NULL
     GROUP BY day
     ORDER BY day`,
    [userId]
  );

  // 5. Average Quiz Score
  const avgQuiz = await pool.query(
    `SELECT AVG(score) AS average_score
     FROM exam_results
     WHERE exam_registration_id IN (
        SELECT id FROM exam_registrations 
        WHERE examinees_id = $1
     )`,
    [userId]
  );

  // 6. Journey Progress
  const journeys = await pool.query(
    `SELECT 
        dj.id,
        dj.name,
        dj.image_path,
        dj.difficulty,
        dj.hours_to_study,
        COALESCE(djt.completed_count, 0) AS completed_modules,
        djc.study_duration
     FROM developer_journeys dj
     LEFT JOIN (
        SELECT journey_id, COUNT(*) AS completed_count
        FROM developer_journey_trackings
        WHERE developer_id = $1 AND completed_at IS NOT NULL
        GROUP BY journey_id
     ) djt ON djt.journey_id = dj.id
     LEFT JOIN developer_journey_completions djc
        ON djc.journey_id = dj.id AND djc.user_id = $1`,
    [userId]
  );

  return {
    user: user.rows[0] || null,
    insight: insight.rows[0] || null,
    charts: {
      study_time: studyTime.rows,
      completion_speed: completionSpeed.rows,
      quiz_results: avgQuiz.rows[0],
    },
    journeys: journeys.rows,
  };
};
