import React, { useState } from "react";
import { addMonths, subMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useGetBookings } from "@workspace/api-client-react";
import { Calendar } from "@/components/Calendar";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  
  const { data: bookings = [], isLoading } = useGetBookings({
    year,
    month
  });
  

  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="min-h-screen pb-20">
      {/* Decorative subtle background */}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold tracking-wider mb-2">
              <CalendarIcon size={14} />
              ROOM BOOKING
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">融合理工学系の会議室予約</h1>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              予約方法：空いている枠をクリックして氏名を入力してください<br />
              キャンセル：予約した枠をクリックするとキャンセルできます
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={prevMonth}
              className="rounded-xl hover:bg-white hover:shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-32 text-center flex flex-col justify-center">
              <span className="text-lg font-bold text-slate-800 leading-tight">
                {year}年 {month}月
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextMonth}
              className="rounded-xl hover:bg-white hover:shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            <Button 
              variant="outline" 
              onClick={goToday}
              className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold px-4 shadow-sm"
            >
              今月
            </Button>
          </div>
        </header>

        {/* Main Calendar View */}
        <main className="relative">
          <Calendar 
            currentDate={currentDate} 
            bookings={bookings} 
            isLoading={isLoading} 
          />
        </main>

      </div>
    </div>
  );
}
