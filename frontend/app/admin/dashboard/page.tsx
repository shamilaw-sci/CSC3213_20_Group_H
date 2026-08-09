'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:5000/api/admin/analytics', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) setAnalytics(data);
            setLoading(false);
        })
        .catch(err => console.error(err));
    }, []);

    if (loading) return <div className="p-8 text-white">Loading Admin Metrics...</div>;

    return (
        <div className="p-8 space-y-6 bg-slate-950 text-white min-h-screen">
            <h1 className="text-3xl font-bold">System Administration Dashboard</h1>
            
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                    <p className="text-slate-400">Total Students</p>
                    <h3 className="text-4xl font-ext500 mt-2">{analytics?.stats?.totalStudents}</h3>
                </div>
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                    <p className="text-slate-400">Verified Counsellors</p>
                    <h3 className="text-4xl font-ext500 mt-2">{analytics?.stats?.totalCounsellors}</h3>
                </div>
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                    <p className="text-slate-400">Active Crisis Alerts</p>
                    <h3 className="text-4xl font-red-500 mt-2 text-rose-500">{analytics?.stats?.activeEmergencies}</h3>
                </div>
            </div>

            {/* Recharts Visualization */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
                <h2 className="text-xl font-semibold mb-4">Severity Trends Breakdown</h2>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics?.charts?.severityStats || []}>
                            <XAxis dataKey="severity_score" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}