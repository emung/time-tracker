import { useEffect, useRef, useState } from "react";
import {
  useReportRecipient,
  useUpdateReportRecipient,
  useSendWeeklyReport,
  useSendMonthlyReport,
  useImportCsv,
} from "../api/hooks";

export default function Settings() {
  const { data: recipient } = useReportRecipient();
  const updateReportRecipient = useUpdateReportRecipient();
  const sendWeeklyReport = useSendWeeklyReport();
  const sendMonthlyReport = useSendMonthlyReport();
  const importCsv = useImportCsv();
  const fileInput = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");

  useEffect(() => {
    if (recipient) setEmail(recipient.email);
  }, [recipient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await updateReportRecipient.mutateAsync({ email: email.trim() });
  };

  const handleSendNow = () => {
    if (!recipient?.email) return;
    if (!confirm(`Send this week's report to ${recipient.email} now?`)) return;
    sendWeeklyReport.mutate();
  };

  const handleSendMonthlyNow = () => {
    if (!recipient?.email) return;
    if (!confirm(`Send this month's report to ${recipient.email} now?`)) return;
    sendMonthlyReport.mutate();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    importCsv.mutate(await file.text());
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-sm font-medium text-gray-400">Settings</h1>

      <form onSubmit={handleSave} className="space-y-2">
        <label className="block text-sm text-gray-400">
          Report recipient
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

      <div className="pt-2 border-t border-gray-800 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSendNow}
            disabled={!recipient?.email || sendWeeklyReport.isPending}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {sendWeeklyReport.isPending ? "Sending..." : "Send this week's report now"}
          </button>
          <button
            onClick={handleSendMonthlyNow}
            disabled={!recipient?.email || sendMonthlyReport.isPending}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {sendMonthlyReport.isPending ? "Sending..." : "Send this month's report now"}
          </button>
        </div>
        {sendWeeklyReport.isSuccess && (
          <p className="text-xs text-green-400">
            Weekly report sent to {sendWeeklyReport.data?.to}.
          </p>
        )}
        {sendWeeklyReport.isError && (
          <p className="text-xs text-red-400">
            {(sendWeeklyReport.error as Error).message}
          </p>
        )}
        {sendMonthlyReport.isSuccess && (
          <p className="text-xs text-green-400">
            Monthly report sent to {sendMonthlyReport.data?.to}.
          </p>
        )}
        {sendMonthlyReport.isError && (
          <p className="text-xs text-red-400">
            {(sendMonthlyReport.error as Error).message}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-gray-800 space-y-2">
        <label className="block text-sm text-gray-400">Data</label>
        <p className="text-xs text-gray-500">
          Export all time entries as CSV, or import a previously exported file.
          Entries that already exist are skipped, so importing the same file twice is safe.
        </p>
        <div className="flex gap-2">
          <a
            href="/api/export/all"
            download
            className="bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Export all (CSV)
          </a>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={importCsv.isPending}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {importCsv.isPending ? "Importing..." : "Import CSV"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        {importCsv.isSuccess && (
          <div className="text-xs text-green-400 space-y-1">
            <p>
              Imported {importCsv.data.imported} entries, skipped{" "}
              {importCsv.data.skipped}
              {importCsv.data.projects_created > 0 &&
                `, created ${importCsv.data.projects_created} projects`}
              .
            </p>
            {importCsv.data.warnings.map((w) => (
              <p key={w} className="text-yellow-400">{w}</p>
            ))}
          </div>
        )}
        {importCsv.isError && (
          <p className="text-xs text-red-400">
            {(importCsv.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}
