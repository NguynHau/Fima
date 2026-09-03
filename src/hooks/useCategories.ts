import { useState, useEffect } from 'react';
import { type Category, type TransactionType } from '../types';
import {
  ensureDefaultCategories,
  subscribeCategories,
  getCachedCategories,
} from '../services/categoryService';

export function useCategories(filterType?: TransactionType) {
  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = getCachedCategories();
    return filterType ? cached.filter((c) => c.type === filterType) : cached;
  });
  const [isLoading, setIsLoading] = useState<boolean>(categories.length === 0);

  useEffect(() => {
    let isMounted = true;

    // Ensure defaults and initial load
    ensureDefaultCategories().then((cats) => {
      if (isMounted) {
        setCategories(filterType ? cats.filter((c) => c.type === filterType) : cats);
        setIsLoading(false);
      }
    });

    const unsubscribe = subscribeCategories((cats) => {
      if (isMounted) {
        setCategories(filterType ? cats.filter((c) => c.type === filterType) : cats);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [filterType]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return {
    categories,
    expenseCategories,
    incomeCategories,
    isLoading,
  };
}
