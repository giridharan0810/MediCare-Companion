import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AddMedication = () => {
  const [form, setForm] = useState({ name: "", dosage: "", date: "", time: "" });

  const addMedication = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from("medications").insert([
        {
          user_id: user.id,
          name: form.name,
          dosage: form.dosage,
          date: form.date,
          time: form.time,
          taken: false
        }
      ]);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setForm({ name: "", dosage: "", date: "", time: "" });
      alert("Medication added successfully!");
    },
    onError: (error) => {
      alert("Failed to add medication: " + error.message);
    }
  });

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add Medication</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label>Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Dosage</Label>
          <Input
            value={form.dosage}
            onChange={(e) => setForm({ ...form, dosage: e.target.value })}
          />
        </div>
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <Label>Time</Label>
          <Input
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </div>
      </div>
      <Button
        className="mt-4"
        onClick={() => addMedication.mutate()}
      >
        Add Medication
      </Button>
    </div>
  );
};

export default AddMedication;
