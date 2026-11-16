
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import socket from "@/services/socket";

interface EmergencyRequest {
    id: number;
    student_id: number;
    student_name: string;
    student_email: string;
    room_id: string;
    status: string;
    created_at: string;
}

export default function EmergencyRequests() {
    const router = useRouter();

    const [requests, setRequests] = useState<EmergencyRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:6001/api/emergency/requests",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load requests.");
            }

            setRequests(Array.isArray(data) ? data : []);

        } catch (error) {
            console.error("Load emergency requests error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load requests and listen for new emergency requests.
    useEffect(() => {
        loadRequests();

        const handleNewEmergency = () => {
            loadRequests();
        };

        socket.on("emergencyAlert", handleNewEmergency);

        return () => {
            socket.off("emergencyAlert", handleNewEmergency);
        };
    }, [loadRequests]);

    // Counsellor accepts a request.
    const acceptRequest = async (request: EmergencyRequest) => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:6001/api/emergency/${request.id}/accept`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to accept request.");
                return;
            }

            if (!data.roomId) {
                alert("The server did not return a room ID.");
                return;
            }

            alert(`Starting emergency call with ${request.student_name}`);

            // Use the room ID returned by the backend.
            router.push(
                `/voice-call?room=${encodeURIComponent(data.roomId)}&emergencyId=${request.id}`
            );

            loadRequests();

        } catch (error) {
            console.error("Accept request error:", error);
            alert("Failed to start emergency call.");
        }
    };

    // Complete an accepted request.
    const completeRequest = async (id: number) => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:6001/api/emergency/${id}/complete`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Unable to complete request.");
                return;
            }

            await loadRequests();

        } catch (error) {
            console.error("Complete request error:", error);
        }
    };

    // Cancel a request.
    const cancelRequest = async (id: number) => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `http://localhost:6001/api/emergency/${id}/cancel`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Unable to cancel request.");
                return;
            }

            await loadRequests();

        } catch (error) {
            console.error("Cancel request error:", error);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Pending":
                return "bg-yellow-100 text-yellow-700";

            case "Accepted":
                return "bg-green-100 text-green-700";

            case "Completed":
                return "bg-blue-100 text-blue-700";

            case "Cancelled":
                return "bg-red-100 text-red-700";

            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="rounded-2xl bg-white p-6 shadow-lg">

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                    Emergency Requests
                </h2>

                <button
                    onClick={loadRequests}
                    disabled={loading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {requests.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                    No emergency requests available.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200">

                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-3">Student</th>
                                <th className="border p-3">Email</th>
                                <th className="border p-3">Status</th>
                                <th className="border p-3">Submitted</th>
                                <th className="border p-3">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {requests.map((request) => (
                                <tr key={request.id}>

                                    <td className="border p-3">
                                        {request.student_name}
                                    </td>

                                    <td className="border p-3">
                                        {request.student_email}
                                    </td>

                                    <td className="border p-3">
                                        <span
                                            className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusStyle(request.status)}`}
                                        >
                                            {request.status}
                                        </span>
                                    </td>

                                    <td className="border p-3">
                                        {request.created_at
                                            ? new Date(request.created_at).toLocaleString()
                                            : "N/A"}
                                    </td>

                                    <td className="border p-3">
                                        <div className="flex flex-wrap gap-2">

                                            {request.status === "Pending" && (
                                                <>
                                                    <button
                                                        onClick={() => acceptRequest(request)}
                                                        className="rounded bg-green-600 px-3 py-1 text-white"
                                                    >
                                                        Call Student
                                                    </button>

                                                    <button
                                                        onClick={() => cancelRequest(request.id)}
                                                        className="rounded bg-red-600 px-3 py-1 text-white"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}

                                            {request.status === "Accepted" && (
                                                <button
                                                    onClick={() => completeRequest(request.id)}
                                                    className="rounded bg-blue-600 px-3 py-1 text-white"
                                                >
                                                    Complete
                                                </button>
                                            )}

                                            {(request.status === "Completed" ||
                                                request.status === "Cancelled") && (
                                                <span className="text-sm text-gray-500">
                                                    No actions available
                                                </span>
                                            )}

                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
            )}
        </div>
    );
}
