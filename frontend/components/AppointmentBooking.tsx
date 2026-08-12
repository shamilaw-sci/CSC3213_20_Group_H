"use client";

import { useEffect, useState } from "react";

export default function AppointmentBooking() {
  const [counsellors, setCounsellors] =
    useState([]);

  const [selectedCounsellor,
    setSelectedCounsellor] = useState("");

  const [slots, setSlots] = useState([]);

  const [selectedSlot,
    setSelectedSlot] = useState("");

  useEffect(() => {
    fetch(
      "http://localhost:5050/api/counsellors"
    )
      .then((res) => res.json())
      .then(setCounsellors);
  }, []);

  const loadSlots = async (
    counsellorId: string
  ) => {
    setSelectedCounsellor(counsellorId);

    const res = await fetch(
      `http://localhost:5050/api/counsellors/${counsellorId}/availability`
    );

    const data = await res.json();

    setSlots(data);
  };

  const handleBook = async () => {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    await fetch(
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

    alert("Booking successful");
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="font-bold">
          Select Counsellor
        </label>

        <select
          className="w-full border rounded-xl p-3 mt-2"
          onChange={(e) =>
            loadSlots(e.target.value)
          }
        >
          <option>
            Choose Counsellor
          </option>

          {counsellors.map((c: any) => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.name} - {c.specialization}
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
          onChange={(e) =>
            setSelectedSlot(
              e.target.value
            )
          }
        >
          <option>
            Select Slot
          </option>

          {slots.map((slot: any) => (
            <option
              key={slot.id}
              value={slot.id}
            >
              {slot.available_date}
              {" | "}
              {slot.start_time}
              {" - "}
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
    </div>
  );
}