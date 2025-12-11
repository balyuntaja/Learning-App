const TRACKING_STATUS_MAP = {
  0: "started",
  1: "completed",
  2: "in_progress"
};

const formatDate = (value) =>
  value ? value.toISOString().replace("T", " ").replace("Z", "") : null;

function mapTrackingRow(row) {
  const statusRaw = row.status;
  let status = statusRaw;
  if (status !== null && typeof status === "number") {
    status = TRACKING_STATUS_MAP[status] ?? String(status);
  }
  return {
    id: row.id,
    developer_id: row.developer_id,
    journey_id: row.journey_id,
    tutorial_id: row.tutorial_id,
    status,
    last_viewed: formatDate(row.last_viewed),
    first_opened_at: formatDate(row.first_opened_at),
    completed_at: formatDate(row.completed_at)
  };
}

function buildMlPayload({
  userRow,
  trackingRows,
  submissionRows,
  completionRows,
  journeyRows,
  tutorialRows,
  examRegistrationRows,
  examResultRows
}) {
  const users = userRow
    ? [
        {
          id: userRow.id,
          created_at: formatDate(userRow.created_at)
        }
      ]
    : [];

  const trackings = trackingRows.map(mapTrackingRow);

  const submissions = submissionRows.map((r) => ({
    id: r.id,
    submitter_id: r.submitter_id,
    quiz_id: r.quiz_id,
    status: r.status,
    created_at: formatDate(r.created_at),
    ended_review_at: formatDate(r.ended_review_at),
    rating: r.rating
  }));

  const completions = completionRows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    journey_id: r.journey_id,
    created_at: formatDate(r.created_at),
    updated_at: formatDate(r.updated_at),
    enrollments_at: r.enrollments_at,
    last_enrolled_at: formatDate(r.last_enrolled_at),
    study_duration: r.study_duration
  }));

  const journeys = journeyRows.map((r) => ({
    id: r.id,
    hours_to_study: r.hours_to_study
  }));

  const tutorials = tutorialRows.map((r) => ({
    id: r.id,
    developer_journey_id: r.developer_journey_id
  }));

  const exam_registrations = examRegistrationRows.map((r) => ({
    id: r.id,
    examinees_id: r.examinees_id,
    tutorial_id: r.tutorial_id,
    created_at: formatDate(r.created_at),
    deadline_at: formatDate(r.deadline_at),
    exam_finished_at: formatDate(r.exam_finished_at)
  }));

  const exam_results = examResultRows.map((r) => ({
    id: r.id,
    exam_registration_id: r.exam_registration_id,
    score: r.score,
    total_questions: r.total_questions
  }));

  return {
    users,
    trackings,
    submissions,
    completions,
    journeys,
    tutorials,
    exam_registrations,
    exam_results
  };
}

export { TRACKING_STATUS_MAP, formatDate, mapTrackingRow, buildMlPayload };

