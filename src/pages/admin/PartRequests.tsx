import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, Eye, CheckCircle, XCircle, Clock, Loader2, Package, Image as ImageIcon } from 'lucide-react';

interface PartRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  part_name: string;
  part_details: string | null;
  image_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const PartRequests = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PartRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['part-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('part_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PartRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, request }: { id: string; status: string; notes: string; request: PartRequest }) => {
      const { error } = await supabase
        .from('part_requests')
        .update({ status, admin_notes: notes })
        .eq('id', id);
      
      if (error) throw error;

      // Send status update email to customer
      console.log('Sending status update email to:', request.email);
      const { data, error: emailError } = await supabase.functions.invoke('send-part-request-email', {
        body: {
          type: 'status_update',
          requestId: id,
          customerName: request.name,
          customerEmail: request.email,
          partName: request.part_name,
          newStatus: status,
          adminNotes: notes,
        },
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        throw new Error('Status updated but email notification failed');
      }
      
      console.log('Email sent successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-requests'] });
      toast.success('Status updated and customer notified via email');
      setIsStatusUpdateOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  const filteredRequests = requests?.filter((req) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      req.name.toLowerCase().includes(search) ||
      req.email.toLowerCase().includes(search) ||
      req.part_name.toLowerCase().includes(search) ||
      req.phone.includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openStatusUpdate = (request: PartRequest, status: string) => {
    setSelectedRequest(request);
    setNewStatus(status);
    setAdminNotes(request.admin_notes || '');
    setIsStatusUpdateOpen(true);
  };

  const handleStatusUpdate = () => {
    if (!selectedRequest) return;
    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status: newStatus,
      notes: adminNotes,
      request: selectedRequest,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Part Requests
          </h1>
          <p className="text-muted-foreground">Manage customer part requests</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or part name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No part requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">
                        #{request.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.name}</p>
                          <p className="text-sm text-muted-foreground">{request.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{request.category}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.part_name}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-500 hover:text-green-600"
                                onClick={() => openStatusUpdate(request, 'approved')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => openStatusUpdate(request, 'rejected')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Part Request Details</DialogTitle>
            <DialogDescription>
              Request #{selectedRequest?.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer Name</Label>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedRequest.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{selectedRequest.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Submitted Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), 'PPpp')}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Part Name</Label>
                <p className="font-medium">{selectedRequest.part_name}</p>
              </div>

              {selectedRequest.part_details && (
                <div>
                  <Label className="text-muted-foreground">Part Description</Label>
                  <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedRequest.part_details}
                  </p>
                </div>
              )}

              {selectedRequest.image_url && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Reference Image
                  </Label>
                  <img
                    src={selectedRequest.image_url}
                    alt="Part reference"
                    className="mt-2 max-h-64 rounded-lg object-contain border border-border"
                  />
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openStatusUpdate(selectedRequest, 'approved');
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Request
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setIsDetailOpen(false);
                      openStatusUpdate(selectedRequest, 'rejected');
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === 'approved' ? 'Approve' : 'Reject'} Part Request
            </DialogTitle>
            <DialogDescription>
              {newStatus === 'approved'
                ? 'Confirm approval of this part request. The customer will be notified.'
                : 'Confirm rejection of this part request. The customer will be notified.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  newStatus === 'approved'
                    ? 'e.g., Part is available. Price: Rs 5000. Please confirm to proceed.'
                    : 'e.g., Sorry, this part is currently unavailable from our suppliers.'
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusUpdateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={updateStatusMutation.isPending}
              variant={newStatus === 'approved' ? 'default' : 'destructive'}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : newStatus === 'approved' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {newStatus === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartRequests;
