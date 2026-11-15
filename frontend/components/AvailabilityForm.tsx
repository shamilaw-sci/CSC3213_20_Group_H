"use client";

import { useEffect, useState } from "react";

export default function AvailabilityForm() {          
  const [slots, setSlots] = useState<any[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStatus, setEditStatus] = useState("Available");

  const counsellorId = 1;

  const loadSlots = async () => {
    try {
      const response = await fetch( 
        "http://localhost:6001/api/availability"
      );

      const data = await response.json();

      setSlots(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadSlots();          //Load Existing Slots                                     
  }, []);

  const handleAddSlot = async () => {                           //Add Availability Slot
    try {
      const response = await fetch(
        "http://localhost:6001/api/availability",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            counsellorId,
            availableDate: date,
            startTime,
            endTime,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message);
        return;
      }

      alert("Availability slot added");

      setDate("");
      setStartTime("");
      setEndTime("");

      loadSlots();
    } catch (error) {
      console.error(error);
      alert("Failed to add slot");
    }
  };

  const updateSlot = async () => {  
    try {
      const response = await fetch(
        `http://localhost:6001/api/availability/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startTime: editStart,
            endTime: editEnd,
            status: editStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.message);
        return;
      }

      alert("Slot updated successfully");

      setEditingId(null);

      loadSlots();
    } catch (error) {
      console.error(error);
      alert("Failed to update slot");
    }
  };

  const deleteSlot = async (id: number) => {
    const confirmed = confirm(
      "Delete this availability slot?"
    );

    if (!confirmed) return;

    try {
      await fetch(
        `http://localhost:6001/api/availability/${id}`,
        {
          method: "DELETE",
        }
      );

      loadSlots();
    } catch (error) {
      console.error(error);
    }
  };

  const totalSlots = slots.length;

  const availableSlots = slots.filter(
    (slot) =>
      slot.status === "Available" ||
      (!slot.status && !slot.is_booked)
  ).length;

  const bookedSlots = slots.filter(
    (slot) =>
      slot.status === "Booked" ||
      slot.is_booked
  ).length;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        Availability Management
      </h1>

      {/* Statistics */}

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-100 p-5 rounded-xl">
          <h3 className="font-semibold text-lg">
            Total Slots
          </h3>
          <p className="text-3xl font-bold">
            {totalSlots}
          </p>
        </div>

        <div className="bg-green-100 p-5 rounded-xl">
          <h3 className="font-semibold text-lg">
            Available
          </h3>
          <p className="text-3xl font-bold">
            {availableSlots}
          </p>
        </div>

        <div className="bg-red-100 p-5 rounded-xl">
          <h3 className="font-semibold text-lg">
            Booked
          </h3>
          <p className="text-3xl font-bold">
            {bookedSlots}
          </p>
        </div>
      </div>

      {/* Add Slot Form */}

      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Add Availability Slot
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="time"
            value={startTime}
            onChange={(e) =>
              setStartTime(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="time"
            value={endTime}
            onChange={(e) =>
              setEndTime(e.target.value)
            }
            className="border p-3 rounded-lg"
          />
        </div>

        <button
          onClick={handleAddSlot}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Slot
        </button>
      </div>

      {/* Availability Table */}

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">
          Current Availability
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
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
                  Start
                </th>

                <th className="border p-3">
                  End
                </th>

                <th className="border p-3">
                  Status
                </th>

                <th className="border p-3">
                  Edit
                </th>

                <th className="border p-3">
                  Delete
                </th>
              </tr>
            </thead>

            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td className="border p-3">
                    {slot.counsellor_name}
                  </td>

                  <td className="border p-3">
                    {slot.specialization}
                  </td>

                  <td className="border p-3">
                    {new Date(
                      slot.available_date
                    ).toLocaleDateString()}
                  </td>

                  <td className="border p-3">
                    {editingId === slot.id ? (
                      <input
                        type="time"
                        value={editStart}
                        onChange={(e) =>
                          setEditStart(
                            e.target.value
                          )
                        }
                        className="border p-1 rounded"
                      />
                    ) : (
                      slot.start_time
                    )}
                  </td>

                  <td className="border p-3">
                    {editingId === slot.id ? (
                      <input
                        type="time"
                        value={editEnd}
                        onChange={(e) =>
                          setEditEnd(
                            e.target.value
                          )
                        }
                        className="border p-1 rounded"
                      />
                    ) : (
                      slot.end_time
                    )}
                  </td>

                  <td className="border p-3">
                    {editingId === slot.id ? (
                      <select
                        value={editStatus}
                        onChange={(e) =>
                          setEditStatus(
                            e.target.value
                          )
                        }
                        className="border p-2 rounded"
                      >
                        <option value="Available">
                          Available
                        </option>

                        <option value="Unavailable">
                          Unavailable
                        </option>

                        <option value="Booked">
                          Booked
                        </option>
                      </select>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          slot.status === "Booked"
                            ? "bg-red-100 text-red-700"
                            : slot.status ===
                              "Unavailable"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {slot.status ||
                          (slot.is_booked
                            ? "Booked"
                            : "Available")}
                      </span>
                    )}
                  </td>

                  <td className="border p-3">
                    {editingId === slot.id ? (
                      <button
                        onClick={updateSlot}
                        className="bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(
                            slot.id
                          );

                          setEditStart(
                            slot.start_time
                          );

                          setEditEnd(
                            slot.end_time
                          );

                          setEditStatus(
                            slot.status ||
                              "Available"
                          );
                        }}
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                    )}
                  </td>

                  <td className="border p-3">
                    <button
                      onClick={() =>
                        deleteSlot(slot.id)
                      }
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {slots.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No availability slots found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}