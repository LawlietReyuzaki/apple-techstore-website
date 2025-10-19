import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, ArrowLeft, Search, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const TrackRepair = () => {
  const [searchParams] = useSearchParams();
  const [trackingCode, setTrackingCode] = useState(searchParams.get("code") || "");
  const [repair, setRepair] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setTrackingCode(code);
      handleSearch(code);
    }
  }, [searchParams]);

  const handleSearch = async (code?: string) => {
    const searchCode = code || trackingCode;
    if (!searchCode) {
      toast.error("Please enter a tracking code");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from("repairs")
        .select("*")
        .eq("tracking_code", searchCode)
        .maybeSingle();

      if (error) throw error;

      setRepair(data);

      if (!data) {
        toast.error("Repair not found", {
          description: "Please check your tracking code and try again.",
        });
      }
    } catch (error) {
      console.error("Error fetching repair:", error);
      toast.error("Failed to fetch repair details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      created: { label: "Received", color: "bg-blue-500", icon: Clock },
      assigned: { label: "Assigned to Technician", color: "bg-purple-500", icon: AlertCircle },
      estimate: { label: "Estimate Provided", color: "bg-yellow-500", icon: AlertCircle },
      approved: { label: "Approved", color: "bg-green-500", icon: CheckCircle },
      in_progress: { label: "In Progress", color: "bg-orange-500", icon: Clock },
      completed: { label: "Completed", color: "bg-green-600", icon: CheckCircle },
      delivered: { label: "Delivered", color: "bg-green-700", icon: CheckCircle },
      closed: { label: "Closed", color: "bg-gray-500", icon: XCircle },
      dispute: { label: "Dispute", color: "bg-red-500", icon: XCircle },
    };
    return statusMap[status] || statusMap.created;
  };

  const statusInfo = repair ? getStatusInfo(repair.status) : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dilbar Mobiles</h1>
              <p className="text-xs text-muted-foreground">Repair Shop</p>
            </div>
          </Link>

          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Track Your Repair</h1>
            <p className="text-muted-foreground text-lg">
              Enter your tracking code to check repair status
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Tracking Code</CardTitle>
              <CardDescription>
                Enter the tracking code you received when booking your repair
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="flex gap-2"
              >
                <div className="flex-1">
                  <Label htmlFor="tracking" className="sr-only">
                    Tracking Code
                  </Label>
                  <Input
                    id="tracking"
                    placeholder="e.g., R-1234567890-ABCD"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? "Searching..." : "Track"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {repair && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">
                        {repair.device_make} {repair.device_model}
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Tracking: {repair.tracking_code}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`${statusInfo?.color} text-white`}
                    >
                      {statusInfo?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                        Issue Type
                      </h3>
                      <p className="text-lg">{repair.issue}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                        Booked On
                      </h3>
                      <p className="text-lg">
                        {new Date(repair.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {repair.description && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                        Description
                      </h3>
                      <p className="text-base">{repair.description}</p>
                    </div>
                  )}

                  {repair.estimated_cost && (
                    <div>
                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                        Estimated Cost
                      </h3>
                      <p className="text-2xl font-bold text-primary">
                        PKR {(repair.estimated_cost / 100).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Repair Status Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["created", "assigned", "estimate", "approved", "in_progress", "completed", "delivered"].map(
                      (step, idx) => {
                        const stepInfo = getStatusInfo(step);
                        const StepIcon = stepInfo.icon;
                        const isActive = repair.status === step;
                        const statusOrder = ["created", "assigned", "estimate", "approved", "in_progress", "completed", "delivered"];
                        const currentIndex = statusOrder.indexOf(repair.status);
                        const isPassed = idx <= currentIndex;

                        return (
                          <div
                            key={step}
                            className={`flex items-center gap-4 ${
                              isActive ? "opacity-100" : isPassed ? "opacity-70" : "opacity-30"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full ${
                                isPassed ? stepInfo.color : "bg-muted"
                              } flex items-center justify-center flex-shrink-0`}
                            >
                              <StepIcon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className={`font-semibold ${isActive ? "text-foreground" : ""}`}>
                                {stepInfo.label}
                              </p>
                              {isActive && (
                                <p className="text-sm text-muted-foreground">Current status</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {searched && !repair && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No repair found</h3>
                <p className="text-muted-foreground mb-6">
                  Please check your tracking code and try again
                </p>
                <Link to="/book-repair">
                  <Button>Book a New Repair</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Need assistance?</p>
            <div className="flex justify-center gap-4">
              <a href="tel:+923001234567" className="text-primary hover:underline">
                Call: +92 300 1234567
              </a>
              <span className="text-muted-foreground">|</span>
              <a
                href="https://wa.me/923001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackRepair;
