import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Check, Calendar as CalendarIcon, Image, User } from "lucide-react";
import MedicationTracker from "./MedicationTracker";
import { format, isToday, isBefore, startOfDay, subDays, endOfMonth, differenceInDays, startOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import AddMedication from "./AddMeditation";
import MedicationTable from "./MeditationTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface Medication {
  id: string;
  date: string;
  time: string;
  taken: boolean;
  photo_url: string | null;
  name: string;
  dosage: string;
  user_id: string;
}

const PatientDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  // Fetch all medications for the current month to calculate metrics
  const { data: allMedications } = useQuery({
    queryKey: ["allMedications", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const today = new Date();
      const startOfCurrentMonth = startOfMonth(today);
      const endOfCurrentMonth = endOfMonth(today);
      
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", userId)
        .gte("date", format(startOfCurrentMonth, "yyyy-MM-dd"))
        .lte("date", format(endOfCurrentMonth, "yyyy-MM-dd"));
      
      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!userId,
  });

  // Fetch medications for the selected date
  const { data: dailyMedications, isLoading, error } = useQuery({
    queryKey: ["dailyMedications", userId, selectedDate],
    queryFn: async () => {
      if (!userId) return [];
      
      const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", userId)
        .eq("date", selectedDateStr)
        .order("time", { ascending: true });
      
      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!userId,
  });

  // Mutation for marking medication as taken
  const markTakenMutation = useMutation({
    mutationFn: async ({ medId, imageFile }: { medId: string, imageFile?: File }) => {
      let photoUrl = null;
      
      if (imageFile) {
        const fileName = `${medId}-${Date.now()}`;
        const { data, error } = await supabase
          .storage
          .from("medication-proofs")
          .upload(fileName, imageFile);
        
        if (error) throw error;
        photoUrl = data.path;
      }

      const { error: updateError } = await supabase
        .from("medications")
        .update({ 
          taken: true,
          taken_at: new Date().toISOString(),
          photo_url: photoUrl 
        })
        .eq("id", medId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["dailyMedications"]);
      queryClient.invalidateQueries(["allMedications"]);
      toast.success("Medication marked as taken");
    },
    onError: (error) => {
      toast.error("Failed to mark medication as taken");
      console.error(error);
    }
  });

  // Calculate metrics and medication status for each day
  const calculateMedicationStatus = () => {
    if (!allMedications) return {
      streakCount: 0,
      todayStatus: false,
      adherenceRate: 0,
      takenDates: new Set<string>(),
      missedDates: new Set<string>(),
      dayStatus: new Map<string, 'taken' | 'missed' | 'none'>(),
    };

    const takenDates = new Set<string>();
    const missedDates = new Set<string>();
    const dayStatus = new Map<string, 'taken' | 'missed' | 'none'>();
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    // Get all days in current month
    const daysInMonth = eachDayOfInterval({
      start: currentMonthStart,
      end: currentMonthEnd
    });

    // Initialize all days with 'none' status
    daysInMonth.forEach(day => {
      dayStatus.set(format(day, 'yyyy-MM-dd'), 'none');
    });

    // Group medications by date
    const medsByDate: Record<string, Medication[]> = {};
    allMedications.forEach(med => {
      if (!medsByDate[med.date]) {
        medsByDate[med.date] = [];
      }
      medsByDate[med.date].push(med);
    });

    // Determine status for each day
    Object.entries(medsByDate).forEach(([date, meds]) => {
      const allTaken = meds.every(m => m.taken);
      const anyTaken = meds.some(m => m.taken);
      const isPast = isBefore(new Date(date), startOfDay(today));

      if (allTaken) {
        takenDates.add(date);
        dayStatus.set(date, 'taken');
      } else if (isPast && !anyTaken) {
        missedDates.add(date);
        dayStatus.set(date, 'missed');
      }
    });

    // Calculate streak
    let streakCount = 0;
    let currentDate = new Date(today);
    while (takenDates.has(format(currentDate, 'yyyy-MM-dd')) && streakCount < 30) {
      streakCount++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate adherence rate for current month
    const daysPassed = differenceInDays(today, currentMonthStart) + 1;
    const adherenceRate = Math.round((takenDates.size / daysPassed) * 100);

    return {
      streakCount,
      todayStatus: takenDates.has(format(today, 'yyyy-MM-dd')),
      adherenceRate,
      takenDates,
      missedDates,
      dayStatus,
    };
  };

  const { streakCount, todayStatus, adherenceRate, dayStatus } = calculateMedicationStatus();

  const handleAdd = () => {
    setShowAdd(true);
  };

  const handleMarkTaken = (medId: string, date: string, imageFile?: File) => {
    markTakenMutation.mutate({ medId, imageFile });
  };

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dayStatus?.get(dateStr) || 'none';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!</h2>
            <p className="text-white/90 text-lg">Ready to stay on track with your medication?</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{streakCount}</div>
            <div className="text-white/80">Day Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{todayStatus ? "✓" : "○"}</div>
            <div className="text-white/80">Today's Status</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{adherenceRate}%</div>
            <div className="text-white/80">Monthly Rate</div>
          </div>
        </div>
      </div>

      <div>
        <Button onClick={handleAdd}>Add Medication</Button>
        {showAdd && <AddMedication onClose={() => setShowAdd(false)} />}
      </div>

      <div>
        <MedicationTable />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Medication */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                {isToday(selectedDate) ? "Today's Medication" : `Medication for ${format(selectedDate, 'MMMM d, yyyy')}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Card>
                <CardContent className="space-y-4 pt-6">
                  {isLoading && <p>Loading medications...</p>}
                  {error && <p className="text-red-500">Error loading medications</p>}
                  {dailyMedications?.length === 0 && <p>No medications scheduled for this date.</p>}

                  {dailyMedications?.map((med: Medication) => (
                    <MedicationTracker
                      key={med.id}
                      medId={med.id}
                      date={med.date}
                      time={med.time}
                      isTaken={med.taken}
                      photoUrl={med.photo_url}
                      name={med.name}
                      dosage={med.dosage}
                      onTaken={handleMarkTaken}
                    />
                  ))}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Medication Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full rounded-md border"
                modifiersClassNames={{
                  selected: "bg-blue-600 text-white hover:bg-blue-700",
                }}
                components={{
                  DayContent: ({ date }) => {
                    const status = getDayStatus(date);
                    const isCurrentDay = isToday(date);
                    const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                    const isOtherMonth = !isSameMonth(date, new Date());

                    let className = "relative w-full h-full flex items-center justify-center rounded-full ";
                    
                    if (isSelected) {
                      className += "bg-blue-600 text-white";
                    } else if (isCurrentDay) {
                      className += "bg-blue-100 text-blue-800";
                    } else if (status === 'taken') {
                      className += "bg-green-100 text-green-800";
                    } else if (status === 'missed') {
                      className += "bg-red-100 text-red-800";
                    } else if (isOtherMonth) {
                      className += "text-gray-400";
                    }

                    return (
                      <div className={className}>
                        {date.getDate()}
                        {status === 'taken' && !isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {status === 'missed' && !isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    );
                  }
                }}
              />
              
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>All medications taken</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span>Missed medications</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span>Selected day</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;