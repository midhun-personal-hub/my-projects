/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateNavigatorProps {
  selectedDate: string; // YYYY-MM-DD
  onChangeDate: (date: string) => void;
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateNavigator({ selectedDate, onChangeDate }: DateNavigatorProps) {
  const todayStr = getLocalDateString();

  const handlePrev = () => {
    const parts = (selectedDate || todayStr).split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2] - 1);
    onChangeDate(getLocalDateString(dateObj));
  };

  const handleNext = () => {
    const parts = (selectedDate || todayStr).split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2] + 1);
    onChangeDate(getLocalDateString(dateObj));
  };

  const formatDateDisplay = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today';
    const parts = (dateStr || todayStr).split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 shadow-sm mb-6">
      <button
        onClick={handlePrev}
        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        title="Previous Day"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-emerald-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && onChangeDate(e.target.value)}
          className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
        />
        <span className="text-xs text-slate-400">({formatDateDisplay(selectedDate)})</span>
      </div>

      <button
        onClick={handleNext}
        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        title="Next Day"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
