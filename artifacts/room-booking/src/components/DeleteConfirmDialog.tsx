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
  details: string;
}

export function DeleteConfirmDialog({ isOpen, onClose, bookingId, bookerName, details }: DeleteConfirmDialogProps) {
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
          この予約をキャンセルしてもよろしいですか？この操作は取り消せません。
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-1">
          <p className="text-sm text-slate-700 font-medium">{details}</p>
          <p className="text-sm text-slate-600">予約者: <span className="font-semibold text-slate-900">{bookerName}</span></p>
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
