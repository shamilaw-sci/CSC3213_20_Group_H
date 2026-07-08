"use client";

import { useState } from "react";
import api from "@/services/api";
import { Availability } from "@/types/Availability";

const AvailabilityForm = () => {
  const [formData, setFormData] = useState<Availability>({
    professional_id: 1,
    available_date: "",
    start_time: "",
    end_time: "",
  });

  const handleSubmit = async () => {
    try {
      await api.post("/availability", formData);

      alert("Availability Added Successfully");

      setFormData({
        professional_id: 1,
        available_date: "",
        start_time: "",
        end_time: "",
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to add availability");
    }
  };

  return (
    <div>
      <h2>Add Availability</h2>

      <input
        type="date"
        value={formData.available_date}
        onChange={(e) =>
          setFormData({
            ...formData,
            available_date: e.target.value,
          })
        }
      />

      <br />
      <br />

      <input
        type="time"
        value={formData.start_time}
        onChange={(e) =>
          setFormData({
            ...formData,
            start_time: e.target.value,
          })
        }
      />

      <br />
      <br />

      <input
        type="time"
        value={formData.end_time}
        onChange={(e) =>
          setFormData({
            ...formData,
            end_time: e.target.value,
          })
        }
      />

      <br />
      <br />

      <button onClick={handleSubmit}>
        Save Availability
      </button>
    </div>
  );
};

export default AvailabilityForm;