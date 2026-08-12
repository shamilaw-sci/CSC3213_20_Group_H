"use client";

import { useEffect, useState } from "react";

export default function AppointmentBooking() {
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchCounsellors();
    fetchAppointments();
  }, []);

  const fetchCounsellors = async () => {
    try {
      const res = await fetch(
        "http://localhost:5050/api/counsellors"
      );

      const data = await res.json();
      setCounsellors(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(
        "http://localhost:5050/api/sessions/appointments"
      );

      const data = await res.json();
      setAppointments(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSlots = async (
    counsellorId: string
  ) => {
    try {
      setSelectedCounsellor(counsellorId);

      const res = await fetch(
        `http://localhost:5050/api/counsellors/${counsellorId}/availability`
      );

      const data = await res.json();

      setSlots(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBook = async () => {
    try {
      const user = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const response = await fetch(
        "http://localhost:5050/api/counsellors/book",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            studentId: user.id,
            counsellorId:
              selectedCounsellor,
            slotId: selectedSlot,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to book appointment"
        );
      }

      alert("Booking successful");

      setSelectedSlot("");

      fetchAppointments();
    } catch (error) {
      console.error(error);
      alert("Booking failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Booking Form */}

      <div>
        <label className="font-bold">
          Select Counsellor
        </label>

        <select
          className="w-full border rounded-xl p-3 mt-2"
          value={selectedCounsellor}
          onChange={(e) =>
            loadSlots(e.target.value)
          }
        >
          <option value="">
            Choose Counsellor
          </option>

          {counsellors.map((c: any) => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.name} -{" "}
              {c.specialization}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-bold">
          Available Slots
        </label>

        <select
          className="w-full border rounded-xl p-3 mt-2"
          value={selectedSlot}
          onChange={(e) =>
            setSelectedSlot(
              e.target.value
            )
          }
        >
          <option value="">
            Select Slot
          </option>

          {slots.map((slot: any) => (
            <option
              key={slot.id}
              value={slot.id}
            >
              {slot.available_date} |{" "}
              {slot.start_time} -{" "}
              {slot.end_time}
            </option>
          ))}
        </select>
      </div>

      <button
        className="bg-blue-600 text-white px-6 py-3 rounded-xl"
        onClick={handleBook}
      >
        Book Appointment
      </button>

      {/* Appointment Table */}

      <div>
        <h2 className="text-2xl font-bold mb-4">
          Appointment History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3">
                  ID
                </th>
                <th className="border p-3">
                  Counsellor
                </th>
                <th className="border p-3">
                  Specialization
                </th>
                <th className="border p-3">
                  Date
                </th>
                <th className="border p-3">
                  Start Time
                </th>
                <th className="border p-3">
                  End Time
                </th>
                <th className="border p-3">
                  Booked At
                </th>
              </tr>
            </thead>

            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border p-4 text-center"
                  >
                    No appointments found
                  </td>
                </tr>
              ) : (
                appointments.map(
                  (appointment: any) => (
                    <tr
                      key={appointment.id}
                    >
                      <td className="border p-3">
                        {appointment.id}
                      </td>

                      <td className="border p-3">
                        {
                          appointment.counsellor_name
                        }
                      </td>

                      <td className="border p-3">
                        {
                          appointment.specialization
                        }
                      </td>

                      <td className="border p-3">
                        {
                          appointment.available_date
                        }
                      </td>

                      <td className="border p-3">
                        {
                          appointment.start_time
                        }
                      </td>

                      <td className="border p-3">
                        {
                          appointment.end_time
                        }
                      </td>

                      <td className="border p-3">
                        {new Date(
                          appointment.booked_at
                        ).toLocaleString()}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}