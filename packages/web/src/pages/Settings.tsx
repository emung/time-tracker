import { useEffect, useState } from "react";
import { useReportRecipient, useUpdateReportRecipient } from "../api/hooks";

export default function Settings() {
  const { data: recipient } = useReportRecipient();
  const updateReportRecipient = useUpdateReportRecipient();

  const [email, setEmail] = useState("");

  useEffect(() => {
    if (recipient) setEmail(recipient.email);
  }, [recipient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await updateReportRecipient.mutateAsync({ email: email.trim() });
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-sm font-medium text-gray-400">Settings</h1>

      <form onSubmit={handleSave} className="space-y-2">
        <label className="block text-sm text-gray-400">
          Weekly report recipient
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!email.trim() || updateReportRecipient.isPending}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {updateReportRecipient.isPending ? "Saving..." : "Save"}
          </button>
        </div>
        {updateReportRecipient.isSuccess && (
          <p className="text-xs text-green-400">Saved.</p>
        )}
        {updateReportRecipient.isError && (
          <p className="text-xs text-red-400">
            {(updateReportRecipient.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}
