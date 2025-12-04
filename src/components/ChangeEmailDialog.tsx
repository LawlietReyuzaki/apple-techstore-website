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
import { toast } from "sonner";
import { Mail, Eye, EyeOff } from "lucide-react";

export function ChangeEmailDialog() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const resetForm = () => {
    setCurrentPassword("");
    setNewEmail("");
    setConfirmEmail("");
    setErrors([]);
    setShowPassword(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];

    // Check if all fields are filled
    if (!currentPassword) {
      validationErrors.push("Current password is required");
    }
    if (!newEmail) {
      validationErrors.push("New email is required");
    }
    if (!confirmEmail) {
      validationErrors.push("Please confirm your new email");
    }

    // Validate current password (demo validation)
    if (currentPassword && currentPassword !== "CURRENT_PASSWORD_PLACEHOLDER") {
      validationErrors.push("Current password is incorrect");
    }

    // Validate email format
    if (newEmail && !validateEmail(newEmail)) {
      validationErrors.push("Please enter a valid email address");
    }

    // Check if emails match
    if (newEmail && confirmEmail && newEmail !== confirmEmail) {
      validationErrors.push("Email addresses do not match");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Success
    toast.success("Email changed successfully (demo). Update on server to apply in production.");
    setOpen(false);
    resetForm();
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Admin Email</DialogTitle>
          <DialogDescription>
            Enter your current password and the new email address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <ul className="text-sm text-destructive space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="current-password-email">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password-email"
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setErrors([]);
                  }}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

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
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Change Email</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
