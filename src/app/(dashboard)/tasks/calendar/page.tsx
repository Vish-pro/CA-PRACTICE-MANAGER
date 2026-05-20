"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarViewPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = addDays(startOfWeek(monthEnd), 6);

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => {
    setCurrentDate(addDays(monthEnd, 1));
  };

  const prevMonth = () => {
    setCurrentDate(addDays(monthStart, -1));
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground">View all your tasks and deadlines in one place.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <CardTitle className="text-xl">{format(currentDate, dateFormat)}</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr h-full min-h-[500px]">
            {days.map((day, i) => (
              <div
                key={day.toString()}
                className={`border-b border-r min-h-[100px] p-2 ${!isSameMonth(day, monthStart) ? 'bg-muted/30 text-muted-foreground' : ''} ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}
              >
                <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground' : ''}`}>
                  {format(day, "d")}
                </div>
                {/* Mock Task Indicator */}
                {i % 8 === 0 && (
                  <div className="mt-1 bg-red-100 text-red-800 text-xs px-1 py-0.5 rounded truncate">
                    GST Due
                  </div>
                )}
                {i % 12 === 0 && (
                  <div className="mt-1 bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded truncate">
                    Audit Followup
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
