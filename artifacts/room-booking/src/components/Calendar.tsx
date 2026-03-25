import React, { useState, useMemo } from "react";
import { format, getDaysInMonth, startOfMonth, addDays, getDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Booking, BookingTimeSlot, CreateBookingRequestTimeSlot } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { User, Plus } from "lucide-react";
import { BookingForm } from "./BookingForm";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

const SLOTS = [
  { id: BookingTimeSlot.slot1, label: '1限', time: '8:50-10:30' },
  { id: BookingTimeSlot.slot2, label: '2限', time: '10:45-12:25' },
  { id: BookingTimeSlot.slot3, label: '3限', time: '13:30-15:10' },
  { id: BookingTimeSlot.slot4, label: '4限', time: '15:25-17:15' },
  { id: BookingTimeSlot.slot5, label: 'それ以降', time: '17:30-' },
] as const;

const ROOMS = [
  { id: 1, name: '会議室1', location: '石川台4号館 B02-B05', seats: 48, projector: 'あり' as const },
  { id: 2, name: '会議室2', location: '石川台4号館 B08-B09', seats: 15, projector: '不明' as const },
  { id: 3, name: '会議室3', location: '南6号館106', seats: 10, projector: 'あり' as const },
];

interface CalendarProps {
  currentDate: Date;
  bookings: Booking[];
  isLoading: boolean;
}

export function Calendar({ currentDate, bookings, isLoading }: CalendarProps) {
  // State for Booking Modal
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    date: string;
    timeSlot: CreateBookingRequestTimeSlot;
    timeSlotLabel: string;
    roomId: number;
    roomName: string;
  }>({
    isOpen: false,
    date: "",
    timeSlot: "slot1",
    timeSlotLabel: "",
    roomId: 1,
    roomName: "",
  });

  // State for Delete Modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    bookingId: number | null;
    bookerName: string;
    details: string;
  }>({
    isOpen: false,
    bookingId: null,
    bookerName: "",
    details: "",
  });

  // Fast lookup map: key = "YYYY-MM-DD_slotX_roomY"
  const bookingMap = useMemo(() => {
    const map: Record<string, Booking> = {};
    bookings.forEach(b => {
      map[`${b.date}_${b.timeSlot}_${b.roomId}`] = b;
    });
    return map;
  }, [bookings]);

  // Generate days of the month
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = startOfMonth(currentDate);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = addDays(firstDay, i);
    return {
      dateObj: date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayOfWeek: getDay(date), // 0 is Sunday
      display: format(date, 'd日(E)', { locale: ja })
    };
  });

  const handleCellClick = (
    dateStr: string, 
    dateDisplay: string,
    slot: typeof SLOTS[0], 
    room: typeof ROOMS[0], 
    existingBooking?: Booking
  ) => {
    if (existingBooking) {
      setDeleteModal({
        isOpen: true,
        bookingId: existingBooking.id,
        bookerName: existingBooking.bookerName,
        details: `${dateDisplay} ${slot.label} - ${room.name}`,
      });
    } else {
      setBookingModal({
        isOpen: true,
        date: dateStr,
        timeSlot: slot.id as CreateBookingRequestTimeSlot,
        timeSlotLabel: slot.label,
        roomId: room.id,
        roomName: room.name,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">カレンダーを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200 py-4 px-2 font-semibold text-slate-700 w-[12%] shadow-[1px_0_0_0_#e2e8f0]">日付</th>
                <th className="py-4 px-2 font-semibold text-slate-700 border-r border-slate-200 w-[16%]">時間帯</th>
                {ROOMS.map(room => (
                  <th key={room.id} className="py-4 px-2 font-semibold text-slate-700 border-r border-slate-200 last:border-r-0 w-[24%]">
                    <div>{room.location}</div>
                    <div className="flex items-center justify-center gap-2 mt-1 text-xs font-normal text-slate-500">
                      <span>席数：{room.seats}</span>
                      <span>プロジェクター：{room.projector}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {days.map((day) => {
                const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                
                return SLOTS.map((slot, slotIndex) => {
                  const isFirstSlot = slotIndex === 0;
                  return (
                    <tr key={`${day.dateStr}-${slot.id}`} className="group/row">
                      {isFirstSlot && (
                        <td 
                          rowSpan={SLOTS.length} 
                          className={cn(
                            "sticky left-0 z-10 bg-white border-r border-b border-slate-200 p-4 align-top font-medium shadow-[1px_0_0_0_#e2e8f0]",
                            day.dayOfWeek === 0 ? "text-red-600" : day.dayOfWeek === 6 ? "text-blue-600" : "text-slate-800",
                            isWeekend ? "bg-slate-50/50" : ""
                          )}
                        >
                          {day.display}
                        </td>
                      )}
                      <td className={cn(
                        "border-r border-slate-100 px-3 py-2 text-center text-xs",
                        isWeekend ? "bg-slate-50/30" : "bg-white",
                        slotIndex === SLOTS.length - 1 ? "border-b border-slate-200" : ""
                      )}>
                        <div className="font-medium text-slate-700 text-[14px]">{slot.label}</div>
                        <div className="text-slate-400 scale-90 text-[14px]">{slot.time}</div>
                      </td>
                      {ROOMS.map(room => {
                        const key = `${day.dateStr}_${slot.id}_${room.id}`;
                        const booking = bookingMap[key];
                        
                        return (
                          <td 
                            key={key} 
                            onClick={() => handleCellClick(day.dateStr, day.display, slot, room, booking)}
                            className={cn(
                              "border-r border-slate-100 p-2 cursor-pointer transition-all duration-200 group/cell",
                              isWeekend ? "bg-slate-50/30" : "bg-white",
                              slotIndex === SLOTS.length - 1 ? "border-b border-slate-200" : "",
                              booking ? "hover:bg-red-50/50" : "hover:bg-blue-50"
                            )}
                          >
                            {booking ? (
                              <div className="h-full w-full bg-indigo-50 border border-indigo-100/50 rounded-lg p-2 flex items-center gap-2 group-hover/cell:bg-red-50 group-hover/cell:border-red-200 group-hover/cell:text-red-700 transition-colors">
                                <div className="bg-white p-1 rounded-full text-indigo-500 shadow-sm group-hover/cell:text-red-500">
                                  <User size={12} />
                                </div>
                                <span className="font-semibold text-indigo-900 truncate text-xs group-hover/cell:text-red-700">
                                  {booking.bookerName}
                                </span>
                              </div>
                            ) : (
                              <div className="h-full w-full min-h-[36px] rounded-lg border border-transparent flex items-center justify-center group-hover/cell:border-blue-200 group-hover/cell:bg-white transition-all">
                                <Plus size={16} className="text-blue-400 opacity-0 group-hover/cell:opacity-100 transition-opacity scale-75 group-hover/cell:scale-100" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
      <BookingForm 
        isOpen={bookingModal.isOpen} 
        onClose={() => setBookingModal(prev => ({ ...prev, isOpen: false }))}
        date={bookingModal.date}
        timeSlot={bookingModal.timeSlot}
        timeSlotLabel={bookingModal.timeSlotLabel}
        roomId={bookingModal.roomId}
        roomName={bookingModal.roomName}
      />
      <DeleteConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        bookingId={deleteModal.bookingId}
        bookerName={deleteModal.bookerName}
        details={deleteModal.details}
      />
    </>
  );
}
