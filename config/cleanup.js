import pool from './db.js';

export function startCleanupJob() {
  const run = async () => {
    try {
      const [result] = await pool.execute(
        'DELETE FROM posts WHERE expires_at IS NOT NULL AND expires_at <= NOW()'
      );
      if (result.affectedRows > 0) {
        console.log(`[Cleanup] 테스트 포스트 ${result.affectedRows}개 삭제됨`);
      }
    } catch (err) {
      console.error('[Cleanup] 오류:', err.message);
    }
  };

  run();
  return setInterval(run, 30_000);
}
