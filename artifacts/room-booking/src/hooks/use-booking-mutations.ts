import { useQueryClient } from "@tanstack/react-query";
import { useCreateBooking, useDeleteBooking, getGetBookingsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useBookingMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useCreateBooking({
    mutation: {
      onSuccess: async () => {
  await queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
  await queryClient.refetchQueries({ queryKey: ["/api/bookings"] });
  toast({
    title: "予約完了",
    description: "会議室の予約が完了しました。",
  });
},
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "予約に失敗しました",
          description: error?.error || "既に予約されている可能性があります。",
        });
      }
    }
  });

  const deleteMutation = useDeleteBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        toast({
          title: "予約キャンセル",
          description: "予約をキャンセルしました。",
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "キャンセル失敗",
          description: "予約のキャンセルに失敗しました。",
        });
      }
    }
  });

  return {
    createBooking: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteBooking: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
