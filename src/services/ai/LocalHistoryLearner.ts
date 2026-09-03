
import { db } from '../../db/database';
import { Transaction, DEFAULT_EXPENSE_CATEGORIES } from '../../types';

export class LocalHistoryLearner {
  /**
   * Extracts merchant -> category patterns from the last 100 transactions
   * to help the AI understand user habits.
   */
  static async getRecentPatterns(limit = 100): Promise<string> {
    try {
      const transactions = await db.transactions
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();

      const patterns: Record<string, string> = {};
      
      transactions.forEach(t => {
        if (t.note && t.category) {
          // Normalize merchant name (note often contains merchant)
          const merchant = t.note.trim();
          if (merchant && !patterns[merchant]) {
            patterns[merchant] = t.category;
          }
        }
      });

      return Object.entries(patterns)
        .map(([m, c]) => `${m} -> ${c}`)
        .join('\n');
    } catch (error) {
      console.error('Error learning from local history:', error);
      return '';
    }
  }

  /**
   * Gets a list of all categories available to the user (database + defaults)
   */
  static async getUserCategories(): Promise<string[]> {
    try {
      const categories = await db.categories.toArray();
      const names = categories.map(c => c.name).filter(Boolean);
      const defaults = DEFAULT_EXPENSE_CATEGORIES.map(c => c.name);
      const combined = Array.from(new Set([...names, ...defaults]));
      return combined.length > 0 ? combined : defaults;
    } catch (error) {
      console.error('Error fetching user categories:', error);
      return DEFAULT_EXPENSE_CATEGORIES.map(c => c.name);
    }
  }
}
