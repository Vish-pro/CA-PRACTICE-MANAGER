"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { month: 'Jan', sales: 400000, collections: 350000 },
  { month: 'Feb', sales: 450000, collections: 420000 },
  { month: 'Mar', sales: 600000, collections: 500000 },
  { month: 'Apr', sales: 420000, collections: 480000 },
  { month: 'May', sales: 500000, collections: 400000 },
  { month: 'Jun', sales: 700000, collections: 650000 },
];

const topServices = [
  { name: 'Audit', revenue: 1500000 },
  { name: 'GST Filing', revenue: 800000 },
  { name: 'ITR', revenue: 600000 },
  { name: 'Company Inc.', revenue: 400000 },
  { name: 'Advisory', revenue: 250000 },
];

export default function FinancialReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Financial Analytics</h2>
        <p className="text-muted-foreground">Revenue trends, collections, and top-performing services.</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Collections Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Line type="monotone" dataKey="sales" stroke="var(--color-primary)" strokeWidth={2} name="Sales" />
                  <Line type="monotone" dataKey="collections" stroke="#10b981" strokeWidth={2} name="Collections" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Revenue-Generating Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => `₹${value/1000}k`} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client-Wise Outstanding Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium text-right">Total Sales</th>
                  <th className="px-6 py-4 font-medium text-right">Total Collected</th>
                  <th className="px-6 py-4 font-medium text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">Acme Corp</td>
                  <td className="px-6 py-4 text-right">₹1,20,000</td>
                  <td className="px-6 py-4 text-right">₹75,000</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">₹45,000</td>
                </tr>
                <tr className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">TechFlow Inc</td>
                  <td className="px-6 py-4 text-right">₹80,000</td>
                  <td className="px-6 py-4 text-right">₹80,000</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">₹0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}