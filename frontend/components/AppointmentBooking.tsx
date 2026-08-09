"use client";
import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/api";

const AppointmentBooking = () => {
  const [appointment, setAppointment] = useState({
    professional_id: 1,
    client_id: 2,
    appointment_date: "",
    start_time: "",
    end_time: "",
  });

  const handleBooking = async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/book`,
        appointment
      );

      alert(response.data.message);
    } catch (error: any) {
      alert(
        error.response?.data?.message ||
        "Booking Failed"
      );
    }
  };

  return (
    <div>
      <h2>Appointment Booking</h2>

      <input
        type="date"
        value={appointment.appointment_date}
        onChange={(e) =>
          setAppointment({
            ...appointment,
            appointment_date: e.target.value,
          })
        }
      />

      <br /><br />

      <input
        type="time"
        value={appointment.start_time}
        onChange={(e) =>
          setAppointment({
            ...appointment,
            start_time: e.target.value,
          })
        }
      />

      <br /><br />

      <input
        type="time"
        value={appointment.end_time}
        onChange={(e) =>
          setAppointment({
            ...appointment,
            end_time: e.target.value,
          })
        }
      />

      <br /><br />

      <button onClick={handleBooking}>
        Book Appointment
      </button>
    </div>
  );
};

export default AppointmentBooking;