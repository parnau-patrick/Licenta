import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onSelect: (start: string, end: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onSelect }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); // The month we are looking at

  // Helper to format date object to YYYY-MM-DD in local time
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const monthName = viewDate.toLocaleString("ro-RO", { month: "long", year: "numeric" });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarDays = useMemo(() => {
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month); // 0=Sun, 1=Mon...
    
    // We want Monday as first day? Let's adjust offset for Monday start
    const offset = startOffset === 0 ? 6 : startOffset - 1; 

    const days = [];
    // Prev month padding
    for (let i = 0; i < offset; i++) days.push({ day: null });
    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDate(new Date(year, month, d));
      days.push({ day: d, dateStr });
    }
    return days;
  }, [year, month]);

  const handleDateClick = (dateStr: string) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onSelect(dateStr, "");
    } else {
      // Complete selection
      if (new Date(dateStr) < new Date(startDate)) {
         onSelect(dateStr, startDate);
      } else {
         onSelect(startDate, dateStr);
      }
      setIsOpen(false);
    }
  };

  const isSelected = (dateStr: string) => dateStr === startDate || dateStr === endDate;
  const isInRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    return dateStr > startDate && dateStr < endDate;
  };
  const isToday = (dateStr: string) => dateStr === formatDate(new Date());

  const displayRange = useMemo(() => {
    if (!startDate && !endDate) return "Selectează interval";
    if (startDate && !endDate) return `${startDate} - ...`;
    return `${startDate} - ${endDate}`;
  }, [startDate, endDate]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm hover:border-indigo-400 transition-all text-sm font-semibold text-slate-700 w-full lg:w-auto"
      >
        <CalendarIcon size={18} className="text-indigo-600" />
        <span>{displayRange}</span>
        { (startDate || endDate) && (
          <X 
            size={14} 
            className="ml-2 text-slate-400 hover:text-rose-500" 
            onClick={(e) => { e.stopPropagation(); onSelect("", ""); }}
          />
        )}
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 right-0 lg:right-auto z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 w-[320px] soft-enter">
             {/* Header */}
             <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20}/></button>
                <span className="font-bold text-slate-800 capitalize">{monthName}</span>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronRight size={20}/></button>
             </div>

             {/* Weekdays */}
             <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map(d => <div key={d}>{d}</div>)}
             </div>

             {/* Days Grid */}
             <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((d, index) => {
                   if (!d.day || !d.dateStr) return <div key={index} className="h-9 w-9" />;

                   const selected = isSelected(d.dateStr);
                   const inRange = isInRange(d.dateStr);
                   const today = isToday(d.dateStr);

                   return (
                     <button
                       key={d.dateStr}
                       onClick={() => handleDateClick(d.dateStr!)}
                       className={`
                         h-9 w-9 rounded-lg text-sm font-semibold flex items-center justify-center transition-all relative
                         ${selected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 z-10" : ""}
                         ${inRange ? "bg-indigo-50 text-indigo-700 rounded-none first:rounded-l-lg last:rounded-r-lg" : ""}
                         ${!selected && !inRange ? "hover:bg-slate-100 text-slate-600" : ""}
                         ${today && !selected ? "border border-indigo-200 text-indigo-600" : ""}
                       `}
                     >
                        {d.day}
                        {today && <div className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full" />}
                     </button>
                   );
                })}
             </div>

             {/* Footer Info */}
             <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                <span>Alege {!startDate ? "data de inceput" : "data de final"}</span>
                <button onClick={() => setIsOpen(false)} className="text-indigo-600 hover:underline">Închide</button>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
