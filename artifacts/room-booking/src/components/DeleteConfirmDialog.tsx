import React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBookingMutations } from "@/hooks/use-booking-mutations";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number | null;
  bookerName: string;
  dateDisplay: string;
  timeSlotLabel: string;
  timeSlotTime: string;
  roomLocation: string;
}

export function DeleteConfirmDialog({ isOpen, onClose, bookingId, bookerName, dateDisplay, timeSlotLabel, timeSlotTime, roomLocation }: DeleteConfirmDialogProps) {
  const { deleteBooking, isDeleting } = useBookingMutations();

  const handleDelete = async () => {
    if (!bookingId) return;
    try {
      await deleteBooking({ id: bookingId });
      onClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  // YYYY-MM-DD → YYYY年MM月DD日（曜日）
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const dateObj = new Date(date);
const dayOfWeek = weekdays[dateObj.getDay()];
const displayDate = date.replace(
  /(\d{4})-(\d{2})-(\d{2})/,
  `$1年$2月$3日（${dayOfWeek}）`
);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <DialogTitle>予約のキャンセル</DialogTitle>
        </div>
        <DialogDescription className="pt-2">
          この予約をキャンセルしてもよろしいですか？
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-2">
          <div className="flex text-sm">
            <span className="w-20 text-slate-500">日付</span>
            <span className="font-medium text-slate-900">{dateDisplay}</span>
          </div>
          <div className="flex text-sm">
            <span className="w-20 text-slate-500">時間帯</span>
            <span className="font-medium text-slate-900">{timeSlotLabel}　<span className="text-slate-500 font-normal">({timeSlotTime})</span></span>
          </div>
          <div className="flex text-sm">
            <span className="w-20 text-slate-500">会議室</span>
            <span className="font-medium text-slate-900">{roomLocation}</span>
          </div>
          <div className="flex text-sm">
            <span className="w-20 text-slate-500">予約者</span>
            <span className="font-semibold text-slate-900">{bookerName}</span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isDeleting}>
          閉じる
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? "キャンセル中..." : "予約をキャンセル"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
