"use client";

import { AlertTriangle, Phone, ShieldAlert } from "lucide-react";
import { CrisisResources } from "@/types/ChatMessage";

const DEFAULT_RESOURCES: CrisisResources = {
  disclaimer:
    "CareBridge provides supportive screening and cannot automatically contact emergency services on your behalf. If you are in immediate danger, please call local emergency services right away.",
  contacts: [
    {
      name: "National Mental Health Helpline (Sri Lanka)",
      number: "1926",
      availability: "24/7 toll-free",
    },
    {
      name: "CCCline Emotional Support",
      number: "1333",
      availability: "24/7 confidential support",
    },
    {
      name: "Sri Lanka Emergency Services",
      number: "119",
      availability: "Immediate emergency response",
    },
  ],
};

export default function CrisisResourcesBanner({
  resources,
  onDismiss,
}: {
  resources?: CrisisResources | null;
  onDismiss?: () => void;
}) {
  const effective = resources || DEFAULT_RESOURCES;

  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-950 shadow-sm space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-sm text-red-900">
              Immediate Safety & Crisis Support Resources
            </h3>
            <p className="text-xs text-red-800 mt-1">
              Are you in a safe place right now? If you can, please reach out to a trusted person
              who can stay with you, or contact one of the services below immediately.
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-semibold text-red-700 hover:underline shrink-0"
          >
            Hide
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {effective.contacts.map((contact) => (
          <div
            key={contact.name}
            className="flex items-center justify-between rounded-xl bg-white border border-red-200 px-3 py-2"
          >
            <div>
              <p className="text-xs font-bold text-gray-900">{contact.name}</p>
              <p className="text-[11px] text-gray-500">{contact.availability}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              <Phone size={12} />
              {contact.number}
            </span>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-red-800">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>{effective.disclaimer}</span>
      </p>
    </div>
  );
}
