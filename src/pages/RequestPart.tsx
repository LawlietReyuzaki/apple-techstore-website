import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Loader2, Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const partRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(11, 'Phone number must be 11 digits').max(11, 'Phone number must be 11 digits'),
  category: z.string().min(1, 'Please select a category'),
  part_name: z.string().min(2, 'Part name must be at least 2 characters').max(200),
  part_details: z.string().max(1000).optional(),
});

type PartRequestFormData = z.infer<typeof partRequestSchema>;

const categories = [
  'Mobile',
  'Laptop',
  'Computer',
  'Accessories',
  'Mobile Spare Parts',
  'Laptop Spare Parts',
  'Computer Spare Parts',
  'Other'
];

const RequestPart = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PartRequestFormData>({
    resolver: zodResolver(partRequestSchema),
  });

  const selectedCategory = watch('category');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Only JPG, PNG, and WEBP images are allowed');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `part-requests/${fileName}`;

    const { error } = await supabase.storage
      .from('part-request-images')
      .upload(filePath, file);

    if (error) {
      console.error('Image upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('part-request-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (data: PartRequestFormData) => {
    setIsSubmitting(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Insert the part request
      const { data: partRequest, error } = await supabase
        .from('part_requests')
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone,
          category: data.category,
          part_name: data.part_name,
          part_details: data.part_details || null,
          image_url: imageUrl,
          status: 'pending',
        });

      if (error) throw error;

      // Send confirmation to customer + notification to admin
      supabase.functions.invoke('send-part-request-email', {
        body: {
          type: 'new',
          requestId: partRequest?.id || null,
          customerName: data.name,
          customerEmail: data.email,
          customerPhone: data.phone,
          category: data.category,
          partName: data.part_name,
          partDetails: data.part_details,
          imageUrl: imageUrl,
          submittedDate: partRequest?.created_at || new Date().toISOString(),
        },
      }).catch((emailErr: any) => console.error('[email] part-request new failed:', emailErr?.message));

      toast.success('Part request submitted successfully!');
      navigate('/request-part/thank-you', {
        state: {
          requestId: partRequest?.id,
          partName: data.part_name,
          submittedDate: partRequest?.created_at,
        }
      });
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit part request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Request a Part</CardTitle>
            <CardDescription>
              Can't find the part you need? Submit a request and we'll try to source it for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-border pb-2">Your Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      {...register('name')}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      {...register('email')}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="03XX-XXXXXXX"
                    {...register('phone')}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Part Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-border pb-2">Part Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select onValueChange={(value) => setValue('category', value)}>
                    <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="part_name">Part Name *</Label>
                  <Input
                    id="part_name"
                    placeholder="e.g., iPhone 14 Pro Max LCD Screen"
                    {...register('part_name')}
                    className={errors.part_name ? 'border-destructive' : ''}
                  />
                  {errors.part_name && (
                    <p className="text-sm text-destructive">{errors.part_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="part_details">Part Description (Optional)</Label>
                  <Textarea
                    id="part_details"
                    placeholder="Provide any additional details about the part you need (specifications, compatibility, condition preference, etc.)"
                    rows={4}
                    {...register('part_details')}
                    className={errors.part_details ? 'border-destructive' : ''}
                  />
                  {errors.part_details && (
                    <p className="text-sm text-destructive">{errors.part_details.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Reference Image (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {imagePreview ? (
                        <div className="space-y-2">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-h-40 mx-auto rounded-lg object-contain"
                          />
                          <p className="text-sm text-muted-foreground">Click to change image</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload an image<br />
                            <span className="text-xs">JPG, PNG, WEBP (max 5MB)</span>
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Part Request'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestPart;
