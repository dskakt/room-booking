import { useQueryClient } from "@tanstack/react-query";
import { useCreateBooking, useDeleteBooking } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type Booking = {
  id: number;
  bookerName: string;
  date: string;
  timeSlot: string;
  roomId: number;
};

export function useBookingMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateBooking({
    mutation: {
      onSuccess: async (createdBooking) => {
        queryClient.setQueriesData(
          { queryKey: ["/api/bookings"] },
          (old: Booking[] | undefined) => {
            if (!old) return old;
            return [...old, createdBooking];
          }
        );

        await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });

        toast({
          title: "予約完了",
          description: "会議室の予約が完了しました。",
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "予約に失敗しました",
          description: error?.error || "既に予約されている可能性があります。",
        });
      },
    },
  });

  const deleteMutation = useDeleteBooking({
    mutation: {
      onSuccess: async (_data, variables) => {
        queryClient.setQueriesData(
          { queryKey: ["/api/bookings"] },
          (old: Booking[] | undefined) => {
            if (!old) return old;
            return old.filter((b) => b.id !== variables.id);
          }
        );

        await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });

        toast({
          title: "予約キャンセル",
          description: "予約をキャンセルしました。",
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "キャンセル失敗",
          description: "予約のキャンセルに失敗しました。",
        });
      },
    },
  });

  return {
    createBooking: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteBooking: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
