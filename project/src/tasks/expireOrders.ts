import pool from '../lib/mysql';
import { addHours } from 'date-fns';

/**
 * Marks orders older than HOLD_HOURS (default 5) as 'Expired' if they are still pending.
 * This script can be scheduled with node-cron or run manually.
 */
export async function expireStaleOrders(): Promise<void> {
  const holdHours = Number(process.env.HOLD_HOURS ?? '5');
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - holdHours);
  try {
    const [result] = await pool.execute(
      `UPDATE orders SET order_status = 'Expired' WHERE order_status = 'Pending' AND created_at < ?`,
      [cutoff]
    );
    // @ts-ignore
    console.log(`Expired ${result.affectedRows ?? 0} stale orders`);
  } catch (err) {
    console.error('Error expiring orders:', err);
  }
}

// If executed directly, run the function
if (require.main === module) {
  expireStaleOrders().then(() => process.exit(0)).catch(() => process.exit(1));
}
