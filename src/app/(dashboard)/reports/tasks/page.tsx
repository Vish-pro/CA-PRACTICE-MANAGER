"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const taskTrends = [
  { month: 'Jan', created: 120, completed: 110 },
  { month: 'Feb', created: 140, completed: 130 },
  { month: 'Mar', created: 180, completed: 160 },
  { month: 'Apr', created: 150, completed: 145 },
  { month: 'May', created: 160, completed: 155 },
  { month: 'Jun', created: 200, completed: 190 },
];

export default function TaskReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Task Analytics</h2>
        <p className="text-muted-foreground">Monitor firm-wide productivity and aging tasks.</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Creation vs Completion Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={taskTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="created" stroke="var(--color-secondary)" fill="var(--color-secondary)" fillOpacity={0.2} name="Tasks Created" />
                  <Area type="monotone" dataKey="completed" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.4} name="Tasks Completed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Aging Report</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg bg-red-50 text-red-900 border-red-200">
                <div>
                  <div className="font-semibold">&gt; 30 Days Overdue</div>
                  <div className="text-sm">Critical attention required</div>
                </div>
                <div className="text-2xl font-bold">12</div>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg bg-orange-50 text-orange-900 border-orange-200">
                <div>
                  <div className="font-semibold">15 - 30 Days Overdue</div>
                  <div className="text-sm">Warning</div>
                </div>
                <div className="text-2xl font-bold">28</div>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg bg-yellow-50 text-yellow-900 border-yellow-200">
                <div>
                  <div className="font-semibold">1 - 14 Days Overdue</div>
                  <div className="text-sm">Watch list</div>
                </div>
                <div className="text-2xl font-bold">45</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}