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
import { Mail, Loader2, Shield, Info, CheckCircle2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function ChangeEmailDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [otp, setOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);

  const resetForm = () => {
    setNewEmail("");
    setConfirmEmail("");
    setErrors([]);
    setStep("email");
    setOtp("");
    setEnteredOtp("");
    setOtpExpiresAt(null);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
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
    setErrors([]);
    
    try {
      // Call edge function to send OTP
      const { data, error } = await supabase.functions.invoke("send-email-verification-otp", {
        body: {
          newEmail: newEmail,
          currentEmail: user?.email,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to send verification code");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Store OTP temporarily (in production, this would be stored securely on server)
      setOtp(data.otp);
      setOtpExpiresAt(new Date(data.expiresAt));
      setStep("otp");
      toast.success("Verification code sent to your new email!");
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setErrors([error.message || "Failed to send verification code. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (enteredOtp.length !== 6) {
      setErrors(["Please enter the complete 6-digit code"]);
      return;
    }

    // Check if OTP expired
    if (otpExpiresAt && new Date() > otpExpiresAt) {
      setErrors(["Verification code has expired. Please request a new one."]);
      return;
    }

    // Verify OTP
    if (enteredOtp !== otp) {
      setErrors(["Invalid verification code. Please try again."]);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      // OTP verified, now update the email using admin edge function
      const response = await supabase.functions.invoke("update-user-email", {
        body: {
          newEmail: newEmail,
          userId: user?.id,
        },
      });

      // Handle the response - check for errors in data first
      if (response.data?.error) {
        const errorMsg = response.data.error;
        if (errorMsg.includes("already in use") || errorMsg.includes("already registered")) {
          throw new Error("This email is already registered to another account. Please use a different email.");
        }
        throw new Error(errorMsg);
      }

      if (response.error) {
        // Try to parse error from the response
        console.error("Error updating email:", response.error);
        throw new Error("Failed to update email. The email may already be in use.");
      }

      setStep("success");
      toast.success("Email updated successfully!");
      
      // Sign out the user so they can log in with new email
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 2000);
    } catch (error: any) {
      console.error("Error updating email:", error);
      setErrors([error.message || "Failed to update email. Please try again."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setErrors([]);
    setEnteredOtp("");

    try {
      const { data, error } = await supabase.functions.invoke("send-email-verification-otp", {
        body: {
          newEmail: newEmail,
          currentEmail: user?.email,
        },
      });

      if (error || data?.error) {
        throw new Error(error?.message || data?.error || "Failed to resend code");
      }

      setOtp(data.otp);
      setOtpExpiresAt(new Date(data.expiresAt));
      toast.success("New verification code sent!");
    } catch (error: any) {
      setErrors([error.message || "Failed to resend code"]);
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
            {step === "email" && "Update your admin login email address. A verification code will be sent to your new email."}
            {step === "otp" && "Enter the 6-digit verification code sent to your new email."}
            {step === "success" && "Your email has been updated successfully."}
          </DialogDescription>
        </DialogHeader>

        {step === "success" ? (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Email Updated Successfully!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Your email has been changed to <strong className="text-foreground">{newEmail}</strong>
                </p>
              </div>
            </div>

            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> You may need to log in again with your new email address.
              </AlertDescription>
            </Alert>

            <DialogFooter className="pt-2">
              <Button onClick={() => setOpen(false)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : step === "otp" ? (
          <form onSubmit={handleVerifyOtp}>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    We sent a verification code to
                  </p>
                  <p className="font-medium">{newEmail}</p>
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

              <div className="flex justify-center py-4">
                <InputOTP
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(value) => {
                    setEnteredOtp(value);
                    setErrors([]);
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-primary hover:underline font-medium"
                >
                  Resend
                </button>
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("email")} disabled={isLoading}>
                Back
              </Button>
              <Button type="submit" disabled={isLoading || enteredOtp.length !== 6}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Update Email"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleSendOtp}>
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
                  A 6-digit verification code will be sent to your new email via Gmail.
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
                  "Send Verification Code"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
