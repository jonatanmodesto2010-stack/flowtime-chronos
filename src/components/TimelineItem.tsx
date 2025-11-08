import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MessageSquare, FileText, CheckCircle2, AlertCircle, Phone, Wrench } from 'lucide-react';

const TimelineItem = ({ event, index, onEdit, onColorChange, layout = 'modern' }) => {
  const getIcon = () => {
    switch (event.icon) {
      case 'calendar':
        return Calendar;
      case 'note':
        return FileText;
      case 'check':
        return CheckCircle2;
      case 'message':
        return MessageSquare;
      case 'alert':
        return AlertCircle;
      case 'phone':
        return Phone;
      case 'wrench':
        return Wrench;
      default:
        return FileText;
    }
  };

  const getStatusColor = () => {
    if (layout === 'classic') {
      switch (event.color) {
        case 'green':
          return 'from-green-500 to-emerald-500';
        case 'yellow':
          return 'from-yellow-500 to-orange-500';
        case 'red':
          return 'from-red-500 to-rose-500';
        default:
          return 'from-green-500 to-emerald-500';
      }
    }
    // Modern layout (purple theme)
    switch (event.color) {
      case 'green':
        return 'from-green-500 to-emerald-500';
      case 'yellow':
        return 'from-yellow-500 to-orange-500';
      case 'red':
        return 'from-red-500 to-rose-500';
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  const getCardColors = () => {
    if (layout === 'classic') {
      switch (event.color) {
        case 'green':
          return 'bg-green-500/10 border-green-500/30 hover:border-green-500/60';
        case 'yellow':
          return 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/60';
        case 'red':
          return 'bg-red-500/10 border-red-500/30 hover:border-red-500/60';
        default:
          return 'bg-green-500/10 border-green-500/30 hover:border-emerald-500/60';
      }
    }
    // Modern layout (purple theme)
    switch (event.color) {
      case 'green':
        return 'bg-green-500/10 border-green-500/30 hover:border-green-500/60';
      case 'yellow':
        return 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/60';
      case 'red':
        return 'bg-red-500/10 border-red-500/30 hover:border-red-500/60';
      default:
        return 'bg-purple-500/10 border-purple-500/30 hover:border-pink-500/60';
    }
  };

  const Icon = getIcon();
  const isRightSide = event.color === 'green';

  const Card = () => (
    <motion.div
      onClick={onEdit}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 hover:shadow-xl cursor-pointer w-[calc(50%-2.5rem)] ${getCardColors()}`}
    >
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{event.time}</span>
        </div>
      </div>
      <p className="text-gray-300 text-sm leading-snug break-words">
        {event.description}
      </p>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="relative flex justify-between items-center w-full max-w-5xl pb-8"
    >
      {!isRightSide && <Card />}
      {!isRightSide && <div className="w-[calc(50%-2.5rem)]" />}
      
      <div
        onClick={onColorChange}
        className={`absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br ${getStatusColor()} flex items-center justify-center shadow-lg z-10 cursor-pointer`}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      
      {isRightSide && <div className="w-[calc(50%-2.5rem)]" />}
      {isRightSide && <Card />}
    </motion.div>
  );
};

export default TimelineItem;
