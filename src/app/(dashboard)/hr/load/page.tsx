"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: 'John Doe', tasks: 12 },
  { name: 'Jane Smith', tasks: 19 },
  { name: 'Mike Ross', tasks: 8 },
  { name: 'Sarah Lynn', tasks: 15 },
  { name: 'Tom Hardy', tasks: 5 },
];

export default function EmployeeLoadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Employee Load Dashboard</h2>
        <p className="text-muted-foreground">Monitor task distribution across your team to prevent burnout.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Tasks per Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="tasks" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
