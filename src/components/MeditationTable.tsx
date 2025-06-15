"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  date: string;
  time: string;
  taken: boolean;
  user_id: string;
}

const MedicationTable = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Medication>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  const { data: medications, isLoading } = useQuery({
    queryKey: ["medications", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });

  const updateMedication = useMutation({
    mutationFn: async (updatedMed: Partial<Medication>) => {
      if (!editingId) throw new Error("No medication selected for editing");
      
      const { error } = await supabase
        .from("medications")
        .update(updatedMed)
        .eq("id", editingId);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      setEditingId(null);
      setEditForm({});
      toast.success("Medication updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteMedication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", id);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      toast.success("Medication deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const toggleTakenStatus = useMutation({
    mutationFn: async ({ id, taken }: { id: string; taken: boolean }) => {
      const { error } = await supabase
        .from("medications")
        .update({ taken: !taken, taken_at: taken ? null : new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      toast.success("Medication status updated");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleEditClick = (med: Medication) => {
    setEditingId(med.id);
    setEditForm({
      name: med.name,
      dosage: med.dosage,
      date: med.date,
      time: med.time
    });
  };

  const handleSave = () => {
    if (!editForm.name || !editForm.dosage || !editForm.date || !editForm.time) {
      toast.error("Please fill all fields");
      return;
    }
    updateMedication.mutate(editForm);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-6">Medication Management</h2>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Dosage</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {medications?.length ? (
                medications.map((med) => (
                  <tr 
                    key={med.id} 
                    className={`border-t ${med.taken ? 'bg-green-50' : ''}`}
                  >
                    {editingId === med.id ? (
                      <>
                        <td className="px-4 py-3">
                          <Input
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Medication name"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            value={editForm.dosage || ""}
                            onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })}
                            placeholder="Dosage"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="date"
                            value={editForm.date || ""}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="time"
                            value={editForm.time || ""}
                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant={med.taken ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleTakenStatus.mutate({ id: med.id, taken: med.taken })}
                          >
                            {med.taken ? "Taken" : "Pending"}
                          </Button>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button size="sm" onClick={handleSave}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium">{med.name}</td>
                        <td className="px-4 py-3">{med.dosage}</td>
                        <td className="px-4 py-3">{med.date}</td>
                        <td className="px-4 py-3">{med.time}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant={med.taken ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleTakenStatus.mutate({ id: med.id, taken: med.taken })}
                          >
                            {med.taken ? "Taken" : "Pending"}
                          </Button>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditClick(med)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMedication.mutate(med.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No medications found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MedicationTable;