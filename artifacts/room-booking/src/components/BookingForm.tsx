import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBookingMutations } from "@/hooks/use-booking-mutations";
import { CreateBookingRequestTimeSlot } from "@workspace/api-client-react";

const bookingSchema = z.object({
  bookerName: z.string().min(1, "氏名を入力してください").max(50, "氏名が長すぎます"),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  timeSlot: CreateBookingRequestTimeSlot;
  timeSlotLabel: string;
  timeSlotTime: string;
  roomId: number;
  roomName: string;
  roomLocation: string;
}

export function BookingForm({ isOpen, onClose, date, timeSlot, timeSlotLabel, timeSlotTime, roomId, roomName, roomLocation }: BookingFormProps) {
  const { createBooking, isCreating } = useBookingMutations();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { bookerName: "" }
  });

  const onSubmit = async (data: BookingFormValues) => {
    try {
      await createBooking({
        data: {
          bookerName: data.bookerName,
          date,
          timeSlot,
          roomId,
        }
      });
      reset();
      onClose();
    } catch (error) {
      // Error handled in mutation hook
    }
  };

  // Format date for display: YYYY-MM-DD to YYYY年MM月DD日
  const displayDate = date.replace(/(\d{4})-(\d{2})-(\d{2})/, "$1年$2月$3日");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <DialogTitle>会議室を予約</DialogTitle>
        <DialogDescription>
          以下の内容で予約を作成します。氏名を入力してください。
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
          <div className="flex text-sm">
            <span className="w-20 text-slate-500">日付</span>
            <span className="font-medium text-slate-900">{displayDate}</span>
          </div>
          <div className="flex text-sm">
            <span className="w-20 text-slate-500">時間帯</span>
            <span className="font-medium text-slate-900">{timeSlotLabel}　<span className="text-slate-500 font-normal">({timeSlotTime})</span></span>
          </div>
          <div className="flex text-sm">
            <span className="w-20 text-slate-500">会議室</span>
            <span className="font-medium text-slate-900">{roomLocation}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="bookerName" className="text-sm font-semibold text-slate-900">
            予約者氏名 <span className="text-red-500">*</span>
          </label>
          <input
            id="bookerName"
            {...register("bookerName")}
            autoFocus
            placeholder="例: 野比 のび太"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {errors.bookerName && (
            <p className="text-sm text-red-500">{errors.bookerName.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "予約中..." : "予約を確定する"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
