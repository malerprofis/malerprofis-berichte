import UserManagement from './UserManagement.tsx';
import WeeklyReportsAdmin from './WeeklyReportsAdmin.tsx';
import AbnahmeProtocolsAdmin from './AbnahmeProtocolsAdmin.tsx';
import ExpensesAdmin from './ExpensesAdmin.tsx';
import SafetyFilesAdmin from './SafetyFilesAdmin.tsx';
import LeaveAdmin from '../leave/LeaveAdmin.tsx';
import type { Employee, Holiday, LeaveRequest } from '../../lib/database.types.ts';

/**
 * Verwaltung: Berichte, Abnahmen, Auslagen, Urlaubsanträge, die Unterlagen zur
 * Arbeitssicherheit und die Benutzer.
 *
 * Baustellen werden seit 2.20 im Reiter „Projekte“ angelegt und gepflegt —
 * dort liegt alles zu einer Baustelle an einem Ort.
 *
 * Sichtbar nur für Rolle 'admin'. Die Datenbank weist Schreibzugriffe anderer
 * Rollen ohnehin zurück — die Ausblendung hier ist reine Bequemlichkeit, keine
 * Sicherheitsmaßnahme.
 */
export default function AdminPanel({
  employees,
  leaveRequests,
  holidays,
  assignmentCountInRange,
  currentUserId,
  onChanged,
}: {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
  assignmentCountInRange: (employeeId: string, start: string, end: string) => number;
  currentUserId: string;
  onChanged: () => Promise<void>;
}) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Verwaltung</h2>

      {/* Reihenfolge nach Gebrauch im Büro: erst was laufend hereinkommt
          (Berichte, Abnahmen, Anträge), dann die Stammdaten. */}

      {/* --------------------------------------------------------------- */}
      <WeeklyReportsAdmin />

      {/* --------------------------------------------------------------- */}
      <AbnahmeProtocolsAdmin />

      {/* --------------------------------------------------------------- */}
      <ExpensesAdmin currentUserId={currentUserId} />

      {/* --------------------------------------------------------------- */}
      <LeaveAdmin
        employees={employees}
        leaveRequests={leaveRequests}
        holidays={holidays}
        assignmentCountInRange={assignmentCountInRange}
        onChanged={onChanged}
      />

      {/* --------------------------------------------------------------- */}
      <SafetyFilesAdmin currentUserId={currentUserId} />

      {/* --------------------------------------------------------------- */}
      <UserManagement
        employees={employees}
        currentUserId={currentUserId}
        onChanged={onChanged}
      />

    </div>
  );
}
