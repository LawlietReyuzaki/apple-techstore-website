import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { XCircle } from "lucide-react";

export default function AdminRepairs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isTechnician, loading: authLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin && !isTechnician) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [isAdmin, isTechnician, authLoading, navigate]);

  const { data: repairs, isLoading } = useQuery({
    queryKey: ["admin-repairs", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("repairs")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: repairsData, error: repairsError } = await query;
      if (repairsError) throw repairsError;

      // Fetch related profiles
      const userIds = repairsData?.map(r => r.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);

      // Fetch related technicians
      const techIds = repairsData?.map(r => r.assigned_to).filter(Boolean) || [];
      const { data: technicians } = await supabase
        .from("technicians")
        .select("id, name, email")
        .in("id", techIds);

      // Combine data
      return repairsData?.map(repair => ({
        ...repair,
        customer_profile: profiles?.find(p => p.id === repair.user_id),
        assigned_tech: technicians?.find(t => t.id === repair.assigned_to),
      }));
    },
    enabled: isAdmin || isTechnician,
  });

  const { data: technicians } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const updateRepairMutation = useMutation({
    mutationFn: async ({ id, updates, sendEmail, emailType, visitDate, visitTime, reason }: { 
      id: string; 
      updates: any;
      sendEmail?: boolean;
      emailType?: 'repair_accepted' | 'repair_declined';
      visitDate?: string;
      visitTime?: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from("repairs")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Send email if requested
      if (sendEmail && emailType) {
        await supabase.functions.invoke('send-order-email', {
          body: { 
            repairId: id, 
            type: emailType,
            visitDate,
            visitTime,
            reason
          }
        });
      }

      // Add note for status change
      if (updates.status) {
        await supabase.from("repair_notes").insert({
          repair_id: id,
          user_id: user?.id,
          note: `Status changed to ${updates.status}`,
          type: "status_change",
        });
      }

      // Add note for technician assignment
      if (updates.assigned_to) {
        await supabase.from("repair_notes").insert({
          repair_id: id,
          user_id: user?.id,
          note: `Technician assigned`,
          type: "assignment",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repairs"] });
      toast.success("Repair updated successfully");
    },
    onError: () => {
      toast.error("Failed to update repair");
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ repairId, note }: { repairId: string; note: string }) => {
      const { error } = await supabase.from("repair_notes").insert({
        repair_id: repairId,
        user_id: user?.id,
        note,
        type: "note",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote("");
      toast.success("Note added successfully");
      queryClient.invalidateQueries({ queryKey: ["repair-notes"] });
    },
    onError: () => {
      toast.error("Failed to add note");
    },
  });

  const { data: repairNotes } = useQuery({
    queryKey: ["repair-notes", selectedRepair?.id],
    queryFn: async () => {
      if (!selectedRepair) return [];

      const { data: notesData, error: notesError } = await supabase
        .from("repair_notes")
        .select("*")
        .eq("repair_id", selectedRepair.id)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // Fetch user profiles for note authors
      const userIds = notesData?.map(n => n.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Combine data
      return notesData?.map(note => ({
        ...note,
        note_author: profiles?.find(p => p.id === note.user_id),
      }));
    },
    enabled: !!selectedRepair,
  });

  const filteredRepairs = repairs?.filter(repair =>
    repair.device_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.customer_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      created: "secondary",
      in_progress: "default",
      delivered: "outline",
      declined: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const handleDeclineRepair = (id: string) => {
    setDeclineConfirmId(id);
  };

  const confirmDecline = () => {
    if (declineConfirmId) {
      updateRepairMutation.mutate({
        id: declineConfirmId,
        updates: { status: "declined" },
      });
      setDeclineConfirmId(null);
      setSelectedRepair(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin && !isTechnician) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Repairs</CardTitle>
          <div className="flex gap-4 mt-4">
            <Input
              placeholder="Search by customer or device..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="created">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delivered">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepairs?.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell>{repair.customer_profile?.full_name || "N/A"}</TableCell>
                  <TableCell>{`${repair.device_make} ${repair.device_model}`}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{repair.issue}</TableCell>
                  <TableCell>{getStatusBadge(repair.status)}</TableCell>
                  <TableCell>{repair.assigned_tech?.name || "Unassigned"}</TableCell>
                  <TableCell>{format(new Date(repair.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => setSelectedRepair(repair)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRepair} onOpenChange={() => setSelectedRepair(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Repair Details</DialogTitle>
          </DialogHeader>
          {selectedRepair && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Customer: {selectedRepair.customer_profile?.full_name}</h4>
                <p className="text-sm text-muted-foreground">Phone: {selectedRepair.customer_profile?.phone}</p>
                <p className="text-sm text-muted-foreground">Tracking: {selectedRepair.tracking_code}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Device Information</h4>
                <p>{selectedRepair.device_make} {selectedRepair.device_model}</p>
                <p className="text-sm">{selectedRepair.issue}</p>
                {selectedRepair.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedRepair.description}</p>
                )}
              </div>

              {/* Display images if available */}
              {selectedRepair.images && Array.isArray(selectedRepair.images) && selectedRepair.images.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Uploaded Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedRepair.images.map((img: string, idx: number) => (
                      <div key={idx} className="relative aspect-square rounded-md overflow-hidden border">
                        <img
                          src={img}
                          alt={`Repair image ${idx + 1}`}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Update Status</label>
                  <Select
                    value={selectedRepair.status}
                    onValueChange={(value) =>
                      updateRepairMutation.mutate({
                        id: selectedRepair.id,
                        updates: { status: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="delivered">Completed</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign Technician</label>
                  <Select
                    value={selectedRepair.assigned_to || ""}
                    onValueChange={(value) =>
                      updateRepairMutation.mutate({
                        id: selectedRepair.id,
                        updates: { assigned_to: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians?.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">Activity Timeline</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {repairNotes?.map((note) => (
                    <div key={note.id} className="border-l-2 pl-3 py-2">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.note_author?.full_name} • {format(new Date(note.created_at), "MMM dd, HH:mm")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Add Note</label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      addNoteMutation.mutate({
                        repairId: selectedRepair.id,
                        note: newNote,
                      })
                    }
                    disabled={!newNote.trim()}
                  >
                    Add Note
                  </Button>
                  {isAdmin && selectedRepair.status !== "declined" && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDeclineRepair(selectedRepair.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline Request
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!declineConfirmId} onOpenChange={(open) => !open && setDeclineConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Repair Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this repair request? This action will mark the request as declined.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDecline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
