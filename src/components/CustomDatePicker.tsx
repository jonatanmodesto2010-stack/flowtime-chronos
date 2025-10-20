import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { parseEventDate, formatEventDate } from '@/lib/date-utils';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

export const CustomDatePicker = ({ value, onChange, onClose }: CustomDatePickerProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (value && value.includes('/')) {
      const parsedDate = parseEventDate(value);
      if (parsedDate) {
        setSelectedDate(parsedDate);
        setCurrentDate(parsedDate);
      }
    }
  }, [value]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: { day: number; isCurrentMonth: boolean }[] = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDayClick = (day: { day: number; isCurrentMonth: boolean }) => {
    if (!day.isCurrentMonth) return;
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day.day);
    setSelectedDate(newDate);
    const formattedDate = formatEventDate(newDate);
    onChange(formattedDate);
    onClose();
  };

  const isSelected = (day: { day: number; isCurrentMonth: boolean }) => {
    if (!selectedDate || !day.isCurrentMonth) return false;
    return selectedDate.getDate() === day.day && 
           selectedDate.getMonth() === currentDate.getMonth() &&
           selectedDate.getFullYear() === currentDate.getFullYear();
  };

  const days = getDaysInMonth(currentDate);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-full left-0 mt-2 w-80 bg-card rounded-xl shadow-2xl p-4 z-50 border border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-foreground font-semibold">
          {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
        </span>
        <button onClick={handleNextMonth} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-muted-foreground text-sm font-medium py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDayClick(day)}
            disabled={!day.isCurrentMonth}
            className={`
              h-10 rounded-lg text-sm font-medium transition-all
              ${!day.isCurrentMonth ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-foreground hover:bg-muted'}
              ${isSelected(day) ? 'bg-gradient-primary text-primary-foreground hover:bg-gradient-hover' : ''}
            `}
          >
            {day.day}
          </button>
        ))}
      </div>
    </motion.div>
  );
};
