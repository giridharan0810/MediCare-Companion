"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";

interface MedicationTrackerProps {
  medId: string;
  date: string;
  time: string;
  isTaken: boolean;
  onTaken: (newDate: string) => void;
}

const MedicationTracker = ({
  medId,
  date,
  time,
  isTaken,
  onTaken,
}: MedicationTrackerProps) => {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const markTaken = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("medications")
        .update({ taken: true })
        .eq("id", medId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      onTaken(date);
    },
  });

  // ✅ Already taken view
  if (isTaken) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <span className="font-medium text-green-800">
              Taken at {time}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline">
              <Clock className="w-4 h-4 mr-1" />
              {time}
            </Badge>
            <span className="font-medium">Scheduled time</span>
          </div>
        </CardContent>
      </Card>

      {date === todayStr ? (
        <Button
          className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={() => markTaken.mutate()}
        >
          {markTaken.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Mark as Taken
            </>
          )}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can only mark today's medication.
        </p>
      )}
    </div>
  );
};

export default MedicationTracker;
