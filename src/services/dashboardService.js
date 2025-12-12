import pool from "../db/pool.js";
import { Q } from "../db/queries.js";
import { buildMlPayload } from "../utils/mapping.js";
import { callML } from "../utils/mlClient.js";
import dayjs from "dayjs";

export async function getDashboardData(email) {
  const client = await pool.connect();

  try {
    /** -----------------------------
     * 1. Get user
     * ----------------------------- */
    const userRes = await client.query(Q.user_by_email, [email]);
    const user = userRes.rows[0];
    if (!user) return { success: false, status: 404, message: "User not found" };

    const userId = user.id;

    /** -----------------------------
     * 2. Get last activity → week window
     * ----------------------------- */
    const lastActRes = await client.query(Q.lastActivity, [userId]);
    const lastActivity = lastActRes.rows[0]?.last_activity;

    if (!lastActivity)
      return { success: true, user, insight: null, dashboard: {} };

    const weekEnd = dayjs(lastActivity);
    const weekStart = weekEnd.subtract(7, "day");

    /** -----------------------------
     * 3. Fetch weekly raw data
     * ----------------------------- */
    const [trackingsQ, submissionsQ, completionsQ, examRegsQ] =
      await Promise.all([
        client.query(Q.trackingsByRange, [
          userId,
          weekStart.toDate(),
          weekEnd.toDate(),
        ]),
        client.query(Q.submissionsByRange, [
          userId,
          weekStart.toDate(),
          weekEnd.toDate(),
        ]),
        client.query(Q.completionsByRange, [
          userId,
          weekStart.toDate(),
          weekEnd.toDate(),
        ]),
        client.query(Q.examRegsByRange, [
          userId,
          weekStart.toDate(),
          weekEnd.toDate(),
        ]),
      ]);

    const trackings = trackingsQ.rows;

    /** -----------------------------
     * 4. Fetch journeys + weekly tutorials
     * ----------------------------- */
    const journeysRes = await client.query(Q.journeys_by_user, [
      userId,
      weekStart.toDate(),
      weekEnd.toDate(),
    ]);
    const journeys = journeysRes.rows;

    const weeklyTutorialRes = await client.query(Q.weeklyTutorials, [
      userId,
      weekStart.toDate(),
      weekEnd.toDate(),
    ]);
    const weeklyTutorials = weeklyTutorialRes.rows;

    /** -----------------------------
     * 5. Chart: Study Time (Session Based)
     * ----------------------------- */
    const studyTimeMap = {};
    const sorted = [...trackings]
      .filter((t) => t.last_viewed)
      .sort((a, b) => new Date(a.last_viewed) - new Date(b.last_viewed));

    let lastSessionTime = null;

    sorted.forEach((t) => {
      const current = dayjs(t.last_viewed);

      if (!lastSessionTime) {
        lastSessionTime = current;
        return;
      }

      const diffMinutes = current.diff(lastSessionTime, "minute");

      if (diffMinutes > 30) {
        lastSessionTime = current;
        return;
      }

      let hours = diffMinutes / 60;
      if (hours > 2) hours = 2;

      const day = current.format("YYYY-MM-DD");
      studyTimeMap[day] = (studyTimeMap[day] || 0) + hours;

      lastSessionTime = current;
    });

    const studyTimeChart = Object.entries(studyTimeMap).map(
      ([day, hours]) => ({
        day,
        hours: Number(hours.toFixed(2)),
      })
    );

    /** -----------------------------
     * 6. Chart: Material Completion Speed
     * ----------------------------- */
    const completionMap = {};

    weeklyTutorials.forEach((t) => {
      if (!t.completed_at) return;

      const day = dayjs(t.completed_at).format("YYYY-MM-DD");
      completionMap[day] = (completionMap[day] || 0) + 1;
    });

    const completionSpeedChart = Object.entries(completionMap).map(
      ([day, materials]) => ({
        day,
        materials,
      })
    );

    /** -----------------------------
     * 7. Quiz Result Chart
     * ----------------------------- */
    let examResults = [];
    if (examRegsQ.rows.length > 0) {
      const regIds = examRegsQ.rows.map((r) => r.id);
      const examRes = await client.query(Q.examResultsByRegIds, [regIds]);
      examResults = examRes.rows;
    }

    const quizResultsChart = examResults.map((r) => ({
      day: dayjs(r.created_at).format("YYYY-MM-DD"),
      score: r.score,
    }));

    /** -----------------------------
     * 8. Detect repeated materials
     * ----------------------------- */
    const seen = new Set();
    const repeatedList = [];

    weeklyTutorials.forEach((t) => {
      if (seen.has(t.tutorial_id)) repeatedList.push(t);
      else seen.add(t.tutorial_id);
    });

    /** -----------------------------
     * 9. Compute Journey Progress
     * ----------------------------- */
    const totalTutRes = await client.query(Q.totalTutorialsByJourney);
    const totalTutorialMap = new Map(
      totalTutRes.rows.map((t) => [Number(t.journey_id), Number(t.total)])
    );

    const weeklyCompletedRes = await client.query(Q.weeklyCompletedTutorials, [
      userId,
      weekStart.toDate(),
      weekEnd.toDate(),
    ]);
    const weeklyCompletedMap = new Map(
      weeklyCompletedRes.rows.map((t) => [
        Number(t.journey_id),
        Number(t.completed),
      ])
    );

    const journeysWithProgress = journeys.map((j) => {
      const jid = Number(j.id);
      const total = totalTutorialMap.get(jid) ?? 0;
      const completed = weeklyCompletedMap.get(jid) ?? 0;

      return {
        ...j,
        total_tutorials: total,
        weekly_completed: completed,
        weekly_progress_percentage:
          total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0,
      };
    });

    /** -----------------------------
     * 10. Learning Status
     * ----------------------------- */
    const totalWeeklyCompleted = weeklyTutorials.filter(
      (t) => t.status === 1
    ).length;

    let learningStatus = "Normal Pace";
    let learningDescription = "Kamu belajar dengan kecepatan yang stabil.";

    if (totalWeeklyCompleted >= 30) {
      learningStatus = "Ahead of Schedule";
      learningDescription = "Kamu belajar lebih cepat dari rata-rata user lain.";
    } else if (totalWeeklyCompleted < 5) {
      learningStatus = "Needs Attention";
      learningDescription = "Ayo semangat! Tingkatkan konsistensi belajarmu.";
    }

    /** -----------------------------
     * 11. ML Insight
     * ----------------------------- */
    const mlPayload = buildMlPayload({
      userRow: user,
      trackingRows: trackings,
      submissionRows: submissionsQ.rows,
      completionRows: completionsQ.rows,
      journeyRows: journeys,
      tutorialRows: weeklyTutorials,
      examRegistrationRows: examRegsQ.rows,
      examResultRows: examResults,
    });

    const mlData = await callML(mlPayload);

    const savedInsightRes = await client.query(Q.insert_insight, [
      userId,
      mlData.category,
      mlData.insight_message,
      JSON.stringify(mlData.metrics),
    ]);

    const insight = savedInsightRes.rows[0];

    /** -----------------------------
 * 11. Improvements Section
 * ----------------------------- */

    // A) MATERI PERLU DISELESAIKAN (progress rendah)
    const incomplete = journeysWithProgress
      .filter(j => j.weekly_progress_percentage < 100)
      .sort((a, b) => a.weekly_progress_percentage - b.weekly_progress_percentage)
      .slice(0, 3)
      .map(j => `${j.name} - ${j.weekly_progress_percentage}%`);

    // B) MATERI SKOR RENDAH (quiz score)
    const lowScores = examResults
      .filter(r => r.score < 75)
      .map(r => `${r.quiz_title} - ${r.score}`);


    // C) MATERI DISARANKAN (belum pernah dibuka minggu ini)
    const recommended = weeklyTutorials
      .filter(t => t.status === 0)   // belum selesai
      .slice(0, 2)
      .map(t => t.title);

    // gabungkan menjadi improvement object
    const improvements = [
      {
        count: incomplete.length,
        text: "materi perlu diselesaikan",
        details: incomplete
      },
      {
        count: lowScores.length,
        text: "materi skor rendah",
        details: lowScores
      },
      {
        count: recommended.length,
        text: "materi disarankan",
        details: recommended
      }
    ];

    /** -----------------------------
     * 12. Final Response
     * ----------------------------- */
    return {
      success: true,
      user,
      insight: {
        learning_style: insight.category,
        message: insight.insight_message,
      },
      period: {
        start: weekStart.format("YYYY-MM-DD"),
        end: weekEnd.format("YYYY-MM-DD"),
      },
      charts: {
        study_time: studyTimeChart,
        completion_speed: completionSpeedChart,
        quiz_results: quizResultsChart,
      },
      materials: {
        review_count: repeatedList.length,
        review_list: repeatedList,
      },
      learning_status: {
        status: learningStatus,
        description: learningDescription,
      },
      improvements: improvements,

      journeys: journeysWithProgress,
      weekly_tutorials: weeklyTutorials,
      exam_results: examResults,
    };
  } finally {
    client.release();
  }
}
