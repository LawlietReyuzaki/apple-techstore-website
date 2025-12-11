import { useLocation, Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';

const RequestPartThankYou = () => {
  const location = useLocation();
  const { requestId, partName, submittedDate } = location.state || {};

  // Redirect if no state (direct access)
  if (!requestId) {
    return <Navigate to="/request-part" replace />;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 flex items-center justify-center">
      <Card className="max-w-lg w-full border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Thank You!</CardTitle>
          <CardDescription className="text-base">
            Your part request has been submitted successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Request ID:</span>
              <span className="font-mono font-semibold text-sm">
                #{requestId.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Part Name:</span>
              <span className="font-medium text-right max-w-[60%] truncate">{partName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Submitted Date:</span>
              <span className="font-medium">
                {format(new Date(submittedDate), 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                <Clock className="h-3 w-3" />
                Pending
              </span>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Confirmation Email Sent</p>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation email with your request details. 
                  Our team will review your request and get back to you soon.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-medium text-sm">What happens next?</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                Our team will review your part request
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                We'll check availability with our suppliers
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                You'll receive an email with the status update
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                If approved, we'll contact you for order confirmation
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/request-part">Submit Another Request</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestPartThankYou;
