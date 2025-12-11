import pool from "../db/pool.js";
import { Q } from "../db/queries.js";
import { buildMlPayload } from "../utils/mapping.js";
import { callML } from "../utils/mlClient.js";

export async function getDashboardData(email) {
  const client = await pool.connect();

  try {
    /** 1. Get user */
    const userRes = await client.query(Q.user_by_email, [email]);
    const user = userRes.rows[0];
    if (!user) return { success: false, status: 404, message: "User not found" };

    const userId = user.id;

    /** 2. Get last activity */
    const lastAct = (await client.query(Q.lastActivity, [userId])).rows[0]?.last_activity;
    if (!lastAct) return { success: true, user, insight: null, dashboard: {} };

    const weekEnd = new Date(lastAct);
    const weekStart = new Date(lastAct);
    weekStart.setDate(weekStart.getDate() - 7);

    /** 3. Weekly queries */
    const [trackingsQ, submissionsQ, completionsQ, examRegsQ] = await Promise.all([
      client.query(Q.trackingsByRange, [userId, weekStart, weekEnd]),
      client.query(Q.submissionsByRange, [userId, weekStart, weekEnd]),
      client.query(Q.completionsByRange, [userId, weekStart, weekEnd]),
      client.query(Q.examRegsByRange, [userId, weekStart, weekEnd]),
    ]);

    /** 4. Journeys */
    const journeyRows = (await client.query(Q.journeys_by_user, [userId, weekStart, weekEnd])).rows;
    const journeyIds = journeyRows.map(j => j.id);

    /** 5. Weekly tutorial records (with titles) */
    const weeklyTutorials = (await client.query(Q.weeklyTutorials, [userId, weekStart, weekEnd])).rows;

    /** 6. Weekly completed count */
    const weeklyCompleted = new Map(
      (await client.query(Q.weeklyCompletedTutorials, [userId, weekStart, weekEnd]))
        .rows.map(r => [Number(r.journey_id), Number(r.completed)])
    );

    /** 7. Lifetime tutorial totals */
    const totalTutorialsMap = new Map(
      (await client.query(Q.totalTutorialsByJourney))
        .rows.map(r => [Number(r.journey_id), Number(r.total)])
    );

    /** 8. Progress build */
    const journeysWithProgress = journeyRows.map(j => {
      const jid = Number(j.id);
      const total = totalTutorialsMap.get(jid) ?? 0;
      const wc = weeklyCompleted.get(jid) ?? 0;

      return {
        ...j,
        total_tutorials: total,
        weekly_completed: wc,
        weekly_progress_percentage: total > 0 ? (wc / total) * 100 : 0,
      };
    });

    /** 9. Exam results */
    let examResults = [];
    if (examRegsQ.rows.length > 0) {
      const regIds = examRegsQ.rows.map(r => r.id);
      examResults = (await client.query(Q.examResultsByRegIds, [regIds])).rows;
    }

    /** 10. ALL tutorials for ML */
    const allTutorials = journeyIds.length
      ? (await client.query(Q.allTutorialsByUserJourney, [journeyIds])).rows
      : [];

    /** 11. Build ML payload */
    const mlPayload = buildMlPayload({
      userRow: user,
      trackingRows: trackingsQ.rows,
      submissionRows: submissionsQ.rows,
      completionRows: completionsQ.rows,
      journeyRows,
      tutorialRows: allTutorials,   // << FIXED
      examRegistrationRows: examRegsQ.rows,
      examResultRows: examResults
    });

    const mlData = await callML(mlPayload);

    /** 12. Save ML insight */
    const savedInsight = (await client.query(Q.insert_insight, [
      mlData.user_id ?? userId,
      mlData.category ?? null,
      mlData.insight_message ?? null,
      JSON.stringify(mlData.metrics ?? mlData)
    ])).rows[0];

    /** 13. Final output */
    return {
      success: true,
      user,
      insight: savedInsight,
      dashboard: {
        week_start: weekStart,
        week_end: weekEnd,
        journeys: journeysWithProgress,
        tutorials: weeklyTutorials,
        trackings: trackingsQ.rows,
        submissions: submissionsQ.rows,
        completions: completionsQ.rows,
        exam_registrations: examRegsQ.rows,
        exam_results: examResults
      }
    };

  } finally {
    client.release();
  }
}
