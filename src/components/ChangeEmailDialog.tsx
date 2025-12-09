import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Mail, Loader2, Shield, Info, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ChangeEmailDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const resetForm = () => {
    setNewEmail("");
    setConfirmEmail("");
    setErrors([]);
    setEmailSent(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];

    if (!newEmail) {
      validationErrors.push("New email is required");
    }
    if (!confirmEmail) {
      validationErrors.push("Please confirm your new email");
    }

    if (newEmail && !validateEmail(newEmail)) {
      validationErrors.push("Please enter a valid email address");
    }

    if (newEmail && confirmEmail && newEmail !== confirmEmail) {
      validationErrors.push("Email addresses do not match");
    }

    if (newEmail && user?.email && newEmail.toLowerCase() === user.email.toLowerCase()) {
      validationErrors.push("New email must be different from current email");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Supabase automatically sends a verification email to the new address
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        // Handle specific error cases
        if (updateError.message.includes("already registered")) {
          throw new Error("This email is already registered to another account");
        }
        if (updateError.message.includes("rate limit")) {
          throw new Error("Too many requests. Please wait a few minutes and try again.");
        }
        throw updateError;
      }

      setEmailSent(true);
      toast.success("Verification email sent!");
    } catch (error: any) {
      setErrors([error.message || "Failed to update email. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Change Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Change Admin Email
          </DialogTitle>
          <DialogDescription>
            Update your admin login email address. A verification link will be sent to your new email.
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Verification Email Sent!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  We've sent a confirmation link to <strong className="text-foreground">{newEmail}</strong>
                </p>
              </div>
            </div>

            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Your email will NOT be changed until you click the verification link in your inbox.
                Check your spam folder if you don't see it.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>After verification, you'll need to log in with your new email.</p>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => setOpen(false)} className="w-full">
                Got it, I'll check my email
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Current Email Display */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Current Email</Label>
                <div className="px-3 py-2 bg-muted/50 rounded-md border text-sm font-mono">
                  {user?.email || "Not available"}
                </div>
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <ul className="text-sm space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setErrors([]);
                  }}
                  placeholder="Enter new email address"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-email">Confirm New Email</Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    setErrors([]);
                  }}
                  placeholder="Confirm new email address"
                  autoComplete="email"
                />
              </div>

              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                  A verification link will be sent to your new email. Your email will only be updated after you click the link.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Link"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
