"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/api";

interface Counsellor {           //Load Councellors 
  id: number;
  name: string;
  specialization: string;
}

interface Slot {                     //Load Availability
  id: number;
  available_date: string;
  start_time: string;
  end_time: string;
}

interface Appointment {              //Book Appointment
  id: number;
  counsellor_name: string;
  specialization: string;
  available_date: string;
  start_time: string;
  end_time: string;
  booked_at: string;
}

export default function AppointmentBooking() {
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);

  const [selectedCounsellor, setSelectedCounsellor] = useState("");

  const [slots, setSlots] = useState<Slot[]>([]);

  const [selectedSlot, setSelectedSlot] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetchCounsellors();
    fetchAppointments();
  }, []);

  const fetchCounsellors = async () => {
    try {
      const res = await fetch("http://localhost:6001/api/counsellors");

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch counsellors");
      }

      setCounsellors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch counsellors:", error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!user.id) return;

      const res = await fetch(`http://localhost:6001/api/sessions/${user.id}`);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch appointments");
      }

      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  };

  const loadSlots = async (counsellorId: string) => {             //Load Counsellor's available slots based on the selected counsellor
    try {
      setSelectedCounsellor(counsellorId);
      setSelectedSlot("");

      if (!counsellorId) {
        setSlots([]);
        return;
      }

      const res = await fetch(
        `http://localhost:6001/api/counsellors/${counsellorId}/availability`,
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch slots");
      }

      setSlots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch slots:", error);
    }
  };

  const handleBook = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!selectedCounsellor || !selectedSlot) {
        alert("Please select a counsellor and slot");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/counsellors/book`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: user.id,
            counsellorId: selectedCounsellor,
            slotId: selectedSlot,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to book appointment");
      }

      alert("Appointment booked successfully!");

      setSelectedSlot("");

      await fetchAppointments();
      await loadSlots(selectedCounsellor);
    } catch (error) {
      console.error(error);
      alert("Booking failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Counsellor Dropdown */}

      <div>
        <label className="block font-semibold mb-2">Select Counsellor</label>

        <select
          className="w-full border border-gray-300 rounded-xl p-3"
          value={selectedCounsellor}
          onChange={(e) => loadSlots(e.target.value)}
        >
          <option value="">Choose Counsellor</option>

          {counsellors.map((counsellor) => (
            <option key={counsellor.id} value={counsellor.id}>
              {counsellor.name} ({counsellor.specialization})
            </option>
          ))}
        </select>
      </div>

      {/* Slot Dropdown */}

      <div>
        <label className="block font-semibold mb-2">Available Slots</label>

        <select
          className="w-full border border-gray-300 rounded-xl p-3"
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
        >
          <option value="">Select Slot</option>

          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.available_date}
              {" | "}
              {slot.start_time}
              {" - "}
              {slot.end_time}
            </option>
          ))}
        </select>
      </div>

      {/* Book Button */}

      <button
        onClick={handleBook}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold"
      >
        Book Appointment
      </button>

      {/* History */}

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">My Appointments</h2>

        {appointments.length === 0 ? (
          <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-600">
            No appointments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border">Counsellor</th>
                  <th className="p-3 border">Specialization</th>
                  <th className="p-3 border">Date</th>
                  <th className="p-3 border">Time</th>
                  <th className="p-3 border">Booked At</th>
                </tr>
              </thead>

              <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="border p-3 font-medium">
                        {appointment.counsellor_name}
                      </td>

                      <td className="border p-3">
                        {appointment.specialization}
                      </td>

                      <td className="border p-3">
                        {new Date(
                          appointment.available_date
                        ).toLocaleDateString()}
                      </td>

                      <td className="border p-3">
                        {appointment.start_time}
                        {" - "}
                        {appointment.end_time}
                      </td>

                      <td className="border p-3">
                        {new Date(
                          appointment.booked_at
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
