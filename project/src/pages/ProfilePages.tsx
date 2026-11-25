import { Card, SectionTitle, StudentInfoRow } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { Mail, Phone } from 'lucide-react';
import type { StudentProfile } from '@/lib/types';

export function ProfilePage({ student }: { student: StudentProfile }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-brand-black">My Profile</h1>
      <p className="mt-1 text-sm text-brand-gray">Your CampusBites account details.</p>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={student.name} className="h-16 w-16 text-xl" />
          <div>
            <p className="text-lg font-bold text-brand-black">{student.name}</p>
            <p className="text-sm text-brand-gray">{student.student_id}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <StudentInfoRow label="Full Name" value={student.name} />
          <StudentInfoRow label="Student ID" value={student.student_id} />
          <StudentInfoRow label="Department" value={student.department} />
          <StudentInfoRow label="Program" value={student.program} />
          <StudentInfoRow label="University Email" value={student.email} />
          {student.phone && <StudentInfoRow label="Phone" value={student.phone} />}
        </div>
      </Card>
    </div>
  );
}

export function StudentInfoPage({ student }: { student: StudentProfile }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-brand-black">Student Information</h1>
      <p className="mt-1 text-sm text-brand-gray">Official records from Varendra University.</p>

      <Card className="mt-6 p-6">
        <SectionTitle>Academic Record</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentInfoRow label="Student ID" value={student.student_id} />
          <StudentInfoRow label="Program" value={student.program} />
          <StudentInfoRow label="Department" value={student.department} />
          <StudentInfoRow label="Campus" value="Varendra University, Rajshahi" />
        </div>

        <div className="mt-6 border-t border-brand-border pt-5">
          <SectionTitle>Contact</SectionTitle>
          <div className="space-y-3">
            <p className="flex items-center gap-2.5 text-sm text-brand-gray">
              <Mail className="h-4 w-4 text-brand-gold" />
              {student.email}
            </p>
            <p className="flex items-center gap-2.5 text-sm text-brand-gray">
              <Phone className="h-4 w-4 text-brand-gold" />
              {student.phone ? (
                <span className="font-medium text-brand-black">{student.phone}</span>
              ) : (
                <>
                  <span className="font-medium text-brand-black">—</span>
                  <span className="text-xs">(not set)</span>
                </>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
