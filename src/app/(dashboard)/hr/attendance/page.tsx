"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";

export default function AttendancePage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"OUT" | "IN">("OUT");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  const handleCheckInOut = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });

          // Here we would typically send this to the API
          setTimeout(() => {
            setStatus(status === "OUT" ? "IN" : "OUT");
            setLoading(false);
          }, 1000);
        },
        (error) => {
          console.error("Error getting location", error);
          alert("Location access is required for attendance.");
          setLoading(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
        <p className="text-muted-foreground">Mark your daily check-in and check-out with location tracking.</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Today&apos;s Status</CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg">
            <div className={`text-4xl font-bold mb-2 ${status === 'IN' ? 'text-primary' : 'text-muted-foreground'}`}>
              {status === 'IN' ? 'Checked In' : 'Checked Out'}
            </div>
            {location && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <MapPin className="w-4 h-4 mr-1" />
                Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
              </div>
            )}
          </div>

          <Button
            className="w-full h-14 text-lg"
            variant={status === "OUT" ? "default" : "secondary"}
            onClick={handleCheckInOut}
            disabled={loading}
          >
            <Clock className="w-5 h-5 mr-2" />
            {loading ? "Processing..." : status === "OUT" ? "Check In" : "Check Out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
