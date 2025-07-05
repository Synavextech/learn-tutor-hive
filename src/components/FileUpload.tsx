import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FileUploadProps {
  bucket: 'avatars' | 'documents' | 'certificates' | 'session-materials';
  purpose: 'profile_avatar' | 'identity_verification' | 'education_certificate' | 'session_material';
  sessionId?: string;
  onUploadComplete?: (url: string, filePath: string) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  multiple?: boolean;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export const FileUpload = ({
  bucket,
  purpose,
  sessionId,
  onUploadComplete,
  maxFileSize = 10,
  acceptedTypes = ['image/*', '.pdf', '.doc', '.docx'],
  multiple = false
}: FileUploadProps) => {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return type === fileExtension;
    });
    
    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }
    
    return null;
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    const uploadFile: UploadFile = {
      file,
      progress: 0,
      status: 'uploading'
    };

    setUploads(prev => [...prev, uploadFile]);
    const uploadIndex = uploads.length;

    try {
      // Create file path based on bucket and purpose
      let filePath = '';
      if (bucket === 'avatars') {
        filePath = `${user.id}/${file.name}`;
      } else if (bucket === 'session-materials' && sessionId) {
        filePath = `${sessionId}/${Date.now()}-${file.name}`;
      } else {
        filePath = `${user.id}/${Date.now()}-${file.name}`;
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: bucket === 'avatars' // Allow upsert for avatars
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Record file upload in database
      const { error: dbError } = await supabase
        .from('file_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          upload_purpose: purpose
        });

      if (dbError) console.error('Database error:', dbError);

      // Update upload status
      setUploads(prev => prev.map((upload, index) => 
        index === uploadIndex 
          ? { ...upload, status: 'completed', progress: 100, url: publicUrl }
          : upload
      ));

      onUploadComplete?.(publicUrl, filePath);

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully`,
      });

    } catch (error: any) {
      setUploads(prev => prev.map((upload, index) => 
        index === uploadIndex 
          ? { ...upload, status: 'error', error: error.message }
          : upload
      ));

      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    if (!multiple && fileArray.length > 1) {
      toast({
        title: "Multiple files not allowed",
        description: "Please select only one file",
        variant: "destructive",
      });
      return;
    }

    fileArray.forEach(uploadFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Upload</CardTitle>
        <CardDescription>
          Upload your files. Max size: {maxFileSize}MB. 
          Accepted types: {acceptedTypes.join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drag and drop files here, or click to select
            </p>
            <p className="text-sm text-muted-foreground">
              {multiple ? 'Multiple files allowed' : 'Single file only'}
            </p>
          </div>
          
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
          
          <Input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="space-y-4">
            <Label>Upload Progress</Label>
            {uploads.map((upload, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                <File className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{upload.file.name}</span>
                    <div className="flex items-center space-x-2">
                      {upload.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="h-2" />
                  )}
                  
                  {upload.status === 'error' && (
                    <p className="text-sm text-red-500">{upload.error}</p>
                  )}
                  
                  {upload.status === 'completed' && (
                    <p className="text-sm text-green-600">Upload completed</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};